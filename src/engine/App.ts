import { Engine } from "@babylonjs/core/Engines/engine";
import { DevFestScene } from "../scene/DevFestScene";
import { DURATION, Timeline } from "./Timeline";
import { DebugPanel } from "../debug/DebugPanel";
import { ShowController } from "./ShowController";
import { silentFeatures } from "./AudioAnalyzer";
import { POPCORN_END, POPCORN_START } from "../scene/CinemaPopcorn";
import { KEYNOTE_PERFORMANCE_URL, PERFORMANCE_ERROR } from "../strudel/performanceMode";
import { fillScoreSelector, getScore } from "../strudel/scores";
import { fillSoundtrackSelector, getSoundtrack, soundtrackEndGain } from "../audio/soundtracks";
import type { LoadingDiagnostics } from "../debug/LoadingDiagnostics";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing required UI element: ${id}`);
  return found as T;
}

export class App {
  readonly timeline = new Timeline();
  engine: Engine;
  world: DevFestScene;
  readonly debug: DebugPanel;
  readonly showController: ShowController;
  ready = false;
  inLobby = true;
  private idleTimer = 0;
  private lastDiagnostics = 0;
  private noticeTimer = 0;
  private arcadeErrorCount = 0;
  private synchronizedStart?: { at: number; senderId: string };
  private synchronizedStartTimer = 0;
  private synchronizedPlayback = false;
  private strudelLaunchId?: string;
  private soundtrackActive = false;
  private soundtrackAttached = false;
  private readonly visualAudio = silentFeatures();
  private visualRevealAccent = 0;
  private readonly lobby = element("lobby");
  private readonly pauseOverlay = element("pause-overlay");
  private readonly notice = element("notice");
  private readonly playButton = element<HTMLButtonElement>("play");
  private readonly previewButton = element<HTMLButtonElement>("preview");
  private readonly soundtrackPlayer = element<HTMLAudioElement>("soundtrack-player");

  constructor(private readonly canvas: HTMLCanvasElement, private readonly diagnostics?: LoadingDiagnostics) {
    this.diagnostics?.mark("renderer:create");
    this.engine = this.createEngine();
    this.diagnostics?.mark("renderer:created", `WebGL ${this.engine.webGLVersion}`);
    this.setResolution(false);
    this.diagnostics?.mark("renderer:resolution", `${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}`);
    this.showController = new ShowController(this.timeline, (message) => this.showNotice(message));
    this.showController.strudelEvents.onShowStart = (at, senderId) => {
      if (!this.ready) throw new Error("Wait for SYSTEM READY before launching the show.");
      if (this.timeline.playing || this.synchronizedStart) throw new Error("Pause the show before a synchronized restart.");
      this.synchronizedStart = { at, senderId };
      // Background tabs may not render any frames, so launch independently of RAF.
      this.synchronizedStartTimer = window.setTimeout(() => this.beginSynchronizedStart(performance.now()),
        Math.ceil(Math.max(0, at - performance.timeOrigin - performance.now())));
    };
    this.showController.strudelEvents.onShowStartCancelled = (senderId) => {
      if (this.synchronizedStart?.senderId === senderId) this.cancelSynchronizedStart();
    };
    this.diagnostics?.mark("scene:construct:start");
    this.world = new DevFestScene(this.engine, this.diagnostics);
    this.diagnostics?.mark("scene:construct:done");
    this.debug = new DebugPanel(this);
    document.body.classList.add("lobby-visible");
    this.bindControls();
    window.addEventListener("pagehide", () => {
      this.cancelSynchronizedStart();
      this.timeline.pause();
      this.soundtrackPlayer.pause();
      this.world.arcadeEnhancements?.media.pause();
      this.showController.strudelEvents.disconnect();
    });
    canvas.addEventListener("webglcontextlost", (event) => {
      this.diagnostics?.mark("renderer:context-lost");
      event.preventDefault();
      this.timeline.pause();
      this.cancelSynchronizedStart();
      this.ready = false;
      this.playButton.disabled = true;
      this.previewButton.disabled = true;
      this.world.scene.dispose();
      this.engine.dispose();
      this.showNotice("Graphics context lost. The show is paused while the renderer recovers.", true);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.diagnostics?.mark("renderer:context-restored");
      void this.restoreRenderer();
    });
    window.addEventListener("resize", () => {
      this.setResolution(element<HTMLSelectElement>("resolution").value === "native");
      this.engine.resize();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.beginSynchronizedStart(performance.now());
      if (document.hidden && this.timeline.playing && !this.synchronizedPlayback) {
        this.timeline.pause();
        this.soundtrackPlayer.pause();
        this.world.arcadeEnhancements?.media.pause();
        this.showNotice("Show paused because this tab is hidden. Press SPACE when ready.");
      }
    });
  }

  async initialize(): Promise<void> {
    this.diagnostics?.mark("prepare:start");
    element("loading-fill").style.width = "45%";
    element("load-status").textContent = "Loading local event artwork and compiling the cinematic pipeline...";
    await this.world.prepare((message) => { element("load-status").textContent = message; });
    const time = this.inLobby ? 0 : this.timeline.time;
    this.diagnostics?.mark("render:first:start");
    this.world.update(time, this.visualAudio, this.showController.section, this.timeline.speed, this.visualRevealAccent,
      this.showController.effectTime(time));
    this.world.scene.render();
    element("loading-fill").style.width = "85%";
    await this.world.scene.whenReadyAsync();
    this.diagnostics?.mark("render:first:done");
    this.engine.runRenderLoop(() => {
      if (!this.ready) return;
      const now = performance.now();
      this.beginSynchronizedStart(now);
      const time = this.inLobby ? 0 : this.timeline.tick(now);
      if (this.soundtrackActive && !this.inLobby) this.updateSoundtrackVolume(time);
      if (this.soundtrackActive && time >= 180 && !this.timeline.playing) this.soundtrackPlayer.pause();
      const audio = this.showController.sample(now);
      if (this.timeline.playing || this.inLobby || !this.showController.enabled) {
        Object.assign(this.visualAudio, audio);
        this.visualRevealAccent = this.showController.revealAccent;
      }
      const effectTime = this.showController.effectTime(time);
      this.world.update(time, this.visualAudio, this.showController.section, this.timeline.speed, this.visualRevealAccent,
        effectTime, !this.inLobby && this.timeline.playing);
      this.world.scene.physicsEnabled = !!this.world.scene.getPhysicsEngine()
        && !this.inLobby && this.timeline.playing
        && (effectTime < 44 || (effectTime >= POPCORN_START && effectTime < POPCORN_END));
      this.world.scene.render();
      this.pauseOverlay.hidden = this.inLobby || this.timeline.playing || time >= 180;
      if (now - this.lastDiagnostics > 100) {
        this.debug.update();
        const errors = this.world.arcadeEnhancements?.media.errors;
        if (errors && errors.length > this.arcadeErrorCount) {
          this.showNotice(`Arcade video unavailable / game poster retained: ${errors.slice(this.arcadeErrorCount).join(" ")}`, true);
          this.arcadeErrorCount = errors.length;
        }
        this.lastDiagnostics = now;
      }
    });
    this.ready = true;
    this.showController.strudelEvents.connect();
    this.playButton.disabled = false;
    this.previewButton.disabled = false;
    element("play-label").textContent = "PLAY SEQUENCE";
    element("loading-fill").style.width = "100%";
    element("loading-track").hidden = true;
    element("load-status").textContent = "SYSTEM READY / All assets local / Live audio optional";
    this.diagnostics?.mark("ready", `${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}`);
    if (this.world.simready?.errors.length) {
      this.showNotice(`Optional NVIDIA effects unavailable: ${this.world.simready.errors.join(" ")}`, true);
    }
  }

  start(time = 0): void {
    this.cancelSynchronizedStart();
    if (!this.ready) {
      this.showNotice("The renderer is loading or recovering. Wait for SYSTEM READY before starting.");
      return;
    }
    this.inLobby = false;
    this.lobby.hidden = true;
    this.notice.hidden = true;
    document.body.classList.remove("lobby-visible");
    this.timeline.seek(time);
    if (this.soundtrackActive) {
      this.soundtrackPlayer.currentTime = time;
      this.updateSoundtrackVolume(time, true);
      if (this.soundtrackPlayer.paused) void this.resumeSoundtrack();
    }
    this.showController.resetTransient();
    Object.assign(this.visualAudio, silentFeatures());
    this.visualRevealAccent = 0;
    this.timeline.play();
    element("render-canvas").focus();
    this.resetCursor();
  }

  async startFromGesture(time = 0): Promise<void> {
    this.showController.soundtrackId = null;
    const musicSource = element<HTMLSelectElement>("music-source").value;
    if (time === 0 && musicSource === "strudel") {
      this.soundtrackActive = false;
      this.showController.soundtrackId = null;
      await this.startWithStrudel();
      return;
    }
    this.soundtrackActive = musicSource === "mp3";
    const activation = this.showController.audio.activate().catch((error: unknown) => {
      console.warn("Audio activation failed", error);
      this.showNotice("Audio could not be activated. The visual show continues without audio analysis.");
    });
    if (this.soundtrackActive) {
      try {
        await this.playSoundtrack(time);
      } catch (error) {
        console.error("Soundtrack playback failed", error);
        this.soundtrackActive = false;
        this.showNotice(`Soundtrack unavailable: ${error instanceof Error ? error.message : String(error)}. The visual show will continue.`, true);
      }
    }
    this.start(time);
    if (element<HTMLInputElement>("fullscreen").checked && !document.fullscreenElement) await this.toggleFullscreen();
    await activation;
  }

  async startWithStrudel(): Promise<void> {
    this.cancelSynchronizedStart();
    if (!this.ready) {
      this.showNotice("The renderer is loading or recovering. Wait for SYSTEM READY before starting.");
      return;
    }
    if (this.timeline.playing) {
      this.showNotice("Pause or return to the lobby before starting the synchronized performance.");
      return;
    }
    this.soundtrackActive = false;
    this.showController.soundtrackId = null;
    this.soundtrackPlayer.pause();
    const frame = element<HTMLIFrameElement>("strudel-performance");
    const score = getScore(element<HTMLSelectElement>("strudel-score").value);
    this.strudelLaunchId = crypto.randomUUID();
    frame.src = `${KEYNOTE_PERFORMANCE_URL}&score=${score.id}&launch=${this.strudelLaunchId}`;
    this.showNotice(`Loading ${score.label}. Music and visuals will start here when audio is ready.`, true);
    if (element<HTMLInputElement>("fullscreen").checked && !document.fullscreenElement) await this.toggleFullscreen();
  }

  togglePlayback(): void {
    this.cancelSynchronizedStart();
    if (!this.ready) {
      this.showNotice("The renderer is not ready. Wait for initialization or graphics recovery before playing.");
      return;
    }
    if (this.inLobby) {
      void this.startFromGesture();
    } else if (this.timeline.playing) {
      this.timeline.pause();
      this.soundtrackPlayer.pause();
      this.world.arcadeEnhancements?.media.pause();
      document.body.classList.remove("idle");
    } else {
      this.notice.hidden = true;
      this.timeline.play();
      if (this.soundtrackActive) void this.resumeSoundtrack();
      this.resetCursor();
    }
  }

  seek(time: number): void {
    this.cancelSynchronizedStart();
    if (!this.ready) {
      this.showNotice("Wait for the renderer to be ready before seeking.");
      return;
    }
    if (this.inLobby) this.start(time);
    else this.timeline.seek(time);
    if (this.soundtrackActive) {
      this.soundtrackPlayer.currentTime = time;
      this.updateSoundtrackVolume(time, true);
    }
    this.showController.resetTransient();
    Object.assign(this.visualAudio, silentFeatures());
    this.visualRevealAccent = 0;
    this.world.update(this.timeline.time, this.visualAudio, this.showController.section, this.timeline.speed, 0,
      this.showController.effectTime(this.timeline.time), this.timeline.playing, true);
  }

  returnToLobby(): void {
    this.cancelSynchronizedStart();
    this.timeline.pause();
    this.soundtrackPlayer.pause();
    this.world.arcadeEnhancements?.media.pause();
    this.soundtrackPlayer.currentTime = 0;
    this.showController.soundtrack.setOutputVolume(1, true);
    this.soundtrackActive = false;
    this.showController.soundtrackId = null;
    this.inLobby = true;
    this.lobby.hidden = false;
    this.debug.setVisible(false);
    this.notice.hidden = true;
    document.body.classList.add("lobby-visible");
    document.body.classList.remove("idle");
  }

  setResolution(native: boolean): void {
    const pixelRatio = window.devicePixelRatio || 1;
    const cap = Math.max(window.innerWidth / 2560, window.innerHeight / 1440, 1 / pixelRatio);
    this.engine.setHardwareScalingLevel(this.diagnostics?.profile.renderLite
      ? Math.max(window.innerWidth / 1280, window.innerHeight / 720, 1)
      : native ? 1 / pixelRatio : cap);
  }

  async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn("Fullscreen request rejected", error);
      this.showNotice("Fullscreen was not permitted. The sequence still works in this window; press F to retry.");
    }
  }

  showNotice(message: string, persistent = false): void {
    window.clearTimeout(this.noticeTimer);
    this.notice.textContent = message;
    this.notice.hidden = false;
    if (!persistent) this.noticeTimer = window.setTimeout(() => { this.notice.hidden = true; }, 8000);
  }

  private async restoreRenderer(): Promise<void> {
    try {
      this.engine = this.createEngine();
      this.setResolution(element<HTMLSelectElement>("resolution").value === "native");
      this.world = new DevFestScene(this.engine, this.diagnostics);
      this.arcadeErrorCount = 0;
      const bloom = element<HTMLInputElement>("bloom").checked;
      this.world.setPostProcessing(bloom);
      await this.initialize();
      this.showNotice("Renderer restored. Press SPACE to resume from the paused frame.");
    } catch (error) {
      console.error("Graphics recovery failed", error);
      this.showNotice("Graphics recovery failed. Reload the page, then use the phase shortcuts to recover the show.", true);
    }
  }

  private createEngine(): Engine {
    return new Engine(this.canvas, !this.diagnostics?.profile.renderLite, {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: "high-performance",
      // Recreate GPU resources on restoration rather than retaining invalid texture handles.
      doNotHandleContextLost: true,
      audioEngine: false,
    });
  }

  private cancelSynchronizedStart(): void {
    window.clearTimeout(this.synchronizedStartTimer);
    this.synchronizedStartTimer = 0;
    this.synchronizedStart = undefined;
    this.synchronizedPlayback = false;
  }

  private beginSynchronizedStart(now: number): void {
    if (!this.synchronizedStart || performance.timeOrigin + now < this.synchronizedStart.at) return;
    const elapsed = (performance.timeOrigin + now - this.synchronizedStart.at) / 1000;
    this.timeline.speed = 1;
    this.start(elapsed);
    this.synchronizedPlayback = true;
    this.timeline.tick(now);
  }

  private resetCursor(): void {
    document.body.classList.remove("idle");
    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      if (this.timeline.playing) document.body.classList.add("idle");
    }, 2200);
  }

  private bindControls(): void {
    fillScoreSelector(element<HTMLSelectElement>("strudel-score"));
    fillSoundtrackSelector(element<HTMLSelectElement>("soundtrack"));
    const musicSource = element<HTMLSelectElement>("music-source");
    const updateMusicChoices = () => {
      element("strudel-score-choice").hidden = musicSource.value !== "strudel";
      element("soundtrack-choice").hidden = musicSource.value !== "mp3";
    };
    musicSource.addEventListener("change", updateMusicChoices);
    updateMusicChoices();
    this.playButton.addEventListener("click", () => void this.startFromGesture());
    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      const frame = element<HTMLIFrameElement>("strudel-performance");
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object" || !("type" in data) || data.type !== PERFORMANCE_ERROR) return;
      if (!("launch" in data) || data.launch !== this.strudelLaunchId || !("message" in data) || typeof data.message !== "string") return;
      this.showNotice(`Strudel could not start: ${data.message.slice(0, 350)}`, true);
    });
    this.previewButton.addEventListener("click", () => void this.startFromGesture(155));
    element("resume").addEventListener("click", () => this.togglePlayback());
    element("return").addEventListener("click", () => this.returnToLobby());
    element("audio-connect").addEventListener("click", () => void this.connectAudio());
    element("audio-disconnect").addEventListener("click", () => this.showController.audio.disconnect());
    element("debug-audio-connect").addEventListener("click", () => void this.connectAudio("audio-source-debug"));
    element("debug-audio-disconnect").addEventListener("click", () => this.showController.audio.disconnect());
    window.addEventListener("devfest:event", (event) => {
      if (event instanceof CustomEvent) this.showController.receive(event.detail);
    });
    window.addEventListener("pointermove", () => this.resetCursor());
    window.addEventListener("keydown", (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (/INPUT|SELECT|BUTTON|TEXTAREA/.test(target.tagName) || target.isContentEditable)) {
        if (event.code !== "Escape") return;
      }
      if (event.code === "Space") { event.preventDefault(); this.togglePlayback(); }
      else if (event.code === "KeyD") this.debug.setVisible(!this.debug.visible);
      else if (event.code === "KeyF") void this.toggleFullscreen();
      else if (event.code === "KeyR") this.start(0);
      else if (this.debug.visible && ["KeyK", "KeyS", "KeyH", "KeyI"].includes(event.code)) {
        const name = event.code === "KeyK" ? "kick" : event.code === "KeyS" ? "snare" : event.code === "KeyH" ? "hat" : "impact";
        this.showController.triggerEvent(name);
      }
      else if (event.code === "Escape" && !document.fullscreenElement) this.returnToLobby();
      else if (/^Digit[1-6]$/.test(event.code)) {
        const starts = [0, 30, 60, 90, 120, 155];
        this.seek(starts[Number(event.code.slice(-1)) - 1]);
      }
    });
  }

  private async connectAudio(sourceId = "audio-source"): Promise<void> {
    const button = element<HTMLButtonElement>("audio-connect");
    const debugButton = element<HTMLButtonElement>("debug-audio-connect");
    const input = element<HTMLSelectElement>(sourceId).value;
    if (input !== "microphone" && input !== "system") throw new Error("Unknown audio input selection.");
    button.disabled = true;
    debugButton.disabled = true;
    try {
      await this.showController.audio.connect(input);
      element("audio-setup-status").textContent = this.showController.audio.status;
    } catch (error) {
      console.warn("Audio input connection failed", error);
      const message = error instanceof Error ? error.message : String(error);
      this.showNotice(`Audio input unavailable: ${message}. The show still works standalone.`);
      element("audio-setup-status").textContent = "INPUT UNAVAILABLE / standalone visuals remain ready";
    } finally {
      button.disabled = false;
      debugButton.disabled = false;
    }
  }

  private updateSoundtrackVolume(time: number, immediate = false): void {
    const { duration, currentTime, playbackRate } = this.soundtrackPlayer;
    const trackRemaining = Number.isFinite(duration) && duration > 0
      ? Math.max(0, duration - currentTime) / playbackRate : Infinity;
    const showRemaining = Math.max(0, DURATION - time) / this.timeline.speed;
    this.showController.soundtrack.setOutputVolume(soundtrackEndGain(Math.min(trackRemaining, showRemaining)), immediate);
  }

  private async playSoundtrack(time: number): Promise<void> {
    const soundtrack = getSoundtrack(element<HTMLSelectElement>("soundtrack").value);
    if (!this.soundtrackAttached) {
      await this.showController.soundtrack.connectMediaElement(this.soundtrackPlayer);
      this.soundtrackAttached = true;
    }
    if (this.soundtrackPlayer.getAttribute("src") !== soundtrack.url) {
      this.soundtrackPlayer.src = soundtrack.url;
      this.soundtrackPlayer.dataset.title = soundtrack.label;
      this.soundtrackPlayer.load();
    }
    this.soundtrackPlayer.currentTime = time;
    this.updateSoundtrackVolume(time, true);
    await this.soundtrackPlayer.play();
    this.showController.soundtrackId = soundtrack.id;
  }

  private async resumeSoundtrack(): Promise<void> {
    try {
      this.soundtrackPlayer.currentTime = this.timeline.time;
      this.updateSoundtrackVolume(this.timeline.time, true);
      await this.soundtrackPlayer.play();
    } catch (error) {
      console.error("Soundtrack resume failed", error);
      this.soundtrackActive = false;
      this.showController.soundtrackId = null;
      this.showNotice(`Soundtrack could not resume: ${error instanceof Error ? error.message : String(error)}.`, true);
    }
  }
}
