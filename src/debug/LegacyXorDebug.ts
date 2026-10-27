import type { App } from "../engine/App";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { cameraPose } from "../camera/CameraPath";
import { LEGACY_XOR_RANGES, validateLegacyXorSettings, type LegacyXorSettings } from "../scene/LegacyXorSequence";
import { xorPanelPose } from "../scene/XorCpuGate";

export class LegacyXorDebug {
  private readonly diagnostics = document.createElement("pre");
  private readonly transforms = document.createElement("pre");
  private readonly path;
  private looping = false;
  private readonly loop = document.createElement("input");

  constructor(private readonly app: App, parent: HTMLElement) {
    const root = document.createElement("details");
    root.className = "simready-debug";
    const title = document.createElement("summary"); title.textContent = "LEGACY WALL / XOR CPU GATE";
    root.append(title);
    this.path = MeshBuilder.CreateLines("Debug / Legacy XOR camera path",
      { points: Array.from({ length: 181 }, (_, index) => cameraPose(31 + index / 10).position) }, app.world.scene);
    this.path.color = Color3.FromHexString("#ff925c"); this.path.isPickable = false; this.path.setEnabled(false);
    const flags = ["enableLegacyWallAssembly", "enableXorCpuGate", "boundingBoxes", "cameraPath", "freeAperture", "colliders"] as const;
    for (const key of flags) {
      const label = document.createElement("label"), input = document.createElement("input");
      input.type = "checkbox"; input.checked = app.world.legacyXor[key]; input.setAttribute("aria-label", `Legacy XOR ${key}`);
      input.addEventListener("change", () => this.apply((settings) => { settings[key] = input.checked; }));
      label.append(input, key); root.append(label);
    }
    const grid = document.createElement("div"); grid.className = "simready-settings";
    for (const key of Object.keys(LEGACY_XOR_RANGES) as Array<keyof typeof LEGACY_XOR_RANGES>) {
      const label = document.createElement("label"), input = document.createElement("input");
      label.textContent = key; input.type = "number"; input.step = key === "hingeAngle" ? "1" : ".01";
      input.min = String(LEGACY_XOR_RANGES[key][0]); input.max = String(LEGACY_XOR_RANGES[key][1]);
      input.value = String(app.world.legacyXor[key]); input.setAttribute("aria-label", `Legacy XOR ${key}`);
      input.addEventListener("change", () => {
        this.apply((settings) => { settings[key] = input.value === "" ? NaN : Number(input.value); });
        input.value = String(this.app.world.legacyXor[key]);
      });
      label.append(input); grid.append(label);
    }
    for (const key of ["signalColor", "copperColor"] as const) {
      const label = document.createElement("label"), input = document.createElement("input");
      label.textContent = key; input.type = "color"; input.value = app.world.legacyXor[key];
      input.setAttribute("aria-label", `Legacy XOR ${key}`);
      input.addEventListener("input", () => this.apply((settings) => { settings[key] = input.value; }));
      label.append(input); grid.append(label);
    }
    this.select(grid, "Labels", ["all", "minimal", "none"], (value) => this.apply((s) => { s.labelMode = value; }));
    this.select(grid, "Wall message", ["BUILD FAILED", "LEGACY CODE"], (value) => this.apply((s) => { s.wallMessage = value; }));
    root.append(grid);
    for (const [label, time] of [["WALL APPROACH", 35.4], ["WALL IMPACT", 38.2], ["SIGNAL", 40],
      ["GATE ACTIVATION", 41.9], ["GATE OPENING", 44], ["CAMERA EXIT", 46.03]] as const) {
      const button = document.createElement("button"); button.type = "button"; button.textContent = label;
      button.addEventListener("click", () => app.seek(time)); root.append(button);
    }
    const replay = document.createElement("button"); replay.type = "button"; replay.textContent = "REPLAY LEGACY → XOR";
    replay.addEventListener("click", () => { app.seek(34.4); if (!app.timeline.playing) app.togglePlayback(); });
    const loopLabel = document.createElement("label"); this.loop.type = "checkbox";
    this.loop.setAttribute("aria-label", "Loop Legacy XOR sequence");
    this.loop.addEventListener("change", () => { this.looping = this.loop.checked; });
    loopLabel.append(this.loop, "Loop 34.4–48.5 s (stops when diagnostics close)");
    root.append(replay, loopLabel, this.diagnostics);
    const poses = document.createElement("details"), summary = document.createElement("summary");
    summary.textContent = "CLOSED / OPEN PANEL TRANSFORMS"; poses.append(summary, this.transforms); root.append(poses);
    parent.append(root);
  }

  private apply(change: (settings: LegacyXorSettings) => void): void {
    try {
      const next = { ...this.app.world.legacyXor }; change(next); validateLegacyXorSettings(next);
      Object.assign(this.app.world.legacyXor, next);
      this.app.seek(this.app.timeline.time);
    } catch (error) {
      console.warn("Rejected Legacy/XOR configuration", error);
      this.app.showNotice(error instanceof Error ? error.message : String(error), true);
    }
  }

  private select<T extends string>(parent: HTMLElement, title: string, values: readonly T[], set: (value: T) => void): void {
    const label = document.createElement("label"), select = document.createElement("select");
    label.textContent = title; select.setAttribute("aria-label", `Legacy XOR ${title}`);
    for (const value of values) { const option = document.createElement("option"); option.value = value; option.textContent = value; select.append(option); }
    select.addEventListener("change", () => {
      const value = values.find((value) => value === select.value);
      if (value === undefined) throw new Error("Unknown Legacy/XOR selection."); set(value);
    });
    label.append(select); parent.append(label);
  }

  stopLoop(): void { this.looping = false; this.loop.checked = false; }

  update(): void {
    const { world, timeline } = this.app;
    this.path.setEnabled(world.legacyXor.cameraPath);
    if (this.looping && timeline.playing && timeline.time >= 48.5) this.app.seek(34.4);
    const gate = world.arcade.gate;
    this.diagnostics.textContent = `WALL: ${world.arcadePhysics.state}\n`
      + `HAVOK: ${world.arcadePhysics.bake?.tracks.length ?? 0} recorded tracks / ${world.arcadePhysics.bake?.frames ?? 0} fixed frames / 0 live wall bodies\n`
      + `SIGNAL: ${(gate.state.signal * 100).toFixed(0)}% → arrival ${gate.state.arrival.toFixed(2)} s\n`
      + `XOR: ${(gate.state.power * 100).toFixed(0)}% / OPEN: ${(gate.state.open * 100).toFixed(0)}%`;
    this.transforms.textContent = JSON.stringify([0, 1, 2, 3].map((index) => {
      const closed = xorPanelPose(index, 0, world.legacyXor), open = xorPanelPose(index, 1, world.legacyXor);
      return { index, closed: closed.position.asArray(), closedQuaternion: closed.rotation.asArray(),
        open: open.position.asArray(), openQuaternion: open.rotation.asArray() };
    }), null, 2);
  }
}
