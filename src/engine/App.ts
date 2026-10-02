import { Engine } from "@babylonjs/core/Engines/engine";
import { DevFestScene } from "../scene/DevFestScene";
import { Timeline } from "./Timeline";
import { DebugPanel } from "../debug/DebugPanel";
import { ShowController } from "./ShowController";

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
  private readonly lobby = element("lobby");
  private readonly pauseOverlay = element("pause-overlay");
  private readonly notice = element("notice");
  private readonly playButton = element<HTMLButtonElement>("play");
  private readonly previewButton = element<HTMLButtonElement>("preview");

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = this.createEngine();
    this.setResolution(false);
    this.showController = new ShowController(this.timeline, (message) => this.showNotice(message));
    this.world = new DevFestScene(this.engine);
    this.debug = new DebugPanel(this);
    document.body.classList.add("lobby-visible");
    this.bindControls();
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.timeline.pause();
      this.ready = false;
      this.playButton.disabled = true;
      this.previewButton.disabled = true;
      this.world.scene.dispose();
      this.engine.dispose();
      this.showNotice("Graphics context lost. The show is paused while the renderer recovers.", true);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      void this.restoreRenderer();
    });
    window.addEventListener("resize", () => {
      this.setResolution(element<HTMLSelectElement>("resolution").value === "native");
      this.engine.resize();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.timeline.playing) {
        this.timeline.pause();
        this.showNotice("Show paused because this tab is hidden. Press SPACE when ready.");
      }
    });
  }

  async initialize(): Promise<void> {
    element("loading-fill").style.width = "45%";
    element("load-status").textContent = "Compiling geometry, materials, and cinematic pipeline...";
    await this.world.prepare();
    this.world.update(this.inLobby ? 0 : this.timeline.time);
    this.world.scene.render();
    element("loading-fill").style.width = "85%";
    await this.world.scene.whenReadyAsync();
    this.engine.runRenderLoop(() => {
      if (!this.ready) return;
      const now = performance.now();
      const time = this.inLobby ? 0 : this.timeline.tick(now);
      const audio = this.timeline.playing || this.inLobby ? this.showController.sample(now) : this.showController.features;
      this.world.update(time, audio, this.showController.section);
      this.world.scene.render();
      this.pauseOverlay.hidden = this.inLobby || this.timeline.playing || time >= 180;
      if (now - this.lastDiagnostics > 100) {
        this.debug.update();
        this.lastDiagnostics = now;
      }
    });
    this.ready = true;
    this.playButton.disabled = false;
    this.previewButton.disabled = false;
    element("play-label").textContent = "PLAY SEQUENCE";
    element("loading-fill").style.width = "100%";
    element("loading-track").hidden = true;
    element("load-status").textContent = "SYSTEM READY / All assets local / Live audio optional";
  }

  start(time = 0): void {
    if (!this.ready) {
      this.showNotice("The renderer is loading or recovering. Wait for SYSTEM READY before starting.");
      return;
    }
    this.inLobby = false;
    this.lobby.hidden = true;
    this.notice.hidden = true;
    document.body.classList.remove("lobby-visible");
    this.timeline.seek(time);
    this.showController.resetTransient();
    this.timeline.play();
    element("render-canvas").focus();
    this.resetCursor();
  }

  async startFromGesture(time = 0): Promise<void> {
    const activation = this.showController.audio.activate().catch((error: unknown) => {
      console.warn("Audio activation failed", error);
      this.showNotice("Audio could not be activated. The visual show continues without audio analysis.");
    });
    this.start(time);
    if (element<HTMLInputElement>("fullscreen").checked && !document.fullscreenElement) await this.toggleFullscreen();
    await activation;
  }

  togglePlayback(): void {
    if (!this.ready) {
      this.showNotice("The renderer is not ready. Wait for initialization or graphics recovery before playing.");
      return;
    }
    if (this.inLobby) {
      void this.startFromGesture();
    } else if (this.timeline.playing) {
      this.timeline.pause();
      document.body.classList.remove("idle");
    } else {
      this.notice.hidden = true;
      this.timeline.play();
      this.resetCursor();
    }
  }

  seek(time: number): void {
    if (!this.ready) {
      this.showNotice("Wait for the renderer to be ready before seeking.");
      return;
    }
    if (this.inLobby) this.start(time);
    else this.timeline.seek(time);
    this.showController.resetTransient();
    this.world.update(this.timeline.time, this.showController.features, this.showController.section);
  }

  returnToLobby(): void {
    this.timeline.pause();
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
    this.engine.setHardwareScalingLevel(native ? 1 / pixelRatio : cap);
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
      this.world = new DevFestScene(this.engine);
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
    return new Engine(this.canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: "high-performance",
      // Recreate GPU resources on restoration rather than retaining invalid texture handles.
      doNotHandleContextLost: true,
      audioEngine: false,
    });
  }

  private resetCursor(): void {
    document.body.classList.remove("idle");
    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      if (this.timeline.playing) document.body.classList.add("idle");
    }, 2200);
  }

  private bindControls(): void {
    this.playButton.addEventListener("click", () => void this.startFromGesture());
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
      if (target instanceof HTMLElement && /INPUT|SELECT|BUTTON/.test(target.tagName)) {
        if (event.code !== "Escape") return;
      }
      if (event.code === "Space") { event.preventDefault(); this.togglePlayback(); }
      else if (event.code === "KeyD") this.debug.setVisible(!this.debug.visible);
      else if (event.code === "KeyF") void this.toggleFullscreen();
      else if (event.code === "KeyR") this.start(0);
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
}
