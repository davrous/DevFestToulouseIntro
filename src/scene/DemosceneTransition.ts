import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
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
import { speakerReveal } from "../effects/ShowLighting";
import { PONG_VOLLEY, VIOLIN_BITS as bits, VIOLIN_FALL, violinLocalPosition } from "../content/violin";
import { bakeViolinPongImpact, type ViolinPongImpact } from "./ViolinPongImpact";
import { samplePhysicsBake } from "./PhysicsBake";
export { VOXEL_COUNT, VIOLIN_PATTERN, VIOLIN_FALL } from "../content/violin";

interface Voxel {
  mesh: Mesh;
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
  private readonly voxelMaterials: Array<{ material: StandardMaterial; tint: Color3 }> = [];
  private plugin?: HavokPlugin;
  impact?: ViolinPongImpact;
  private readonly sampledPosition = Vector3.Zero();
  private readonly sampledRotation = Quaternion.Identity();
  private readonly frameWorld: Matrix;
  private readonly frameRotation: Quaternion;

  constructor(private readonly scene: Scene) {
    this.voxels = [0, 1, 2].map((color) => {
      const material = new StandardMaterial(`Arcade / voxel tint ${color}`, scene);
      material.disableLighting = true;
      material.diffuseColor = Color3.Black();
      const tint = Color3.FromHexString(["#ffbf76", "#fa85ad", "#a7ffec"][color]);
      material.emissiveColor = tint.scale(1.3);
      this.voxelMaterials.push({ material, tint });
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
    this.frameWorld = world;
    this.frameRotation = Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0);
    for (const [index, bit] of bits.entries()) {
      const mesh = MeshBuilder.CreateBox(`Arcade / violin voxel ${index}`, { size: VIOLIN_FALL.size }, scene);
      mesh.material = this.voxels[bit.color].material;
      mesh.isPickable = false;
      mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0);
      const home = Vector3.TransformCoordinates(violinLocalPosition(bit), world);
      mesh.position.copyFrom(home);
      mesh.setEnabled(false);
      this.pieces.push({ mesh });
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
    this.impact ??= bakeViolinPongImpact(this.scene, this.frameWorld);
  }

  private clearPieces(): void {
    for (const piece of this.pieces) {
      piece.mesh.setEnabled(false);
    }
  }

  update(time: number, audio: AudioFeatures, _speed = 1): void {
    const falling = time >= (this.impact?.impactTime ?? VIOLIN_FALL.start) && time < VIOLIN_FALL.end;
    if (!falling) this.clearPieces();
    const reveal = falling ? 1 : speakerReveal(time, SPEAKERS[0]);
    for (const { material, tint } of this.voxelMaterials) {
      material.alpha = reveal;
      material.emissiveColor.copyFrom(tint).scaleInPlace(1.3);
    }
    if (falling && this.impact) {
      for (const [index, piece] of this.pieces.entries()) {
        piece.mesh.setEnabled(true);
        samplePhysicsBake(this.impact.bake, index, time - PONG_VOLLEY.shot, this.sampledPosition, this.sampledRotation);
        Vector3.TransformCoordinatesToRef(this.sampledPosition, this.frameWorld, piece.mesh.position);
        this.frameRotation.multiplyToRef(this.sampledRotation, piece.mesh.rotationQuaternion!);
      }
    }
    const voxelsVisible = reveal > 0 && time < VIOLIN_FALL.end && (!falling || !this.plugin);
    this.voxels.forEach((mesh) => mesh.setEnabled(voxelsVisible));
    if (voxelsVisible) {
      const anchor = routeAnchor(SPEAKERS[0].gateTime);
      const yaw = Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0);
      const localToWorld = Matrix.RotationY(anchor.yaw)
        .multiply(Matrix.Translation(anchor.position.x, 0, anchor.position.z));
      const offsets = [0, 0, 0];
      for (const bit of bits) {
        const { color } = bit;
        const from = violinLocalPosition(bit);
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
