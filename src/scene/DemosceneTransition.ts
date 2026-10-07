import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { routeAnchor } from "../camera/CameraPath";
import { SPEAKERS } from "../content/speakers";
import { cueEnvelope } from "../content/cues";
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
export const VIOLIN_FALL = { start: 22, end: 38, size: .34 } as const;

interface Voxel {
  mesh: Mesh;
  home: Vector3;
  velocity: Vector3;
  body?: PhysicsAggregate;
}

export class DemosceneTransition {
  private readonly voxels;
  private readonly voxelMatrices: Float32Array[] = [];
  private readonly streaks;
  private readonly streakMatrices = new Float32Array(96 * 16);
  private readonly scale = new Vector3();
  private readonly position = Vector3.Zero();
  private readonly transform = Matrix.Identity();
  private readonly pieces: Voxel[] = [];
  private plugin?: HavokPlugin;
  private previous?: number;

  constructor(private readonly scene: Scene) {
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
    const anchor = routeAnchor(SPEAKERS[0].gateTime);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, 0, anchor.position.z));
    for (const [index, bit] of bits.entries()) {
      const mesh = MeshBuilder.CreateBox(`Arcade / violin voxel ${index}`, { size: VIOLIN_FALL.size }, scene);
      mesh.material = this.voxels[bit.color].material;
      mesh.isPickable = false;
      mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0);
      const home = Vector3.TransformCoordinates(new Vector3(
        (bit.col - 7.5) * .4, 11.5 - bit.row * .36, 5), world);
      const velocity = Vector3.TransformNormal(new Vector3(
        (bit.seed - .5) * 2.4, -.4 - bit.seed, .3 + bit.seed * .8), world);
      mesh.position.copyFrom(home);
      mesh.setEnabled(false);
      this.pieces.push({ mesh, home, velocity });
    }
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

  initialize(plugin: HavokPlugin): void {
    this.plugin = plugin;
    const anchor = routeAnchor(SPEAKERS[0].gateTime);
    const floor = new TransformNode("Arcade / violin collision floor", this.scene);
    floor.position.set(anchor.position.x, -.25, anchor.position.z);
    floor.rotation.y = anchor.yaw;
    new PhysicsAggregate(floor, PhysicsShapeType.BOX, {
      mass: 0, friction: .7, restitution: .2, extents: new Vector3(26, .5, 28),
    }, this.scene);
  }

  private clearPieces(): void {
    for (const piece of this.pieces) {
      piece.body?.dispose();
      piece.body = undefined;
      piece.mesh.setEnabled(false);
    }
  }

  update(time: number, audio: AudioFeatures, speed = 1): void {
    const seek = this.previous === undefined || time < this.previous || time - this.previous > .3;
    this.previous = time;
    if (seek || time < VIOLIN_FALL.start || time >= VIOLIN_FALL.end) this.clearPieces();
    const falling = time >= VIOLIN_FALL.start && time < VIOLIN_FALL.end;
    if (falling && this.plugin) {
      const elapsed = Math.max(0, time - VIOLIN_FALL.start);
      for (const [index, piece] of this.pieces.entries()) {
        if (piece.body) continue;
        piece.mesh.setEnabled(true);
        piece.mesh.position.copyFrom(piece.home).addInPlace(piece.velocity.scale(elapsed));
        piece.mesh.position.y = Math.max(VIOLIN_FALL.size / 2,
          piece.mesh.position.y - 8.5 * elapsed * elapsed);
        piece.mesh.rotationQuaternion!.copyFrom(Quaternion.RotationYawPitchRoll(
          routeAnchor(SPEAKERS[0].gateTime).yaw + elapsed * (index % 3 - 1), elapsed * .8, elapsed * .5));
        piece.body = new PhysicsAggregate(piece.mesh, PhysicsShapeType.BOX,
          { mass: .15, friction: .7, restitution: .18 }, this.scene);
        piece.body.body.setLinearVelocity(new Vector3(piece.velocity.x,
          piece.mesh.position.y <= VIOLIN_FALL.size / 2 ? 0 : piece.velocity.y - 17 * elapsed,
          piece.velocity.z).scale(speed));
        piece.body.body.setAngularVelocity(new Vector3((index % 3 - 1) * 2, .8, 1.2).scale(speed));
      }
    }
    const voxelsVisible = time >= 19 && time < VIOLIN_FALL.end && (!falling || !this.plugin);
    this.voxels.forEach((mesh) => mesh.setEnabled(voxelsVisible));
    if (voxelsVisible) {
      const anchor = routeAnchor(SPEAKERS[0].gateTime);
      const yaw = Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0);
      const localToWorld = Matrix.RotationY(anchor.yaw)
        .multiply(Matrix.Translation(anchor.position.x, 0, anchor.position.z));
      const offsets = [0, 0, 0];
      for (const bit of bits) {
        const { col, row, color } = bit;
        const from = new Vector3((col - 7.5) * .4, 11.5 - row * .36, 5);
        const position = Vector3.TransformCoordinates(from, localToWorld);
        this.position.copyFrom(position);
        this.scale.setAll(VIOLIN_FALL.size);
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
