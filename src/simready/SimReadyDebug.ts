import type { App } from "../engine/App";
import { SIMREADY_GAGS, isSimReadyGagId, type GagSettings, type SimReadyGagId } from "./config";

interface SettingField {
  label: string;
  get: (settings: GagSettings) => number;
  set: (settings: GagSettings, value: number) => void;
}

export class SimReadyDebug {
  private readonly select = document.createElement("select");
  private readonly fields: { input: HTMLInputElement; field: SettingField }[] = [];

  constructor(private readonly app: App, parent: HTMLElement) {
    const root = document.createElement("details");
    root.className = "simready-debug";
    const heading = document.createElement("summary");
    heading.textContent = "NVIDIA SIMREADY / CONFIGURATION";
    root.append(heading);
    const viewer = document.createElement("a");
    viewer.href = "./?asset-viewer=simready";
    viewer.target = "_blank";
    viewer.rel = "noopener";
    viewer.textContent = "OPEN LOCAL ASSET VIEWER";
    root.append(viewer);
    this.checkbox(root, "All NVIDIA gags", app.world.simready.config.enabled, async (enabled) => {
      app.world.simready.config.enabled = enabled;
      if (enabled && !app.world.simready.groups.size) {
        await app.world.simready.prepare((message) => app.showNotice(message, true));
      }
    });
    const flags = new Set<string>();
    for (const definition of Object.values(SIMREADY_GAGS)) {
      if (flags.has(definition.flag)) continue;
      flags.add(definition.flag);
      const flag = definition.flag;
      this.checkbox(root, flag === "enableToulouseEasterEggs" ? "Pastry / cassoulet" : definition.title,
        app.world.simready.config[flag], (enabled) => { app.world.simready.config[flag] = enabled; });
    }
    this.checkbox(root, "Asset bounding boxes", false, (enabled) => {
      app.world.simready.config.boundingBoxes = enabled;
    });
    this.select.setAttribute("aria-label", "SimReady gag placement");
    for (const [id, definition] of Object.entries(SIMREADY_GAGS)) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = definition.title;
      this.select.append(option);
    }
    this.select.value = "vending";
    root.append(this.select);
    this.select.addEventListener("change", () => this.refresh());
    const preview = document.createElement("button");
    preview.textContent = "PREVIEW / REPLAY GAG";
    preview.type = "button";
    preview.addEventListener("click", () => {
      app.seek(this.settings().start + .15);
      if (!app.timeline.playing) app.togglePlayback();
    });
    root.append(preview);
    const grid = document.createElement("div");
    grid.className = "simready-settings";
    const definitions: SettingField[] = [];
    for (const vector of ["position", "rotation"] as const) {
      for (let axis = 0; axis < 3; axis++) {
        definitions.push({
          label: `${vector} ${"XYZ"[axis]}`,
          get: (settings) => settings[vector][axis],
          set: (settings, value) => { settings[vector][axis] = value; },
        });
      }
    }
    for (const key of ["scale", "start", "end"] as const) {
      definitions.push({ label: key, get: (settings) => settings[key], set: (settings, value) => { settings[key] = value; } });
    }
    for (const key of ["interaction", "duration", "bounce", "flicker"] as const) {
      definitions.push({
        label: key, get: (settings) => settings.animation[key],
        set: (settings, value) => { settings.animation[key] = value; },
      });
    }
    for (const field of definitions) {
      const label = document.createElement("label");
      label.textContent = field.label;
      const input = document.createElement("input");
      input.type = "number";
      input.step = ".05";
      input.setAttribute("aria-label", `SimReady ${field.label}`);
      input.addEventListener("change", () => {
        try {
          const settings = structuredClone(this.settings());
          const value = input.value === "" ? NaN : Number(input.value);
          field.set(settings, value);
          app.world.simready.setSettings(this.id(), settings);
        } catch (error) {
          console.warn("Rejected SimReady configuration", error);
          app.showNotice(error instanceof Error ? error.message : String(error));
        }
        this.refresh();
      });
      this.fields.push({ input, field });
      label.append(input);
      grid.append(label);
    }
    root.append(grid);
    parent.append(root);
    this.refresh();
  }

  private checkbox(parent: HTMLElement, text: string, checked: boolean,
    change: (enabled: boolean) => void | Promise<void>): void {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => {
      Promise.resolve(change(input.checked)).catch((error: unknown) => {
        console.error("SimReady debug action failed", error);
        this.app.showNotice(error instanceof Error ? error.message : String(error), true);
      });
    });
    label.append(input, text);
    parent.append(label);
  }

  private id(): SimReadyGagId {
    if (!isSimReadyGagId(this.select.value)) throw new Error("Unknown SimReady debug selection.");
    return this.select.value;
  }

  private settings(): GagSettings { return this.app.world.simready.config.gags[this.id()]; }

  refresh(): void {
    const settings = this.settings();
    for (const { input, field } of this.fields) input.value = field.get(settings).toFixed(3);
  }
}
