import type { App } from "../engine/App";
import { ARCADE_GAMES, ARCADE_RANGES, validateArcadeSettings, type ArcadeSettings } from "../scene/arcade/config";

export class ArcadeDebug {
  private readonly diagnostics = document.createElement("pre");
  private selectedPinball = 2;
  private readonly bindings: { game: HTMLSelectElement; offset: HTMLInputElement; cabinet: number }[] = [];
  private readonly flags: { input: HTMLInputElement; key: "trajectories" | "pivots" | "screenBounds" }[] = [];

  constructor(private readonly app: App, parent: HTMLElement) {
    const root = document.createElement("details");
    root.className = "simready-debug";
    const summary = document.createElement("summary"); summary.textContent = "ARCADE / GAMES + PINBALL";
    root.append(summary);
    for (const key of ["enableArcadeVideoScreens", "enablePinballAttractMode", "enablePinballMultiball",
      "enableArcadeCrtEffect", "trajectories", "pivots", "screenBounds"] as const) {
      const label = document.createElement("label"), input = document.createElement("input");
      input.type = "checkbox"; input.checked = app.world.arcadeEnhancements.settings[key];
      input.setAttribute("aria-label", key);
      input.addEventListener("change", () => this.apply((settings) => { settings[key] = input.checked; }));
      if (key === "trajectories" || key === "pivots" || key === "screenBounds") this.flags.push({ input, key });
      label.append(input, key); root.append(label);
    }
    const grid = document.createElement("div"); grid.className = "simready-settings";
    for (const key of Object.keys(ARCADE_RANGES) as Array<keyof typeof ARCADE_RANGES>) {
      const label = document.createElement("label"), input = document.createElement("input");
      label.textContent = key; input.type = "number"; input.step = key === "scoreStep" ? "100" : ".01";
      input.min = String(ARCADE_RANGES[key][0]); input.max = String(ARCADE_RANGES[key][1]);
      input.value = String(app.world.arcadeEnhancements.settings[key]); input.setAttribute("aria-label", key);
      input.addEventListener("change", () => {
        this.apply((settings) => { settings[key] = input.value === "" ? NaN : Number(input.value); });
        input.value = String(this.app.world.arcadeEnhancements.settings[key]);
      });
      label.append(input); grid.append(label);
    }
    const policy = document.createElement("select"), policyLabel = document.createElement("label");
    policyLabel.textContent = "Video activation policy"; policy.setAttribute("aria-label", "Arcade video policy");
    for (const value of ["arcade-section", "always"] as const) {
      const option = document.createElement("option"); option.value = option.textContent = value; policy.append(option);
    }
    policy.addEventListener("change", () => this.apply((settings) => {
      settings.videoPolicy = policy.value === "always" ? "always" : "arcade-section";
    }));
    policyLabel.append(policy); grid.append(policyLabel);
    for (let index = 0; index < 2; index++) {
      const label = document.createElement("label"), input = document.createElement("input");
      label.textContent = `Pinball ${index ? 5 : 2} phase offset`;
      input.type = "number"; input.step = ".1"; input.value = String(app.world.arcadeEnhancements.settings.pinballOffsets[index]);
      input.setAttribute("aria-label", label.textContent);
      input.addEventListener("change", () => this.apply((settings) => { settings.pinballOffsets[index] = Number(input.value); }));
      label.append(input); grid.append(label);
    }
    root.append(grid);
    for (const assignment of app.world.arcadeEnhancements.settings.assignments) {
      const label = document.createElement("label"), game = document.createElement("select"), offset = document.createElement("input");
      label.textContent = `Cabinet ${assignment.cabinet}`; game.setAttribute("aria-label", `Cabinet ${assignment.cabinet} game`);
      for (const id of ARCADE_GAMES) {
        const option = document.createElement("option"); option.value = option.textContent = id; game.append(option);
      }
      game.value = assignment.game; offset.type = "number"; offset.step = ".1"; offset.value = String(assignment.offset);
      offset.setAttribute("aria-label", `Cabinet ${assignment.cabinet} video offset`);
      const assign = async () => {
        const selected = ARCADE_GAMES.find((value) => value === game.value);
        if (!selected) throw new Error("Unknown arcade game.");
        if (app.timeline.playing) app.togglePlayback();
        game.disabled = offset.disabled = true;
        try {
          await app.world.arcadeEnhancements.assign(assignment.cabinet, selected, Number(offset.value));
          app.seek(app.timeline.time);
        } catch (error) {
          console.error("Arcade reassignment failed", error); app.showNotice(String(error), true);
        } finally {
          game.disabled = offset.disabled = false;
          const current = app.world.arcadeEnhancements.settings.assignments.find((entry) => entry.cabinet === assignment.cabinet)!;
          game.value = current.game; offset.value = String(current.offset);
        }
      };
      game.addEventListener("change", () => { void assign(); });
      offset.addEventListener("change", () => { void assign(); });
      label.append(game, offset); root.append(label);
      this.bindings.push({ game, offset, cabinet: assignment.cabinet });
    }
    this.button(root, "JUMP TO ARCADE", () => app.seek(0));
    this.button(root, "REPLAY ARCADE", () => { app.seek(0); if (!app.timeline.playing) app.togglePlayback(); });
    for (const [cabinet, time] of [[0, 1], [1, 1], [3, 11], [4, 19]]) {
      this.button(root, `PREVIEW CABINET ${cabinet}`, () => { app.seek(time); if (app.timeline.playing) app.togglePlayback(); });
    }
    const select = document.createElement("select"); select.setAttribute("aria-label", "Select pinball");
    for (const cabinet of [2, 5]) {
      const option = document.createElement("option"); option.value = String(cabinet);
      option.textContent = `Pinball ${cabinet}${cabinet === 2 ? " / FEATURED" : " / BACKGROUND"}`; select.append(option);
    }
    select.addEventListener("change", () => { this.selectedPinball = Number(select.value); app.seek(this.selectedPinball === 2 ? 10 : 18); });
    root.append(select);
    this.button(root, "REPLAY PINBALL SEQUENCE", () => {
      app.seek(this.selectedPinball === 2 ? 3 : 14);
      if (!app.timeline.playing) app.togglePlayback();
    });
    this.button(root, "PREVIEW MULTIBALL", () => { app.seek(11.3); if (app.timeline.playing) app.togglePlayback(); });
    root.append(this.diagnostics); parent.append(root);
  }

  private button(parent: HTMLElement, title: string, action: () => void): void {
    const button = document.createElement("button"); button.type = "button"; button.textContent = title;
    button.addEventListener("click", action); parent.append(button);
  }

  private apply(change: (settings: ArcadeSettings) => void): void {
    const current = this.app.world.arcadeEnhancements.settings;
    const next = { ...current, assignments: current.assignments.map((entry) => ({ ...entry })), pinballOffsets: [...current.pinballOffsets] };
    try {
      change(next); validateArcadeSettings(next); Object.assign(current, next);
      this.app.seek(this.app.timeline.time);
    } catch (error) {
      console.warn("Rejected arcade settings", error); this.app.showNotice(String(error), true);
    }
  }

  hide(): void {
    const settings = this.app.world.arcadeEnhancements.settings;
    settings.trajectories = settings.pivots = settings.screenBounds = false;
    this.flags.forEach(({ input }) => { input.checked = false; });
  }

  update(): void {
    const enhancements = this.app.world.arcadeEnhancements;
    for (const binding of this.bindings) {
      const assignment = enhancements.settings.assignments.find((entry) => entry.cabinet === binding.cabinet);
      if (assignment && document.activeElement !== binding.game && !binding.game.disabled) binding.game.value = assignment.game;
    }
    const pinball = enhancements.pinballs.find((pinball) => pinball.cabinet === this.selectedPinball);
    this.diagnostics.textContent = `MASTER ${this.app.timeline.time.toFixed(3)} s / ${this.app.timeline.playing ? "PLAY" : "PAUSE"}\n`
      + enhancements.screens.map((screen) => {
        const media = screen.media, video = media.video;
        return `CAB ${screen.cabinet}: ${media.game} ${video.currentTime.toFixed(2)}/${video.duration.toFixed(2)} s`
          + ` / ready ${video.readyState} / ${video.paused ? "held" : "playing"} / seeks ${media.clock.seeks}${media.error ? ` / ERROR ${media.error}` : ""}`;
      }).join("\n")
      + (pinball ? `\nPINBALL ${pinball.cabinet}: ${pinball.state.label} / ${pinball.state.score} / phase ${pinball.state.phase.toFixed(2)}` : "");
  }
}
