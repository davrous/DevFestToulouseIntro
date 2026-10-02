import type { App } from "../engine/App";
import { activeSpeaker } from "../content/speakers";
import { activeCues } from "../content/cues";
import { TRIGGERS } from "../engine/protocol";

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

  constructor(private readonly app: App) {
    this.seek.addEventListener("input", () => app.seek(Number(this.seek.value)));
    get("close-debug").addEventListener("click", () => this.setVisible(false));
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
    get("audio-setup-status").textContent = this.app.showController.audio.status;
    if (!this.visible) return;
    const { timeline, engine, world, showController } = this.app;
    const minutes = Math.floor(timeline.time / 60).toString().padStart(2, "0");
    const seconds = (timeline.time % 60).toFixed(1).padStart(4, "0");
    this.time.textContent = `${minutes}:${seconds}`;
    this.phase.textContent = timeline.phase;
    if (document.activeElement !== this.seek) this.seek.value = String(timeline.time);
    const p = world.camera.position;
    const r = world.camera.rotation;
    const event = timeline.time < 150 ? "INTERIOR TRAVERSAL" : timeline.time < 163 ? "TURN / ESCAPE PREP" : timeline.time < 177 ? "DOLLY / TITLE REVEAL" : "FINAL HOLD";
    const rows = {
      RENDER: `${engine.getFps().toFixed(0)} FPS / ${engine.getRenderWidth()}×${engine.getRenderHeight()}`,
      CAMERA: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      ROTATION: `${r.x.toFixed(2)}, ${r.y.toFixed(2)}, ${r.z.toFixed(2)}`,
      GEOMETRY: `${world.cellCount} modules / thin instanced`,
      EVENT: event,
      SPEAKER: activeSpeaker(timeline.time)?.name ?? "--",
      CUES: activeCues(timeline.time).join(" / ") || "--",
      AUDIO: showController.audio.status,
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
