import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { routeAnchor } from "../camera/CameraPath";
import { CELL, cellPosition } from "../content/title";
import { CHOCOLATINE, cueEnvelope } from "../content/cues";
import { CINEMA } from "../content/showBeats";
import { smoothstep } from "../engine/Timeline";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { createWorldText } from "./WorldText";
import { RedVelvetCurtain } from "./RedVelvetCurtain";

export function arcadeDoorOpen(time: number): number {
  return smoothstep((time - 42.6) / 4);
}

export const ARCADE_WALL_PIXELS = { offset: CELL / 2 - .9, size: .82, depth: .12, count: 12 } as const;

export class ArcadeT {
  private readonly root: TransformNode;
  readonly curtain: RedVelvetCurtain;
  private readonly gateText: Mesh;
  private readonly boss: Mesh[];
  private readonly health: Mesh[] = [];
  private readonly pixels: { mesh: Mesh; material: StandardMaterial; tint: Color3 }[] = [];

  constructor(scene: Scene) {
    this.root = new TransformNode("Arcade T / level geometry", scene);
    const opening = cellPosition(1, 9);
    const doorX = opening.x + 14;
    this.curtain = new RedVelvetCurtain(scene, this.root, doorX, opening.z);
    this.gateText = createWorldText(scene, {
      name: "Arcade door / rebase unlock", width: 18, height: 6,
      background: "#150f25", border: "#b7ff81",
      lines: [
        { text: "$ git rebase --continue", color: "#b7ff81" },
        { text: "EXIT UNLOCKED", color: "#b7ff81" },
      ],
    });
    this.gateText.parent = this.root;
    this.gateText.position.set(doorX - 1, 17, opening.z);
    this.gateText.rotation.y = Math.PI / 2;
    const bossAnchor = routeAnchor(39);
    this.boss = [
      [{ text: "FINAL BOSS", color: "#ff8c9c" }, { text: "LEGACY CODE", color: "#ffe3c7" }],
      [{ text: "LEGACY CODE DETECTED", color: "#ff9193" }, { text: "BUILD FAILED", color: "#ffd8b5" }],
      [{ text: "REBASE AVAILABLE", color: "#baff90" }],
    ].map((lines, index) => {
      const mesh = createWorldText(scene, {
        name: `Arcade / boss state ${index}`, width: 19, height: 5,
        background: "#1c1522", border: "#f07194", lines,
      });
      mesh.parent = this.root;
      mesh.position.set(bossAnchor.position.x, 21.5, bossAnchor.position.z);
      mesh.rotation.y = bossAnchor.yaw;
      return mesh;
    });
    const healthMaterial = new StandardMaterial("Arcade / boss health bar", scene);
    healthMaterial.disableLighting = true;
    healthMaterial.emissiveColor = Color3.FromHexString("#ff8296").scale(1.6);
    for (let index = 0; index < 10; index++) {
      const segment = MeshBuilder.CreateBox(`FX/Arcade boss health ${index}`,
        { width: 1.6, height: .5, depth: .12 }, scene);
      segment.parent = this.root;
      segment.position.set(bossAnchor.position.x - .5, 18, bossAnchor.position.z + (index - 4.5) * 1.8);
      segment.material = healthMaterial;
      this.health.push(segment);
    }
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
    if (!this.root.isEnabled()) return;
    const open = arcadeDoorOpen(time);
    this.curtain.update(time, open);
    this.gateText.visibility = cueEnvelope(time, 41.2, 45.7, .4);
    const warning = cueEnvelope(time, CHOCOLATINE.end, 41, .5);
    this.boss.forEach((mesh, index) => {
      const start = [CHOCOLATINE.end, 36.1, 38.7][index];
      const end = [36.1, 38.7, 41][index];
      mesh.visibility = cueEnvelope(time, start, end, .2);
    });
    this.health.forEach((mesh, index) =>
      mesh.setEnabled(warning > 0 && (time < 38.2 || index < 10 - Math.floor((time - 38.2) * 7))));
    for (const { mesh, material, tint } of this.pixels) {
      mesh.setEnabled(time < 48);
      material.emissiveColor.copyFrom(tint).scaleInPlace(1.2 + audio.kick * .45 + audio.energy * .2);
    }
  }
}
