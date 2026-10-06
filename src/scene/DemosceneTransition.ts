import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { routeAnchor } from "../camera/CameraPath";
import { SPEAKERS } from "../content/speakers";
import { cueEnvelope } from "../content/cues";
import { smootherstep } from "../engine/Timeline";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import { CINEMA } from "../content/showBeats";

const VIOLIN = [
  "......oo.........",
  "......o#o........",
  "......##.........",
  ".....+##.........",
  "....+.##.........",
  "...+..##.........",
  "..+...##.........",
  ".+...o##o........",
  "+...oo||oo.......",
  ".+..o#||#o.......",
  "..+.oo||oo.......",
  "...+..||.........",
  "....+o||o........",
  ".....+||+........",
  "....oo||oo.......",
  "...ooo||ooo......",
  "...ooo||ooo......",
  "....oo||oo.......",
  ".....o||o........",
  "......##.........",
];

interface Bit { col: number; row: number; seed: number; color: number }
const bits: Bit[] = VIOLIN.flatMap((line, row) => [...line].flatMap((pixel, col) =>
  pixel === "." ? [] : [{
    col, row, seed: (col * 37 + row * 97) % 61 / 61,
    color: pixel === "+" || pixel === "|" ? 2 : pixel === "o" ? 1 : 0,
  }]));

export const VOXEL_COUNT = bits.length;
export const VIOLIN_PATTERN = VIOLIN;

export class DemosceneTransition {
  private readonly voxels;
  private readonly voxelMatrices: Float32Array[] = [];
  private readonly streaks;
  private readonly streakMatrices = new Float32Array(96 * 16);
  private readonly scale = new Vector3();
  private readonly position = Vector3.Zero();
  private readonly transform = Matrix.Identity();

  constructor(scene: Scene) {
    this.voxels = [0, 1, 2].map((color) => {
      const material = new StandardMaterial(`Arcade / voxel tint ${color}`, scene);
      material.disableLighting = true;
      material.diffuseColor = Color3.Black();
      material.emissiveColor = Color3.FromHexString(["#ffbf76", "#fa85ad", "#a7ffec"][color]).scale(1.3);
      const mesh = MeshBuilder.CreateBox(`FX/Pixel to voxel / ${color}`, { size: 1 }, scene);
      mesh.material = material;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      const matrices = new Float32Array(bits.filter((bit) => bit.color === color).length * 16);
      mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      this.voxelMatrices.push(matrices);
      return mesh;
    });
    const streakMaterial = new StandardMaterial("Arcade / D warp light trails", scene);
    streakMaterial.disableLighting = true;
    streakMaterial.diffuseColor = Color3.Black();
    streakMaterial.emissiveColor = Color3.FromHexString("#77faff").scale(1.8);
    const streaks = this.streaks = MeshBuilder.CreateBox("FX/Arcade warp streaks", { size: 1 }, scene);
    streaks.material = streakMaterial;
    streaks.isPickable = false;
    streaks.alwaysSelectAsActiveMesh = true;
    streaks.thinInstanceSetBuffer("matrix", this.streakMatrices, 16, false);
    this.update(0, silentFeatures());
  }

  update(time: number, audio: AudioFeatures): void {
    const voxelsVisible = time >= 19 && time < 38;
    this.voxels.forEach((mesh) => mesh.setEnabled(voxelsVisible));
    if (voxelsVisible) {
      const anchor = routeAnchor(SPEAKERS[0].gateTime);
      const opening = smootherstep((time - 31) / 4);
      const yaw = Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0);
      const localToWorld = Matrix.RotationY(anchor.yaw)
        .multiply(Matrix.Translation(anchor.position.x, 0, anchor.position.z));
      const offsets = [0, 0, 0];
      for (const bit of bits) {
        const { col, row, seed, color } = bit;
        const side = (col % 2 ? 1 : -1);
        const from = new Vector3((col - 7.5) * .4, 11.5 - row * .36, 5);
        const to = new Vector3(side * (7 + seed * 5), 5 + seed * 22,
          8 + seed * 26 + Math.sin(time * 4 + row + col) * (2 + audio.bass * 2));
        const position = Vector3.TransformCoordinates(Vector3.Lerp(from, to, opening), localToWorld);
        this.position.copyFrom(position);
        const size = (.42 - opening * .22) * (1 + audio.kick * .12);
        this.scale.setAll(size);
        Matrix.ComposeToRef(this.scale, yaw, this.position, this.transform);
        this.transform.copyToArray(this.voxelMatrices[color], offsets[color]);
        offsets[color] += 16;
      }
      this.voxels.forEach((mesh) => mesh.thinInstanceBufferUpdated("matrix"));
    }
    const warp = Math.max(cueEnvelope(time, 45, CINEMA.clapperStart, .7),
      cueEnvelope(time, CINEMA.projector, 99, 1.2));
    this.streaks.setEnabled(warp > 0);
    if (warp === 0) return;
    for (let index = 0; index < 96; index++) {
      const lane = index % 8;
      const forward = 1.5 + (index % 16) * .43;
      const anchor = routeAnchor(time + forward);
      const lateral = (lane - 3.5) * 2.5;
      this.position.set(anchor.position.x + Math.cos(anchor.yaw) * lateral,
        4 + (index * 13 % 22), anchor.position.z - Math.sin(anchor.yaw) * lateral);
      this.scale.set(.055 + audio.treble * .09, .07, (.65 + index % 4) * warp);
      Matrix.ComposeToRef(this.scale, Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0),
        this.position, this.transform);
      this.transform.copyToArray(this.streakMatrices, index * 16);
    }
    this.streaks.thinInstanceBufferUpdated("matrix");
  }
}
