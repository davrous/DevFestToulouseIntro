import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsMotionType, PhysicsPrestepType, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import type { Scene } from "@babylonjs/core/scene";
import { routeAnchor } from "../camera/CameraPath";
import { floorVisibility, FLOOR_STATION_TIMES, spectrumBarHeight } from "./ShowLighting";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";

export const BALL_PHASES = [0, 1.8, 3.6, 5.4, 7.2, 9, 10.8] as const;
export const RUGBY_BALL_INDEX = 3;
export const BALL_LIFETIME = 20;
const BALL_PERIOD = 22;
const PLATFORM_COUNT = 12;
const SILENCE = silentFeatures();
const anchors = FLOOR_STATION_TIMES.map((time) => routeAnchor(time));

export function ballAge(time: number, phase: number): number {
  return ((time + 10 - phase) % BALL_PERIOD + BALL_PERIOD) % BALL_PERIOD;
}

export function platformHeight(time: number, station: number, lane: number, audio: AudioFeatures): number {
  return .18 + spectrumBarHeight(time, station, lane, audio);
}

export function ballImpulse(time: number, index: number, lane: number, audio: AudioFeatures): Vector3 {
  const band = [audio.bass, Math.max(audio.mid, audio.violaEnergy),
    Math.max(audio.treble, audio.violaEnergy * .6)][lane + 1];
  const shimmer = Math.sin(index * 47 + Math.floor(time * 6) * 13);
  return new Vector3(shimmer * (.4 + band * .8), 7 + band * 4 + audio.kick * 4,
    Math.cos(index * 29 + Math.floor(time * 6)) * band * .6);
}

function laneAnchor(time: number, lane: number): Vector3 {
  const { position, yaw } = routeAnchor(Math.min(150, time));
  return position.add(new Vector3(Math.cos(yaw) * lane * 6.5, 0, -Math.sin(yaw) * lane * 6.5));
}

function ballMaterial(scene: Scene, name: string, color: string): PBRMaterial {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = Color3.FromHexString(color);
  material.emissiveColor = material.albedoColor.scale(.28);
  material.metallic = .25;
  material.roughness = .35;
  return material;
}

export class BouncingBalls {
  private readonly balls: TransformNode[] = [];
  private readonly bodies: PhysicsAggregate[] = [];
  private readonly platforms: { node: TransformNode; aggregate: PhysicsAggregate }[] = [];
  private plugin?: HavokPlugin;
  private lastTime: number | undefined;
  private readonly lastPush = BALL_PHASES.map(() => -Infinity);

  constructor(scene: Scene) {
    const shell = ballMaterial(scene, "FX/Rugby leather", "#ae573a");
    shell.metallic = 0;
    shell.roughness = .65;
    const stitching = ballMaterial(scene, "FX/Rugby stitching", "#f4e6ca");
    const mint = ballMaterial(scene, "FX/Data ball mint", "#7bffe0");
    const violet = ballMaterial(scene, "FX/Data ball violet", "#c4abff");
    for (let index = 0; index < BALL_PHASES.length; index++) {
      const root = new TransformNode(index === RUGBY_BALL_INDEX ? "FX/Toulouse rugby ball" : `FX/Bouncing data ball ${index}`, scene);
      const body = MeshBuilder.CreateSphere(`FX/Ball body ${index}`, { diameter: 1, segments: 16 }, scene);
      body.parent = root;
      body.isPickable = false;
      if (index === RUGBY_BALL_INDEX) {
        body.scaling.set(1.45, 1.45, 2.5);
        body.material = shell;
        for (const sign of [-1, 1]) {
          const stripe = MeshBuilder.CreateTorus(`FX/Rugby stripe ${sign}`, { diameter: 1.1, thickness: .07, tessellation: 24 }, scene);
          stripe.rotation.x = Math.PI / 2;
          stripe.position.z = sign * .8;
          stripe.material = stitching;
          stripe.parent = root;
          stripe.isPickable = false;
        }
        for (let lace = -1; lace <= 1; lace++) {
          const stitch = MeshBuilder.CreateBox(`FX/Rugby lace ${lace}`, { width: .3, height: .035, depth: .055 }, scene);
          stitch.position.set(0, .73, lace * .2);
          stitch.material = stitching;
          stitch.parent = root;
          stitch.isPickable = false;
        }
      } else {
        body.scaling.setAll(1.5);
        body.material = index % 2 === 0 ? mint : violet;
      }
      this.balls.push(root);
      root.setEnabled(false);
    }
  }

  initialize(scene: Scene, plugin: HavokPlugin): void {
    this.plugin = plugin;
    const floor = new TransformNode("FX/Physics floor", scene);
    floor.position.y = -.12;
    this.bodies.push(...this.balls.map((ball, index) => new PhysicsAggregate(ball,
      index === RUGBY_BALL_INDEX ? PhysicsShapeType.CAPSULE : PhysicsShapeType.SPHERE,
      index === RUGBY_BALL_INDEX
        ? { mass: 1, friction: .4, restitution: .8, radius: .72,
          pointA: new Vector3(0, 0, -.53), pointB: new Vector3(0, 0, .53) }
        : { mass: 1, friction: .35, restitution: .82, radius: .75 }, scene)));
    for (const body of this.bodies) {
      body.body.setMotionType(PhysicsMotionType.ANIMATED);
      body.body.setPrestepType(PhysicsPrestepType.TELEPORT);
    }
    new PhysicsAggregate(floor, PhysicsShapeType.BOX, {
      mass: 0, friction: .5, restitution: .75, extents: new Vector3(1600, .24, 900),
    }, scene);
    for (let slot = 0; slot < PLATFORM_COUNT; slot++) {
      for (let lane = 0; lane < 3; lane++) {
        const node = new TransformNode(`FX/Physics spectrum ${slot}/${lane}`, scene);
        node.position.y = -100;
        const aggregate = new PhysicsAggregate(node, PhysicsShapeType.BOX, {
          mass: 0, friction: .45, restitution: .9, extents: new Vector3(1.55, .24, 2),
        }, scene);
        aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
        aggregate.body.setPrestepType(PhysicsPrestepType.TELEPORT);
        this.platforms.push({ node, aggregate });
      }
    }
  }

  update(time: number, audio: AudioFeatures, speed = 1): void {
    const plugin = this.plugin;
    if (!plugin || !this.bodies.length) return;
    const reset = this.lastTime === undefined || time < this.lastTime || time - this.lastTime > .3;
    const moving = !reset && time > this.lastTime!;
    this.lastTime = time;
    const firstStation = Math.max(0, Math.min(anchors.length - PLATFORM_COUNT, Math.floor((time - 9) / 3)));
    for (let slot = 0; slot < PLATFORM_COUNT; slot++) {
      const index = firstStation + slot;
      const { position, yaw } = anchors[index];
      for (let lane = 0; lane < 3; lane++) {
        const { node, aggregate } = this.platforms[slot * 3 + lane];
        const x = (lane - 1) * 6.5;
        node.position.set(position.x + Math.cos(yaw) * x,
          platformHeight(time, FLOOR_STATION_TIMES[index], lane, audio) - .12,
          position.z - Math.sin(yaw) * x);
        node.rotationQuaternion = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
        if (reset) plugin.setPhysicsBodyTransformation(aggregate.body, node);
        else aggregate.body.setTargetTransform(node.position, node.rotationQuaternion);
      }
    }
    for (let index = 0; index < this.balls.length; index++) {
      const ball = this.balls[index];
      const body = this.bodies[index].body;
      const age = ballAge(time, BALL_PHASES[index]);
      const lane = index % 3 - 1;
      const active = floorVisibility(time) > 0 && age < BALL_LIFETIME && time + 7 + age * .7 < 150;
      ball.setEnabled(active);
      if (!active) {
        body.setMotionType(PhysicsMotionType.ANIMATED);
        ball.position.set(0, -100 - index * 3, 0);
        plugin.setPhysicsBodyTransformation(body, ball);
        continue;
      }
      const goal = laneAnchor(time + 7 + age * .7, lane);
      const cycle = Math.floor((time + 10 - BALL_PHASES[index]) / BALL_PERIOD);
      if (reset || ball.metadata !== cycle || ball.position.y < .45 || ball.position.y > 15
        || Vector3.DistanceSquared(ball.position, goal) > 500) {
        const spawn = goal.clone();
        spawn.y = 2.3 + (index % 3) * .5;
        body.setMotionType(PhysicsMotionType.ANIMATED);
        ball.position.copyFrom(spawn);
        ball.rotationQuaternion = Quaternion.Identity();
        plugin.setPhysicsBodyTransformation(body, ball);
        ball.metadata = cycle;
        body.setMotionType(PhysicsMotionType.DYNAMIC);
        body.setLinearVelocity(Vector3.Zero());
        body.setAngularVelocity(new Vector3(index % 2 ? 2 : -2, .4, 1));
        this.lastPush[index] = time;
      }
      const velocity = body.getLinearVelocity();
      const next = laneAnchor(time + 8 + age * .7, lane);
      const forward = next.subtract(goal);
      const steering = goal.subtract(ball.position).scale(.75);
      const horizontal = forward.add(steering).scaleInPlace(speed);
      horizontal.y = 0;
      if (horizontal.length() > 27 * speed) horizontal.normalize().scaleInPlace(27 * speed);
      body.setLinearVelocity(new Vector3(horizontal.x, velocity.y, horizontal.z));
      const nearBar = this.platforms.some(({ node }, slot) => slot % 3 === lane + 1
        && Math.abs(node.position.x - ball.position.x) < 2.4
        && Math.abs(node.position.z - ball.position.z) < 2.6
        && ball.position.y < node.position.y + 1.6);
      if (moving && time - this.lastPush[index] > .85 && (nearBar || ball.position.y < 1.1)) {
        body.applyImpulse(ballImpulse(time, index, lane, nearBar ? audio : SILENCE).scaleInPlace(speed), ball.position);
        this.lastPush[index] = time;
      }
    }
  }
}
