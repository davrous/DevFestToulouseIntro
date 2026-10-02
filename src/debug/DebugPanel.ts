import type { App } from "../engine/App";

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
      app.world.pipeline.bloomEnabled = enabled;
      app.world.glow.isEnabled = enabled;
    });
    get<HTMLSelectElement>("resolution").addEventListener("change", (event) => {
      app.setResolution((event.target as HTMLSelectElement).value === "native");
    });
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.hidden = !visible;
    document.body.classList.toggle("debug-visible", visible);
  }

  update(): void {
    if (!this.visible) return;
    const { timeline, engine, world } = this.app;
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
      AUDIO: "OFF / deterministic prototype",
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
