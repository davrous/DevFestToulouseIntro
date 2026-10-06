import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsMotionType, PhysicsPrestepType, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import type { Scene } from "@babylonjs/core/scene";
import { routeAnchor } from "../camera/CameraPath";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { createWorldText } from "./WorldText";

export const TOKEN_TIME = 30.5;
export const WALL_TIME = 38.2;
const WALL_COUNT = 48;
const TOKEN_COUNT = 26;
const CODE = ["TODO", "FIXME", "LEGACY", "NULL", "ANY", "DEPRECATED", "v1_FINAL_FINAL", "BUILD FAILED"];

interface Prop {
  mesh: Mesh;
  home: Vector3;
  homeRotation: Quaternion;
  aggregate?: PhysicsAggregate;
}

export function arcadePropVisible(time: number, kind: "wall" | "token"): boolean {
  return kind === "wall" ? time >= 35 && time < 41.2 : time >= TOKEN_TIME && time < 36;
}

export class ArcadePhysics {
  private readonly wall: Prop[] = [];
  private readonly tokens: Prop[] = [];
  private plugin?: HavokPlugin;
  private lastTime?: number;
  private wallReleased = false;
  private tokensReleased = false;

  constructor(private readonly scene: Scene) {
    const code = new PBRMaterial("Arcade / technical debt", scene);
    code.albedoColor = Color3.FromHexString("#495164");
    code.emissiveColor = Color3.FromHexString("#af537b").scale(.22);
    code.alpha = .55;
    code.metallic = .3;
    code.roughness = .65;
    const gold = new PBRMaterial("Arcade / bonus tokens", scene);
    gold.albedoColor = Color3.FromHexString("#ffcb66");
    gold.emissiveColor = Color3.FromHexString("#ffad45").scale(.6);
    gold.metallic = .78;
    gold.roughness = .23;
    const wallAnchor = routeAnchor(40);
    const wallTransform = Matrix.RotationY(wallAnchor.yaw)
      .multiply(Matrix.Translation(wallAnchor.position.x, 0, wallAnchor.position.z));
    for (let index = 0; index < WALL_COUNT; index++) {
      const column = index % 8;
      const row = Math.floor(index / 8);
      const mesh = MeshBuilder.CreateBox(`Arcade / legacy voxel ${index}`,
        { width: 2.65, height: 3.35, depth: 2.15 }, scene);
      mesh.position.copyFrom(Vector3.TransformCoordinates(
        new Vector3((column - 3.5) * 2.75, 1.75 + row * 3.45, 0), wallTransform));
      mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(wallAnchor.yaw, 0, 0);
      mesh.material = code;
      mesh.isPickable = false;
      if (row === 2 && column < CODE.length) {
        const label = createWorldText(scene, {
          name: `Arcade / debt label ${column}`, width: 2.45, height: 1.2,
          background: "#24222f", lines: [{ text: CODE[column], color: "#ffbdb4" }],
        });
        label.parent = mesh;
        label.position.set(0, 0, -1.09);
      }
      this.wall.push({ mesh, home: mesh.position.clone(), homeRotation: mesh.rotationQuaternion.clone() });
      mesh.setEnabled(false);
    }
    const tokenAnchor = routeAnchor(32.5);
    const tokenTransform = Matrix.RotationY(tokenAnchor.yaw)
      .multiply(Matrix.Translation(tokenAnchor.position.x, 0, tokenAnchor.position.z));
    for (let index = 0; index < TOKEN_COUNT; index++) {
      const mesh = MeshBuilder.CreateCylinder(`Arcade / bonus token ${index}`,
        { diameter: 1.25, height: .18, tessellation: 12 }, scene);
      mesh.position.copyFrom(Vector3.TransformCoordinates(new Vector3(
        (index % 7 - 3) * .7, 11 + Math.floor(index / 7) * .65,
        (index % 4 - 2) * .4), tokenTransform));
      mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, Math.PI / 2);
      mesh.material = gold;
      mesh.isPickable = false;
      this.tokens.push({ mesh, home: mesh.position.clone(), homeRotation: mesh.rotationQuaternion.clone() });
      mesh.setEnabled(false);
    }
  }

  initialize(plugin: HavokPlugin): void {
    this.plugin = plugin;
    const floor = new TransformNode("Arcade / invisible collision floor", this.scene);
    floor.position.set(-560, -.25, -65);
    new PhysicsAggregate(floor, PhysicsShapeType.BOX, {
      mass: 0, friction: .7, restitution: .35, extents: new Vector3(125, .5, 145),
    }, this.scene);
    for (const [time, width] of [[32, 18], [40, 25]]) {
      const anchor = routeAnchor(time);
      for (const side of [-1, 1]) {
        const rail = new TransformNode(`Arcade / invisible collision rail ${time} / ${side}`, this.scene);
        const offset = new Vector3(Math.cos(anchor.yaw) * side * 12.8, 0,
          -Math.sin(anchor.yaw) * side * 12.8);
        rail.position.copyFrom(anchor.position).addInPlace(offset);
        rail.position.y = 12;
        rail.rotation.y = anchor.yaw;
        new PhysicsAggregate(rail, PhysicsShapeType.BOX, {
          mass: 0, friction: .6, restitution: .3, extents: new Vector3(.5, 24, width),
        }, this.scene);
      }
    }
  }

  private park(props: Prop[], dispose: boolean): void {
    for (const prop of props) {
      prop.mesh.setEnabled(false);
      if (dispose) {
        prop.aggregate?.dispose();
        prop.aggregate = undefined;
      } else if (prop.aggregate && this.plugin) {
        prop.aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
        prop.mesh.position.set(0, -200, 0);
        this.plugin.setPhysicsBodyTransformation(prop.aggregate.body, prop.mesh);
      }
    }
  }

  private arm(props: Prop[], shape: PhysicsShapeType, elapsed: number, wall: boolean): void {
    if (!this.plugin) return;
    const yaw = routeAnchor(wall ? 40 : 32.5).yaw;
    for (const [index, prop] of props.entries()) {
      prop.mesh.setEnabled(true);
      prop.mesh.position.copyFrom(prop.home);
      prop.mesh.rotationQuaternion!.copyFrom(prop.homeRotation);
      if (elapsed > 0) {
        const side = (index % 8 - 3.5) / 3.5;
        const displacement = new Vector3(side * (wall ? 4 : 2) * elapsed,
          Math.max(1 - prop.home.y, (wall ? 4 : 8) * elapsed - 8.5 * elapsed * elapsed),
          (wall ? 7 : 3) * elapsed);
        prop.mesh.position.addInPlace(Vector3.TransformNormal(displacement, Matrix.RotationY(yaw)));
        prop.mesh.rotationQuaternion!.multiplyInPlace(Quaternion.RotationYawPitchRoll(
          elapsed * (index % 2 ? 1 : -1), elapsed * .8, elapsed * .5));
      }
      prop.aggregate ??= new PhysicsAggregate(prop.mesh, shape,
        { mass: shape === PhysicsShapeType.BOX ? 1.6 : .35, friction: .55, restitution: .32 },
        this.scene);
      prop.aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
      prop.aggregate.body.setPrestepType(PhysicsPrestepType.TELEPORT);
      this.plugin.setPhysicsBodyTransformation(prop.aggregate.body, prop.mesh);
    }
  }

  private release(props: Prop[], audio: AudioFeatures, wall: boolean): void {
    for (const [index, prop] of props.entries()) {
      if (!prop.aggregate) continue;
      const sign = index % 2 ? 1 : -1;
      const spread = (index % 8 - 3.5) / 3.5;
      const impulse = 1 + audio.drop * .55 + audio.kick * .12;
      prop.aggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
      const velocity = wall
        ? new Vector3(7 + index % 3, 3 + index % 5, (spread * 5 + sign) * impulse)
        : new Vector3(sign * (2 + index % 4), 6 + index % 6, 3 + index % 3);
      prop.aggregate.body.setLinearVelocity(velocity.scaleInPlace(impulse));
      prop.aggregate.body.setAngularVelocity(new Vector3(sign * 2, 1 + index % 3, sign * 3));
    }
  }

  update(time: number, audio: AudioFeatures): void {
    if (!this.plugin) return;
    const seek = this.lastTime === undefined || time < this.lastTime || time - this.lastTime > .3;
    this.lastTime = time;
    if (seek) {
      this.park(this.wall, false);
      this.park(this.tokens, false);
      this.wallReleased = false;
      this.tokensReleased = false;
    }
    if (arcadePropVisible(time, "wall")) {
      if (!this.wall[0].mesh.isEnabled()) this.arm(this.wall, PhysicsShapeType.BOX,
        Math.max(0, time - WALL_TIME), true);
      if (!this.wallReleased && (time >= WALL_TIME || (time >= 37.5 && audio.drop > .6))) {
        this.release(this.wall, audio, true);
        this.wallReleased = true;
      }
    } else this.park(this.wall, time >= 41.2);
    if (arcadePropVisible(time, "token")) {
      if (!this.tokens[0].mesh.isEnabled()) this.arm(this.tokens, PhysicsShapeType.CYLINDER,
        Math.max(0, time - TOKEN_TIME), false);
      if (!this.tokensReleased) {
        this.release(this.tokens, audio, false);
        this.tokensReleased = true;
      }
    } else this.park(this.tokens, time >= 36);
  }
}
