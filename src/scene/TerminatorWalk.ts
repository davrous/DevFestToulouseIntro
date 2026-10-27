import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { Scene } from "@babylonjs/core/scene";
import { TERMINATOR } from "../content/showBeats";
import { clamp } from "../engine/Timeline";
import type { CinemaAssets } from "./CinemaAssets";
import type { CassouletPile } from "../simready/CassouletPile";
import { TerminatorDestruction } from "../effects/TerminatorDestruction";
import { createRosePetals } from "../effects/RosePetals";

export function terminatorWalkState(time: number, from: number, to: number, fps: number):
  { distance: number; frame: number; visible: boolean } {
  if (![time, from, to, fps].every(Number.isFinite) || to <= from || fps <= 0) {
    throw new RangeError("Terminator walk needs finite time and a non-empty animation clip.");
  }
  const elapsed = clamp(time - TERMINATOR.walkStart, 0, TERMINATOR.walkEnd - TERMINATOR.walkStart);
  return { distance: elapsed / (TERMINATOR.walkEnd - TERMINATOR.walkStart) * TERMINATOR.distance,
    frame: from + elapsed * fps % (to - from), visible: time >= TERMINATOR.start && time < TERMINATOR.end };
}

export class TerminatorWalk {
  readonly root: TransformNode;
  readonly debris;
  readonly destruction: TerminatorDestruction[] = [];
  readonly lights: PointLight[];
  private animation?: AnimationGroup;
  private readonly matrices = new Float32Array(TERMINATOR.fragments * 16);
  private readonly position = Vector3.Zero();
  private readonly rotation = Quaternion.Identity();
  private readonly transform = Matrix.Identity();
  private readonly fragmentSize = new Vector3(.9, 1.25, .9);
  private readonly petalMaterial: ShaderMaterial;

  constructor(scene: Scene) {
    this.root = new TransformNode("Digital / Terminator stopped by cassoulet", scene);
    this.root.rotationQuaternion = Quaternion.Identity();
    this.root.setEnabled(false);
    const key = new PointLight("Digital / T-800 cool key light", new Vector3(-5, 7, 10), scene);
    key.diffuse.set(.72, .86, 1); key.specular.set(.82, .9, 1); key.range = 36;
    const rim = new PointLight("Digital / T-800 red rim light", new Vector3(6, 2, -7), scene);
    rim.diffuse.set(1, .3, .18); rim.specular.set(1, .35, .22); rim.range = 32;
    this.lights = [key, rim];
    this.lights.forEach((light) => {
      light.parent = this.root; light.intensity = 0; light.falloffType = PointLight.FALLOFF_PHYSICAL;
    });
    const petals = createRosePetals(scene, TERMINATOR.fragments);
    this.debris = petals.mesh;
    this.petalMaterial = petals.material;
    this.debris.thinInstanceSetBuffer("matrix", this.matrices, 16, false);
    this.debris.setEnabled(false);
  }

  prepare(assets: CinemaAssets): void {
    const model = assets.takeAnimated("terminator", this.root, "Cinema / animated T-800", TERMINATOR.height);
    if (!model?.animation || model.animation.name !== TERMINATOR.clip) {
      throw new Error(`The local Terminator model must contain its "${TERMINATOR.clip}" skeletal animation.`);
    }
    this.animation = model.animation;
    const meshes = this.root.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
    this.lights.forEach((light) => { light.includedOnlyMeshes = meshes; });
    for (const material of new Set(meshes.map((mesh) => mesh.material))) {
      if (!(material instanceof PBRMaterial)) throw new Error("The original Terminator must retain its PBR materials for destruction.");
      material.maxSimultaneousLights = Math.max(material.maxSimultaneousLights, 6);
      this.destruction.push(new TerminatorDestruction(material));
    }
    this.update(0);
  }

  update(time: number, pile?: CassouletPile, enabled = true): void {
    this.petalMaterial.setFloat("time", time);
    if (!this.animation) return;
    const rescue = pile?.rescue;
    const fps = this.animation.targetedAnimations[0]?.animation.framePerSecond;
    if (!fps) throw new Error("The Terminator walk clip has no animation frame rate.");
    const state = terminatorWalkState(Math.min(time, rescue?.impactTime ?? time), this.animation.from, this.animation.to, fps);
    const active = enabled && !!rescue && time >= TERMINATOR.start && time < TERMINATOR.end;
    const damage = rescue?.damageAt(time) ?? 0;
    this.destruction.forEach((effect) => { effect.damage = damage; });
    this.root.setEnabled(active && damage < 1);
    this.lights[0].intensity = active && damage < 1 ? 800 : 0;
    this.lights[1].intensity = active && damage < 1 ? 250 : 0;
    this.debris.setEnabled(active && time >= (rescue?.destroyTime ?? Infinity));
    if (rescue && pile) {
      if (time < rescue.impactTime) rescue.walkPose(time, this.root.position, this.root.rotationQuaternion!);
      else pile.sampleRescue(rescue.targetTrack, time, this.root.position, this.root.rotationQuaternion!);
      if (this.debris.isEnabled()) {
        for (let index = 0; index < TERMINATOR.fragments; index++) {
          pile.sampleRescue(rescue.firstFragmentTrack + index, time, this.position, this.rotation);
          Matrix.ComposeToRef(this.fragmentSize, this.rotation, this.position, this.transform);
          this.transform.copyToArray(this.matrices, index * 16);
        }
        this.debris.thinInstanceBufferUpdated("matrix");
      }
    }
    this.animation.goToFrame(state.frame);
  }
}
