import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { CELL, cellPosition } from "../content/title";
import { CINEMA } from "../content/showBeats";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { XorCpuGate } from "./XorCpuGate";
import { legacyXorSettings, legacyXorState, type LegacyXorSettings } from "./LegacyXorSequence";

export function arcadeDoorOpen(time: number): number {
  return legacyXorState(time, legacyXorSettings()).open;
}

export const ARCADE_WALL_PIXELS = { offset: CELL / 2 - .9, size: .82, depth: .12, count: 12 } as const;

export class ArcadeT {
  private readonly root: TransformNode;
  readonly gate: XorCpuGate;
  private readonly pixels: { mesh: Mesh; material: StandardMaterial; tint: Color3 }[] = [];

  constructor(scene: Scene, settings: LegacyXorSettings = legacyXorSettings()) {
    this.root = new TransformNode("Arcade T / level geometry", scene);
    this.gate = new XorCpuGate(scene, this.root, settings);
    for (const [index, hex] of ["#baff8f", "#7dffe2"].entries()) {
      const material = new StandardMaterial(`FX/Arcade pixel ${index}`, scene);
      material.disableLighting = true;
      const tint = Color3.FromHexString(hex);
      material.emissiveColor = tint.scale(1.2);
      material.diffuseColor = Color3.Black();
      const mesh = MeshBuilder.CreateBox(`FX/Arcade bit sprites ${index}`, { size: 1 }, scene);
      mesh.parent = this.root;
      mesh.material = material;
      mesh.isPickable = false;
      const matrices = new Float32Array(ARCADE_WALL_PIXELS.count * 16);
      for (let pixel = 0; pixel < ARCADE_WALL_PIXELS.count; pixel++) {
        const side = pixel % 2 ? 1 : -1;
        const { x, z } = cellPosition(-1, 14.4 - Math.floor(pixel / 2) * .7);
        Matrix.Compose(new Vector3(ARCADE_WALL_PIXELS.size, ARCADE_WALL_PIXELS.size, ARCADE_WALL_PIXELS.depth),
          Quaternion.RotationYawPitchRoll(side * Math.PI / 2, 0, 0),
          new Vector3(x + side * ARCADE_WALL_PIXELS.offset, 15.5 + pixel % 3 * 2.8, z + index * 1.3))
          .copyToArray(matrices, pixel * 16);
      }
      mesh.thinInstanceSetBuffer("matrix", matrices, 16, true);
      this.pixels.push({ mesh, material, tint });
    }
  }

  update(time: number, audio: AudioFeatures): void {
    this.root.setEnabled(time < CINEMA.start);
    this.gate.update(time);
    if (!this.root.isEnabled()) return;
    for (const { mesh, material, tint } of this.pixels) {
      mesh.setEnabled(time < 48);
      material.emissiveColor.copyFrom(tint).scaleInPlace(1.2 + audio.kick * .45 + audio.energy * .2);
    }
  }
}
