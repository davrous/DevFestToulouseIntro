import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ArcadeMedia, ArcadeMediaManager } from "./ArcadeMediaManager";
import { ArcadeProceduralMedia } from "./ArcadeProceduralMedia";
import { ArcadeScreenController } from "./ArcadeScreenController";
import { PinballAttractController } from "./PinballAttractController";
import { arcadeSettings, isProceduralArcadeGame, validateArcadeSettings,
  type ArcadeGame, type CabinetKind, type ProceduralArcadeGame } from "./config";
import type { ArcadeScreenMedia } from "./ArcadeScreenMedia";

export interface ArcadeMachine { cabinet: number; kind: CabinetKind; root: TransformNode }

export class ArcadeSceneEnhancements {
  readonly settings = arcadeSettings();
  readonly media: ArcadeMediaManager;
  readonly screens: ArcadeScreenController[] = [];
  readonly pinballs: PinballAttractController[] = [];
  private readonly proceduralMedia = new Map<ProceduralArcadeGame, ArcadeProceduralMedia>();

  constructor(private readonly scene: Scene) {
    this.media = new ArcadeMediaManager(scene);
    scene.onDisposeObservable.addOnce(() => this.proceduralMedia.forEach((media) => media.dispose()));
  }

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
          machine.kind, this.getScreenMedia(assignment.game, assignment.offset)));
      }
    }
    await this.media.prepare();
    this.update(0, false, 1);
  }

  async assign(cabinet: number, game: ArcadeGame, offset: number): Promise<void> {
    const assignment = this.settings.assignments.find((entry) => entry.cabinet === cabinet);
    const screen = this.screens.find((screen) => screen.cabinet === cabinet);
    if (!assignment || !screen) throw new RangeError(`Cabinet ${cabinet} has no usable monitor.`);
    const playbackOffset = isProceduralArcadeGame(game) ? 0 : offset;
    validateArcadeSettings({ ...this.settings, assignments: this.settings.assignments.map((entry) =>
      entry.cabinet === cabinet ? { cabinet, game, offset: playbackOffset } : entry) });
    const media = this.getScreenMedia(game, playbackOffset);
    try {
      if (media instanceof ArcadeMedia) await media.prepare();
      screen.media = media;
      Object.assign(assignment, { game, offset: playbackOffset });
    } finally {
      this.media.releaseUnused(this.screens.map((screen) => screen.media)
        .filter((screenMedia): screenMedia is ArcadeMedia => screenMedia instanceof ArcadeMedia));
    }
  }

  private getScreenMedia(game: ArcadeGame, offset: number): ArcadeScreenMedia {
    if (!isProceduralArcadeGame(game)) return this.media.get(game, offset);
    let media = this.proceduralMedia.get(game);
    if (!media) {
      media = new ArcadeProceduralMedia(this.scene, game);
      this.proceduralMedia.set(game, media);
    }
    return media;
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
    if (active) {
      for (const assignment of this.settings.assignments) {
        if (isProceduralArcadeGame(assignment.game)) this.proceduralMedia.get(assignment.game)?.update(time);
      }
    }
    for (const screen of this.screens) screen.update(time, this.settings);
    for (const pinball of this.pinballs) pinball.update(time, this.settings);
  }
}
