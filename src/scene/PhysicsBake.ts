import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate, type PhysicsAggregateParameters } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { Scene } from "@babylonjs/core/scene";

export interface BakedBodyRecipe {
  release: number;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  angularVelocity: Vector3;
}

export interface PhysicsBake {
  step: number;
  frames: number;
  tracks: Float32Array[];
}

export interface BakedColliderRecipe {
  position: Vector3;
  extents: Vector3;
  friction: number;
  rotation?: Quaternion;
  restitution?: number;
}

export interface PhysicsBakeHooks {
  additionalNodes?: readonly TransformNode[];
  beforeStep?: (time: number) => void;
  onBodyCreated?: (aggregate: PhysicsAggregate, index: number) => void;
}

export function bakeRigidBodies(scene: Scene, parent: TransformNode, recipes: readonly BakedBodyRecipe[],
  duration: number, step: number, shape: PhysicsShapeType, options: PhysicsAggregateParameters,
  colliders: readonly BakedColliderRecipe[], hooks: PhysicsBakeHooks = {}): PhysicsBake {
  const engine = scene.getPhysicsEngine();
  if (!engine) throw new Error("The existing Havok engine must be initialized before baking.");
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(step) || step <= 0) {
    throw new RangeError("Physics bake duration and step must be positive.");
  }
  const frames = Math.ceil(duration / step) + 1;
  const tracks = Array.from({ length: recipes.length + (hooks.additionalNodes?.length ?? 0) },
    () => new Float32Array(frames * 7));
  const world = parent.computeWorldMatrix(true).clone();
  const inverse = Matrix.Invert(world);
  const parentRotation = Quaternion.FromRotationMatrix(world);
  const inverseRotation = parentRotation.conjugate();
  const bodies: Array<{ node?: TransformNode; aggregate?: PhysicsAggregate }> = recipes.map(() => ({}));
  const boundaries: Array<{ node: TransformNode; aggregate: PhysicsAggregate }> = [];
  try {
    for (const [index, collider] of colliders.entries()) {
      const node = new TransformNode(`Physics bake / temporary boundary ${index}`, scene);
      node.position.copyFrom(Vector3.TransformCoordinates(collider.position, world));
      node.rotationQuaternion = collider.rotation ? parentRotation.multiply(collider.rotation) : parentRotation.clone();
      const aggregate = new PhysicsAggregate(node, PhysicsShapeType.BOX,
        { mass: 0, friction: collider.friction, restitution: collider.restitution ?? .05, extents: collider.extents }, scene);
      boundaries.push({ node, aggregate });
    }
    for (let frame = 0; frame < frames; frame++) {
      const time = frame * step;
      hooks.beforeStep?.(time);
      for (const [index, recipe] of recipes.entries()) {
        const body = bodies[index];
        if (time + 1e-8 < recipe.release) {
          tracks[index].set([...recipe.position.asArray(), ...recipe.rotation.asArray()], frame * 7);
          continue;
        }
        if (!body.node) {
          const node = new TransformNode(`Physics bake / rigid body ${index}`, scene);
          node.position.copyFrom(Vector3.TransformCoordinates(recipe.position, world));
          node.rotationQuaternion = parentRotation.multiply(recipe.rotation);
          const aggregate = new PhysicsAggregate(node, shape, options, scene);
          aggregate.body.setLinearVelocity(Vector3.TransformNormal(recipe.velocity, world));
          aggregate.body.setAngularVelocity(Vector3.TransformNormal(recipe.angularVelocity, world));
          body.node = node;
          body.aggregate = aggregate;
          hooks.onBodyCreated?.(aggregate, index);
        }
        const local = Vector3.TransformCoordinates(body.node.position, inverse);
        const rotation = inverseRotation.multiply(body.node.rotationQuaternion!);
        const offset = frame * 7;
        tracks[index].set([local.x, local.y, local.z, rotation.x, rotation.y, rotation.z, rotation.w], offset);
      }
      hooks.additionalNodes?.forEach((node, index) => {
        const local = Vector3.TransformCoordinates(node.position, inverse);
        const rotation = inverseRotation.multiply(node.rotationQuaternion!);
        tracks[recipes.length + index].set([...local.asArray(), ...rotation.asArray()], frame * 7);
      });
      if (frame + 1 < frames) engine._step(step);
    }
  } finally {
    for (const body of bodies) {
      body.aggregate?.dispose();
      body.node?.dispose();
    }
    for (const boundary of boundaries) {
      boundary.aggregate.dispose();
      boundary.node.dispose();
    }
  }
  return { step, frames, tracks };
}

const fromRotation = Quaternion.Identity();
const toRotation = Quaternion.Identity();

export function samplePhysicsBake(bake: PhysicsBake, index: number, time: number,
  position: Vector3, rotation: Quaternion): void {
  const track = bake.tracks[index];
  if (!track || !Number.isFinite(time)) throw new RangeError("Invalid physics bake sample.");
  const frame = Math.max(0, Math.min(bake.frames - 1, time / bake.step));
  const lower = Math.floor(frame), upper = Math.min(bake.frames - 1, lower + 1);
  const a = lower * 7, b = upper * 7, blend = frame - lower;
  position.set(track[a] + (track[b] - track[a]) * blend,
    track[a + 1] + (track[b + 1] - track[a + 1]) * blend,
    track[a + 2] + (track[b + 2] - track[a + 2]) * blend);
  fromRotation.set(track[a + 3], track[a + 4], track[a + 5], track[a + 6]);
  toRotation.set(track[b + 3], track[b + 4], track[b + 5], track[b + 6]);
  Quaternion.SlerpToRef(fromRotation, toRotation, blend, rotation);
}
