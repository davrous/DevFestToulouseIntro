import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { routeAnchor } from "../camera/CameraPath";
import { cellPosition } from "../content/title";
import { cueEnvelope } from "../content/cues";
import { smoothstep } from "../engine/Timeline";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { createWorldText } from "./WorldText";

export function arcadeDoorOpen(time: number): number {
  return smoothstep((time - 42.6) / 4);
}

export class ArcadeT {
  private readonly root: TransformNode;
  private readonly door: Mesh[] = [];
  private readonly gateText: Mesh;
  private readonly boss: Mesh[];
  private readonly health: Mesh[] = [];
  private readonly pixels: { mesh: Mesh; matrices: Float32Array; color: number }[] = [];
  private readonly transform = Matrix.Identity();
  private readonly scale = new Vector3(.82, .82, .3);
  private readonly position = Vector3.Zero();
  private readonly rotation = Quaternion.Identity();

  constructor(scene: Scene) {
    this.root = new TransformNode("Arcade T / level geometry", scene);
    const opening = cellPosition(1, 9);
    const doorX = opening.x + 14;
    const panel = new StandardMaterial("Arcade / pixel gate", scene);
    panel.disableLighting = true;
    panel.diffuseColor = Color3.FromHexString("#171826");
    panel.emissiveColor = Color3.FromHexString("#af487f").scale(.32);
    for (const side of [-1, 1]) {
      const half = MeshBuilder.CreateBox(`FX/Arcade sliding gate ${side}`,
        { width: 1.4, height: 26, depth: 14 }, scene);
      half.parent = this.root;
      half.position.set(doorX, 13, opening.z + side * 7);
      half.material = panel;
      half.isPickable = false;
      this.door.push(half);
    }
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
      material.emissiveColor = Color3.FromHexString(hex).scale(1.6);
      material.diffuseColor = Color3.Black();
      const mesh = MeshBuilder.CreateBox(`FX/Arcade bit sprites ${index}`, { size: 1 }, scene);
      mesh.parent = this.root;
      mesh.material = material;
      mesh.isPickable = false;
      const matrices = new Float32Array(12 * 16);
      mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      this.pixels.push({ mesh, matrices, color: index });
    }
  }

  update(time: number, audio: AudioFeatures): void {
    this.root.setEnabled(time < 65);
    if (!this.root.isEnabled()) return;
    const opening = cellPosition(1, 9);
    const open = arcadeDoorOpen(time);
    this.door.forEach((half, index) => {
      const side = index ? 1 : -1;
      half.position.z = opening.z + side * (7 + open * 11);
      half.visibility = 1 - smoothstep((time - 52) / 5);
    });
    this.gateText.visibility = cueEnvelope(time, 41.2, 45.7, .4);
    const warning = cueEnvelope(time, 33, 41, .5);
    this.boss.forEach((mesh, index) => {
      const start = [33, 36.1, 38.7][index];
      const end = [36.1, 38.7, 41][index];
      mesh.visibility = cueEnvelope(time, start, end, .2);
    });
    this.health.forEach((mesh, index) =>
      mesh.setEnabled(warning > 0 && (time < 38.2 || index < 10 - Math.floor((time - 38.2) * 7))));
    for (const { mesh, matrices, color } of this.pixels) {
      mesh.setEnabled(time < 48);
      if (!mesh.isEnabled()) continue;
      for (let index = 0; index < 12; index++) {
        const row = 10 + Math.floor(index / 3);
        const { x, z } = cellPosition(-1, row);
        const side = index % 2 ? 1 : -1;
        const phase = time * 1.4 + index * .81 + color * 2;
        this.position.set(x + side * 12.2, 8 + index % 6 * 2.9
          + Math.sin(phase) * (1 + audio.violaEnergy * .3), z + Math.cos(phase * .6) * 4);
        this.scale.set(.82 + audio.kick * .08, .82 + audio.energy * .1, .3);
        Matrix.ComposeToRef(this.scale, this.rotation, this.position, this.transform);
        this.transform.copyToArray(matrices, index * 16);
      }
      mesh.thinInstanceBufferUpdated("matrix");
    }
  }
}
