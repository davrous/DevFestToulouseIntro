import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsMotionType, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { Scene } from "@babylonjs/core/scene";
import { CASSOULET_PILE, TERMINATOR, terminatorPosition } from "../content/showBeats";
import { cellPosition } from "../content/title";
import type { PhysicsBakeHooks } from "../scene/PhysicsBake";
import { clamp } from "../engine/Timeline";

export interface CassouletImpact { time: number; can: number; impulse: number }

export class CassouletRescue {
  readonly contacts: CassouletImpact[] = [];
  readonly nodes: TransformNode[];
  readonly targetTrack = CASSOULET_PILE.count;
  readonly firstFragmentTrack = CASSOULET_PILE.count + 1;
  impactTime = Infinity;
  destroyTime = Infinity;
  private readonly target: PhysicsAggregate;
  private readonly fragments: PhysicsAggregate[] = [];
  private readonly cans: PhysicsAggregate[] = [];
  private readonly incoming: Vector3[] = [];
  private readonly hitCans = new Set<number>();
  private clock = CASSOULET_PILE.start;
  private targetReleased = false;

  constructor(private readonly scene: Scene, private readonly root: TransformNode) {
    const target = new TransformNode("Cassoulet bake / Terminator collision capsule", scene);
    target.rotationQuaternion = Quaternion.Identity();
    this.walkPose(CASSOULET_PILE.start, target.position, target.rotationQuaternion);
    this.target = new PhysicsAggregate(target, PhysicsShapeType.CAPSULE, {
      mass: 1.5, friction: .8, restitution: .02, radius: 2.4,
      pointA: new Vector3(0, -8.8, 0), pointB: new Vector3(0, 7.8, 0),
    }, scene);
    this.target.body.setMotionType(PhysicsMotionType.ANIMATED);
    this.target.body.setGravityFactor(0);
    this.nodes = [target, ...Array.from({ length: TERMINATOR.fragments }, (_, index) => {
      const node = new TransformNode(`Cassoulet bake / Terminator fragment ${index}`, scene);
      node.position.copyFrom(target.position);
      node.rotationQuaternion = Quaternion.Identity();
      return node;
    })];
  }

  get hooks(): PhysicsBakeHooks {
    return {
      additionalNodes: this.nodes,
      beforeStep: (time) => {
        this.clock = CASSOULET_PILE.start + time + CASSOULET_PILE.step;
        this.cans.forEach((can, index) => { this.incoming[index] = can.body.getLinearVelocity(); });
        if (!Number.isFinite(this.impactTime)) {
          this.walkPose(CASSOULET_PILE.start + time, this.nodes[0].position, this.nodes[0].rotationQuaternion!);
          this.target.body.setTargetTransform(this.nodes[0].position, this.nodes[0].rotationQuaternion!);
        }
        if (this.hitCans.size >= TERMINATOR.hitsToDestroy && !Number.isFinite(this.destroyTime)) {
          this.destroyTime = CASSOULET_PILE.start + time;
          this.spawnFragments();
          this.target.dispose();
          this.targetReleased = true;
        }
        this.fragments.forEach((petal, index) => {
          const age = this.clock - this.destroyTime;
          petal.body.applyForce(new Vector3(
            Math.sin(age * 2.3 + index * .91) * .008,
            .003 + Math.sin(age * 1.7 + index) * .001,
            Math.cos(age * 2.0 + index * 1.17) * .008,
          ), petal.transformNode.position);
        });
      },
      onBodyCreated: (can, index) => {
        this.cans[index] = can;
        can.body.setCollisionCallbackEnabled(true);
        can.body.getCollisionObservable().add((event) => {
          if (event.impulse <= .02 || this.hitCans.has(index)
            || (event.collider !== this.target.body && event.collidedAgainst !== this.target.body)) return;
          this.hitCans.add(index);
          this.contacts.push({ time: this.clock, can: index, impulse: event.impulse });
          if (!Number.isFinite(this.impactTime)) {
            this.impactTime = this.clock;
            this.target.body.setMotionType(PhysicsMotionType.DYNAMIC);
            this.target.body.setGravityFactor(1);
            const velocity = this.incoming[index];
            if (!velocity || velocity.lengthSquared() < .001) throw new Error("A measured cassoulet impact needs an incoming can velocity.");
            if (!event.point) throw new Error("A measured cassoulet impact needs a contact point.");
            this.target.body.applyImpulse(velocity.normalizeToNew().scale(event.impulse), event.point);
          }
        });
      },
    };
  }

  walkPose(time: number, position: Vector3, rotation: Quaternion): void {
    const site = cellPosition(TERMINATOR.column, TERMINATOR.row);
    const desired = terminatorPosition(time);
    const world = this.root.computeWorldMatrix(true);
    Vector3.TransformCoordinatesToRef(new Vector3(desired.x - site.x, desired.y - .02, site.z - desired.z), world, position);
    rotation.copyFrom(Quaternion.FromRotationMatrix(world).multiply(Quaternion.RotationYawPitchRoll(Math.PI, 0, 0)));
  }

  damageAt(time: number): number {
    let hits = 0;
    for (const contact of this.contacts) {
      if (contact.time > time) break;
      hits += clamp((time - contact.time) / .12);
    }
    return clamp(hits / TERMINATOR.hitsToDestroy);
  }

  verify(): void {
    if (!Number.isFinite(this.impactTime) || !Number.isFinite(this.destroyTime)) {
      throw new Error(`Cassoulet rescue missed its target: ${this.contacts.length} measured hits; no timed destruction fallback is allowed.`);
    }
  }

  private spawnFragments(): void {
    const target = this.nodes[0];
    const rotation = target.rotationQuaternion!;
    for (let index = 0; index < TERMINATOR.fragments; index++) {
      const node = this.nodes[index + 1];
      const local = new Vector3(Math.sin(index * 2.4) * 2.2, -8 + index % 24 * .72, Math.cos(index * 1.7));
      const offset = local.rotateByQuaternionToRef(rotation, Vector3.Zero());
      node.position.copyFrom(target.position).addInPlace(offset);
      node.rotationQuaternion!.copyFrom(rotation);
      const fragment = new PhysicsAggregate(node, PhysicsShapeType.BOX, {
        mass: .006, friction: .6, restitution: .05, extents: new Vector3(.65, 1, .08),
      }, this.scene);
      fragment.body.setGravityFactor(.18);
      fragment.body.setLinearDamping(.7);
      fragment.body.setAngularDamping(.5);
      fragment.body.setLinearVelocity(new Vector3(Math.sin(index * 2.1) * 3.5, 1.5 + index % 3, Math.cos(index * 1.9) * 3.5));
      fragment.body.setAngularVelocity(new Vector3(index % 3 - 1, Math.sin(index), Math.cos(index)).scale(5));
      this.fragments.push(fragment);
    }
  }

  dispose(): void {
    if (!this.targetReleased) this.target.dispose();
    this.fragments.forEach((fragment) => fragment.dispose());
    this.nodes.forEach((node) => node.dispose());
  }
}
