import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ArcadeMediaManager } from "./ArcadeMediaManager";
import { ArcadeScreenController } from "./ArcadeScreenController";
import { PinballAttractController } from "./PinballAttractController";
import { arcadeSettings, validateArcadeSettings, type ArcadeGame, type CabinetKind } from "./config";

export interface ArcadeMachine { cabinet: number; kind: CabinetKind; root: TransformNode }

export class ArcadeSceneEnhancements {
  readonly settings = arcadeSettings();
  readonly media: ArcadeMediaManager;
  readonly screens: ArcadeScreenController[] = [];
  readonly pinballs: PinballAttractController[] = [];

  constructor(private readonly scene: Scene) { this.media = new ArcadeMediaManager(scene); }

  async prepare(machines: readonly ArcadeMachine[]): Promise<void> {
    for (const machine of machines) {
      const body = machine.root.getChildMeshes().find((mesh) =>
        mesh.name.endsWith(machine.kind === "arcade" ? ".arcade-machine" : machine.kind === "dance" ? ".dance-machine" : ".pinball"));
      if (!body) throw new Error(`Missing ${machine.kind} geometry in cabinet ${machine.cabinet}.`);
      if (machine.kind === "pinball") {
        this.pinballs.push(new PinballAttractController(this.scene, machine.cabinet, body, this.pinballs.length, machine.cabinet === 2));
      } else {
        const assignment = this.settings.assignments.find((entry) => entry.cabinet === machine.cabinet);
        if (assignment) this.screens.push(new ArcadeScreenController(this.scene, machine.cabinet, body,
          machine.kind, this.media.get(assignment.game, assignment.offset)));
      }
    }
    await this.media.prepare();
    this.update(0, false, 1);
  }

  async assign(cabinet: number, game: ArcadeGame, offset: number): Promise<void> {
    const assignment = this.settings.assignments.find((entry) => entry.cabinet === cabinet);
    const screen = this.screens.find((screen) => screen.cabinet === cabinet);
    if (!assignment || !screen) throw new RangeError(`Cabinet ${cabinet} has no usable monitor.`);
    validateArcadeSettings({ ...this.settings, assignments: this.settings.assignments.map((entry) =>
      entry.cabinet === cabinet ? { cabinet, game, offset } : entry) });
    const media = this.media.get(game, offset);
    try {
      await media.prepare();
      screen.media = media;
      Object.assign(assignment, { game, offset });
    } finally {
      this.media.releaseUnused(this.screens.map((screen) => screen.media));
    }
  }

  async whenSettled(): Promise<void> {
    await Promise.all(this.media.resources.map((media) => media.whenSettled()));
  }

  update(time: number, playing: boolean, speed: number, force = false): void {
    const active = this.settings.enableArcadeVideoScreens
      && (this.settings.videoPolicy === "always" || time < this.settings.videoEnd);
    for (const media of this.media.resources) {
      if (active) media.update(time, playing, speed, force);
      else media.pause();
    }
    for (const screen of this.screens) screen.update(time, this.settings);
    for (const pinball of this.pinballs) pinball.update(time, this.settings);
  }
}
