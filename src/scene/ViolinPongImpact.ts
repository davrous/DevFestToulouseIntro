import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { Scene } from "@babylonjs/core/scene";
import { PONG_VOLLEY, VIOLIN_BITS, VIOLIN_FALL, pongRallyPosition, violinLocalPosition } from "../content/violin";
import type { PhysicsBake } from "./PhysicsBake";

export interface ViolinPongImpact {
  bake: PhysicsBake;
  impactTime: number;
  contactIndex: number;
  impulse: number;
  ballIndex: number;
}

export function bakeViolinPongImpact(scene: Scene, frameWorld: Matrix): ViolinPongImpact {
  const engine = scene.getPhysicsEngine();
  if (!engine) throw new Error("Violin impact requires the existing Havok engine.");
  const step = 1 / 60, frames = Math.ceil((VIOLIN_FALL.end - PONG_VOLLEY.shot) / step) + 1;
  const tracks = Array.from({ length: VIOLIN_BITS.length + 1 }, () => new Float32Array(frames * 7));
  const inverse = Matrix.Invert(frameWorld), rotation = Quaternion.FromRotationMatrix(frameWorld);
  const inverseRotation = rotation.conjugate();
  const nodes: TransformNode[] = [], aggregates: PhysicsAggregate[] = [];
  let impactTime = Infinity, contactIndex = -1, impulse = 0, clock = PONG_VOLLEY.shot;
  try {
    const floor = new TransformNode("Violin bake / floor", scene);
    floor.position.copyFrom(Vector3.TransformCoordinates(new Vector3(0, -.25, 5), frameWorld));
    floor.rotationQuaternion = rotation.clone();
    const floorBody = new PhysicsAggregate(floor, PhysicsShapeType.BOX,
      { mass: 0, friction: .7, restitution: .2, extents: new Vector3(28, .5, 30) }, scene);
    aggregates.push(floorBody);
    for (const [index, bit] of VIOLIN_BITS.entries()) {
      const node = new TransformNode(`Violin bake / voxel ${index}`, scene);
      node.position.copyFrom(Vector3.TransformCoordinates(violinLocalPosition(bit), frameWorld));
      node.rotationQuaternion = rotation.clone();
      const body = new PhysicsAggregate(node, PhysicsShapeType.BOX,
        { mass: .15, friction: .7, restitution: .18, extents: Vector3.One().scale(VIOLIN_FALL.size) }, scene);
      body.body.setGravityFactor(0);
      aggregates.push(body); nodes.push(node);
    }
    const ball = new TransformNode("Violin bake / final Pong ball", scene);
    const launch = pongRallyPosition(PONG_VOLLEY.shot);
    launch.y += PONG_VOLLEY.centerY;
    const bit = VIOLIN_BITS.find((entry) => entry.col === 5 && entry.row === 15);
    if (!bit) throw new Error("Violin impact target is missing.");
    const target = violinLocalPosition(bit);
    const flight = VIOLIN_FALL.start + .04 - PONG_VOLLEY.shot;
    const velocity = target.subtract(launch).scale(1 / flight);
    velocity.y += 8.5 * flight;
    ball.position.copyFrom(Vector3.TransformCoordinates(launch, frameWorld));
    ball.rotationQuaternion = rotation.clone();
    const projectile = new PhysicsAggregate(ball, PhysicsShapeType.SPHERE,
      { mass: .35, radius: PONG_VOLLEY.radius, friction: .6, restitution: .35 }, scene);
    projectile.body.setLinearVelocity(Vector3.TransformNormal(velocity, frameWorld));
    projectile.body.setCollisionCallbackEnabled(true);
    const voxelBodies = aggregates.slice(1);
    projectile.body.getCollisionObservable().add((event) => {
      const index = voxelBodies.findIndex((entry) => entry.body === event.collider || entry.body === event.collidedAgainst);
      if (index < 0) return;
      impulse = Math.max(impulse, event.impulse);
      if (Number.isFinite(impactTime)) return;
      impactTime = clock;
      contactIndex = index;
      for (const voxel of voxelBodies) voxel.body.setGravityFactor(1);
    });
    aggregates.push(projectile); nodes.push(ball);
    for (let frame = 0; frame < frames; frame++) {
      for (const [index, node] of nodes.entries()) {
        const position = Vector3.TransformCoordinates(node.position, inverse);
        const localRotation = inverseRotation.multiply(node.rotationQuaternion!);
        tracks[index].set([...position.asArray(), ...localRotation.asArray()], frame * 7);
      }
      clock = PONG_VOLLEY.shot + (frame + 1) * step;
      if (frame + 1 < frames) engine._step(step);
      if (clock > VIOLIN_FALL.start + .3 && !Number.isFinite(impactTime)) {
        throw new Error("The final Pong shot missed the violin; refusing to substitute a timed collapse.");
      }
    }
    return { bake: { frames, step, tracks }, impactTime, contactIndex, impulse, ballIndex: nodes.length - 1 };
  } finally {
    for (const aggregate of aggregates) {
      const node = aggregate.transformNode;
      aggregate.dispose();
      node.dispose();
    }
  }
}
