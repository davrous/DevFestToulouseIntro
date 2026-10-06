import type { App } from "../engine/App";
import { activeSpeaker } from "../content/speakers";
import { activeCues } from "../content/cues";
import { TRIGGERS } from "../engine/protocol";
import { REHEARSAL_STOPS } from "../content/showBeats";
import { SceneInstrumentation } from "@babylonjs/core/Instrumentation/sceneInstrumentation";
import type { Scene } from "@babylonjs/core/scene";

function get<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing diagnostics element: ${id}`);
  return element as T;
}

export class DebugPanel {
  visible = false;
  private readonly root = get("debug");
  private readonly seek = get<HTMLInputElement>("seek");
  private readonly time = get("time-value");
  private readonly phase = get("phase-value");
  private readonly diagnostics = get("diagnostics");
  private readonly inputMeters = document.querySelectorAll<HTMLMeterElement>("[data-input-meter]");
  private readonly inputReadouts = document.querySelectorAll<HTMLOutputElement>("[data-input-db]");
  private readonly inputHints = document.querySelectorAll<HTMLElement>("[data-input-hint]");
  private readonly gainControls = document.querySelectorAll<HTMLInputElement>("[data-audio-gain]");
  private readonly gainLabels = document.querySelectorAll<HTMLOutputElement>("[data-gain-label]");
  private measuredScene: Scene;
  private instrumentation: SceneInstrumentation;

  constructor(private readonly app: App) {
    this.measuredScene = app.world.scene;
    this.instrumentation = new SceneInstrumentation(this.measuredScene);
    this.seek.addEventListener("input", () => app.seek(Number(this.seek.value)));
    get("close-debug").addEventListener("click", () => this.setVisible(false));
    const jumps = get("story-jumps");
    for (const stop of REHEARSAL_STOPS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = stop.label;
      button.addEventListener("click", () => app.seek(stop.time));
      jumps.append(button);
    }
    this.root.querySelectorAll<HTMLButtonElement>("[data-time]").forEach((button) => {
      button.addEventListener("click", () => app.seek(Number(button.dataset.time)));
    });
    get<HTMLSelectElement>("speed").addEventListener("change", (event) => {
      app.timeline.speed = Number((event.target as HTMLSelectElement).value);
    });
    get<HTMLInputElement>("bloom").addEventListener("change", (event) => {
      const enabled = (event.target as HTMLInputElement).checked;
      app.world.setPostProcessing(enabled);
    });
    get<HTMLSelectElement>("resolution").addEventListener("change", (event) => {
      app.setResolution((event.target as HTMLSelectElement).value === "native");
    });
    get<HTMLInputElement>("reactivity").addEventListener("change", (event) => {
      app.showController.enabled = (event.target as HTMLInputElement).checked;
      if (!app.showController.enabled) app.showController.resetTransient();
    });
    get<HTMLInputElement>("intensity").addEventListener("input", (event) => {
      app.showController.intensity = Number((event.target as HTMLInputElement).value);
    });
    this.gainControls.forEach((input) => {
      input.addEventListener("input", () => {
        app.showController.audio.gainDb = Number(input.value);
        this.gainControls.forEach((control) => { control.value = input.value; });
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-trigger]").forEach((button) => {
      button.addEventListener("click", () => {
        const trigger = TRIGGERS.find((trigger) => trigger === button.dataset.trigger);
        if (!trigger) throw new Error("Unknown rehearsal trigger.");
        app.showController.trigger(trigger);
      });
    });
    get("bridge-connect").addEventListener("click", () => {
      try { app.showController.connect(get<HTMLInputElement>("bridge-url").value); }
      catch (error) {
        console.warn("Invalid bridge connection", error);
        app.showNotice(error instanceof Error ? error.message : String(error));
      }
    });
    get("bridge-disconnect").addEventListener("click", () => app.showController.disconnect());
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.hidden = !visible;
    document.body.classList.toggle("debug-visible", visible);
  }

  update(): void {
    const { timeline, engine, world, showController } = this.app;
    const audio = showController.audio;
    get("audio-setup-status").textContent = audio.status;
    const decibels = Number.isFinite(audio.inputDb) ? `${audio.inputDb.toFixed(0)} dBFS` : "-- dBFS";
    this.inputMeters.forEach((meter) => { meter.value = audio.inputLevel; });
    this.inputReadouts.forEach((readout) => { readout.value = decibels; });
    this.gainLabels.forEach((label) => { label.value = `${audio.gainDb >= 0 ? "+" : ""}${audio.gainDb} dB`; });
    this.gainControls.forEach((control) => {
      if (document.activeElement !== control) control.value = String(audio.gainDb);
    });
    let hint = "Connect an input, then speak to test the signal.";
    if (audio.connected) {
      hint = audio.inputDb > -55 ? `Signal detected / ${audio.deviceName}` : `No or very quiet signal / check ${audio.deviceName} or raise input gain.`;
      if (audio.inputDb > -3) hint = "Input is too hot / lower input gain.";
      if (!showController.enabled) hint += " Visual reactivity is disabled.";
      else if (!this.app.inLobby && !timeline.playing) hint += " Playback paused: meters are live; visuals are held.";
      else if (!this.app.inLobby && timeline.time >= 155) hint += " The finale deliberately fades out reactivity.";
    }
    this.inputHints.forEach((element) => { element.textContent = hint; });
    if (world.scene !== this.measuredScene) {
      this.instrumentation.dispose();
      this.measuredScene = world.scene;
      this.instrumentation = new SceneInstrumentation(this.measuredScene);
    }
    if (!this.visible) return;
    const minutes = Math.floor(timeline.time / 60).toString().padStart(2, "0");
    const seconds = (timeline.time % 60).toFixed(1).padStart(4, "0");
    this.time.textContent = `${minutes}:${seconds}`;
    this.phase.textContent = timeline.phase;
    if (document.activeElement !== this.seek) this.seek.value = String(timeline.time);
    const p = world.camera.position;
    const r = world.camera.rotation;
    const event = timeline.time >= 173 ? "FINAL HOLD"
      : [...REHEARSAL_STOPS].reverse().find((stop) => timeline.time >= stop.time)?.label ?? "GAME";
    const rows = {
      RENDER: `${engine.getFps().toFixed(0)} FPS / ${engine.getRenderWidth()}×${engine.getRenderHeight()}`,
      CAMERA: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      ROTATION: `${r.x.toFixed(2)}, ${r.y.toFixed(2)}, ${r.z.toFixed(2)}`,
      GEOMETRY: `${world.cellCount} modules / thin instanced`,
      RENDER_LOAD: `${this.instrumentation.drawCallsCounter.current} draw calls / ${world.scene.getActiveMeshes().length} active meshes / ${Math.round(world.scene.getActiveIndices() / 3)} triangles`,
      PHYSICS: `${world.scene.meshes.filter((mesh) => mesh.physicsBody).length} visible Havok props`,
      EVENT: event,
      SPEAKER: activeSpeaker(timeline.time)?.name ?? "--",
      CUES: activeCues(timeline.time).join(" / ") || "--",
      AUDIO: showController.audio.status,
      INPUT: `${decibels} / ${audio.deviceName}`,
      ENERGY: `${showController.features.energy.toFixed(2)} / bass ${showController.features.bass.toFixed(2)}`,
      BANDS: `mid ${showController.features.mid.toFixed(2)} / high ${showController.features.treble.toFixed(2)}`,
      VIOLA: `${showController.features.violaEnergy.toFixed(2)} / sustained mid-band proxy`,
      BEAT: `${showController.features.kick.toFixed(2)} kick / ${showController.features.snare.toFixed(2)} snare`,
      STRUDEL: showController.bridgeStatus,
      SIGNALS: showController.recentEvents.join(" / ") || "--",
      STATUS: timeline.playing ? "PLAYING" : "PAUSED",
    };
    this.diagnostics.replaceChildren(...Object.entries(rows).flatMap(([key, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = key;
      const dd = document.createElement("dd");
      dd.textContent = value;
      return [dt, dd];
    }));
  }
}
