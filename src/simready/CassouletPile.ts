import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { CASSOULET_PILE } from "../content/showBeats";
import { CELL, cellPosition } from "../content/title";
import { bakeRigidBodies, samplePhysicsBake, type BakedColliderRecipe, type PhysicsBake } from "../scene/PhysicsBake";
import { CassouletRescue } from "./CassouletRescue";

export function cassouletRelease(index: number): number {
  return Math.round(index * CASSOULET_PILE.releaseInterval / CASSOULET_PILE.step) * CASSOULET_PILE.step;
}

export class CassouletPile {
  private bake?: PhysicsBake;
  rescue?: CassouletRescue;
  private readonly localPosition = Vector3.Zero();
  private readonly localRotation = Quaternion.Identity();

  constructor(private readonly scene: Scene, private readonly root: TransformNode,
    private readonly cans: readonly TransformNode[]) {
    for (const can of cans) {
      can.rotationQuaternion = Quaternion.Identity();
      can.setEnabled(false);
    }
  }

  initialize(): void {
    if (this.bake) return;
    const recipes = this.cans.map((_can, index) => ({
      release: cassouletRelease(index),
      position: new Vector3((index % 3 - 1) * 1.5 + Math.sin(index * 2.4) * .12,
        CASSOULET_PILE.spawnHeight, (Math.floor(index / 3) % 3 - 1) * 1.5 + Math.cos(index * 1.7) * .12),
      rotation: Quaternion.RotationYawPitchRoll(index * 1.31, Math.sin(index) * .04, Math.cos(index) * .04),
      velocity: new Vector3(Math.sin(index * 2.1) * .12, -1, Math.cos(index * 1.9) * .12),
      angularVelocity: new Vector3(.05 * Math.sin(index), .15 * Math.cos(index), .05 * Math.cos(index)),
    }));
    const colliders: BakedColliderRecipe[] = [
      { position: new Vector3(0, -.2, 0), extents: new Vector3(120, .4, 120), friction: .95 },
    ];
    for (const side of [-1, 1]) {
      const wall = new Vector3(cellPosition(4, 3).x + side * (CELL / 2 - .75), 17, this.root.position.z);
      const local = Vector3.TransformCoordinates(wall, Matrix.Invert(this.root.computeWorldMatrix(true)));
      colliders.push({ position: local, extents: new Vector3(.3, 34, 120), friction: .75 });
    }
    const rescue = new CassouletRescue(this.scene, this.root);
    try {
      const bake = bakeRigidBodies(this.scene, this.root, recipes, CASSOULET_PILE.end - CASSOULET_PILE.start,
        CASSOULET_PILE.step, PhysicsShapeType.CYLINDER, {
          mass: .8, friction: .95, restitution: .04, radius: CASSOULET_PILE.size * .37,
          pointA: new Vector3(0, -CASSOULET_PILE.size / 2, 0),
          pointB: new Vector3(0, CASSOULET_PILE.size / 2, 0),
        }, colliders, rescue.hooks);
      rescue.verify();
      this.bake = bake;
      this.rescue = rescue;
    } finally { rescue.dispose(); }
  }

  update(elapsed: number): void {
    if (!this.bake) {
      this.cans.forEach((can) => can.setEnabled(false));
      return;
    }
    for (const [index, can] of this.cans.entries()) {
      const visible = elapsed >= cassouletRelease(index);
      can.setEnabled(visible);
      if (visible) samplePhysicsBake(this.bake, index, elapsed, can.position, can.rotationQuaternion!);
    }
  }

  sampleRescue(track: number, time: number, position: Vector3, rotation: Quaternion): void {
    if (!this.bake || !this.rescue) throw new Error("Cassoulet rescue must be prepared before sampling.");
    samplePhysicsBake(this.bake, track, time - CASSOULET_PILE.start, this.localPosition, this.localRotation);
    const world = this.root.computeWorldMatrix(true);
    Vector3.TransformCoordinatesToRef(this.localPosition, world, position);
    rotation.copyFrom(Quaternion.FromRotationMatrix(world).multiply(this.localRotation));
  }
}
