import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsMotionType, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import type { Scene } from "@babylonjs/core/scene";
import { routeAnchor } from "../camera/CameraPath";
import { cueEnvelope } from "../content/cues";
import { BoxBatch } from "./Instances";
import { createWorldText } from "./WorldText";
import { emissive } from "./Labyrinth";

export const BUFFER_OVERFLOW = {
  anchor: 119, start: 109.5, spill: 113.2, signEnd: 116.8, end: 119,
  height: 10, width: 14, count: 32,
} as const;

export function overflowPhysicsActive(time: number): boolean {
  return time >= BUFFER_OVERFLOW.spill && time < BUFFER_OVERFLOW.end;
}

interface Byte { mesh: Mesh; home: Vector3; velocity: Vector3; body?: PhysicsAggregate }

export class DigitalOverflow {
  private readonly root: TransformNode;
  private readonly label: Mesh;
  private readonly bytes: Byte[] = [];
  private plugin?: HavokPlugin;
  private previous?: number;
  private released = false;

  constructor(private readonly scene: Scene) {
    const anchor = routeAnchor(BUFFER_OVERFLOW.anchor);
    this.root = new TransformNode("Digital / overflowing ring buffer", scene);
    this.root.position.set(anchor.position.x, 0, anchor.position.z);
    this.root.rotation.y = anchor.yaw;
    const steel = new PBRMaterial("Digital / buffer chassis", scene);
    steel.albedoColor = Color3.FromHexString("#284452");
    steel.emissiveColor = Color3.FromHexString("#182d36");
    steel.metallic = .55;
    steel.roughness = .45;
    const chassis = new BoxBatch("Digital / buffer capacity rack", steel);
    for (const side of [-1, 1]) chassis.add(side * 8.3, 6, .4, .3, 12, .4);
    chassis.add(0, 9.5, .4, 17, .25, .4);
    chassis.add(-4.5, .6, 0, 5.6, 1.2, 5);
    for (const side of [-1, 1]) chassis.add(-4.5 + side * 2.8, 3, 1.5, .25, 5, 2);
    const rack = chassis.build(scene);
    rack.unfreezeWorldMatrix();
    rack.parent = this.root;
    this.label = createWorldText(scene, {
      name: "Digital / BUFFER OVERFLOW", width: BUFFER_OVERFLOW.width, height: 4.4,
      background: "#0c1f2b", border: "#ffc383",
      lines: [
        { text: "BUFFER OVERFLOW", color: "#ffc383" },
        { text: "console.log('just one more...')", color: "#baf5e6" },
      ],
    });
    this.label.parent = this.root;
    this.label.position.set(0, BUFFER_OVERFLOW.height, -.1);
    const colors = ["#8de5df", "#ffc383"].map((color, index) =>
      emissive(scene, `Digital / byte ${index ? "overflow" : "memory"}`, color, 1.05));
    for (let index = 0; index < BUFFER_OVERFLOW.count; index++) {
      const mesh = MeshBuilder.CreateBox(`Digital / overflowing byte ${index}`, { size: .9 }, scene);
      mesh.material = colors[index % 4 ? 0 : 1];
      mesh.isPickable = false;
      mesh.rotationQuaternion = Quaternion.Identity();
      const local = new Vector3(-6.15 + index % 4 * 1.1, 4 + Math.floor(index / 8),
        (Math.floor(index / 4) % 2 - .5) * 1.1);
      const home = this.root.position.add(new Vector3(
        Math.cos(anchor.yaw) * local.x + Math.sin(anchor.yaw) * local.z, local.y,
        -Math.sin(anchor.yaw) * local.x + Math.cos(anchor.yaw) * local.z));
      const lateral = 1.5 + index % 4 * .5;
      const forward = -1.5 - index % 3 * .5;
      const velocity = new Vector3(
        Math.cos(anchor.yaw) * lateral + Math.sin(anchor.yaw) * forward, 2 + index % 3,
        -Math.sin(anchor.yaw) * lateral + Math.cos(anchor.yaw) * forward);
      mesh.position.copyFrom(home);
      mesh.setEnabled(false);
      this.bytes.push({ mesh, home, velocity });
    }
    this.update(0);
  }

  initialize(plugin: HavokPlugin): void {
    this.plugin = plugin;
    const floor = new TransformNode("Digital / buffer spill floor", this.scene);
    floor.position.copyFrom(this.root.position);
    floor.position.y = -.2;
    floor.rotation.y = this.root.rotation.y;
    new PhysicsAggregate(floor, PhysicsShapeType.BOX, {
      mass: 0, friction: .7, restitution: .2, extents: new Vector3(28, .4, 30),
    }, this.scene);
    const tray = new TransformNode("Digital / buffer tray collider", this.scene);
    tray.parent = this.root;
    tray.position.set(-4.5, .6, 0);
    new PhysicsAggregate(tray, PhysicsShapeType.BOX, {
      mass: 0, friction: .65, restitution: .2, extents: new Vector3(5.6, 1.2, 5),
    }, this.scene);
  }

  private clear(): void {
    for (const byte of this.bytes) {
      byte.body?.dispose();
      byte.body = undefined;
      byte.mesh.setEnabled(false);
    }
    this.released = false;
  }

  update(time: number, speed = 1): void {
    this.root.setEnabled(time >= 95 && time < 121);
    this.label.visibility = cueEnvelope(time, BUFFER_OVERFLOW.start, BUFFER_OVERFLOW.signEnd, .45);
    const seek = this.previous === undefined || time < this.previous || time - this.previous > .3;
    this.previous = time;
    if (seek || time < BUFFER_OVERFLOW.start || time >= BUFFER_OVERFLOW.end) this.clear();
    if (time < BUFFER_OVERFLOW.start || time >= BUFFER_OVERFLOW.end) return;
    const falling = time >= BUFFER_OVERFLOW.spill;
    for (const [index, byte] of this.bytes.entries()) {
      byte.mesh.setEnabled(true);
      if (!byte.body && this.plugin) {
        const elapsed = Math.max(0, time - BUFFER_OVERFLOW.spill);
        byte.mesh.position.copyFrom(byte.home).addInPlace(byte.velocity.scale(elapsed));
        byte.mesh.position.y = Math.max(.46, byte.mesh.position.y - 8.5 * elapsed * elapsed);
        byte.mesh.rotationQuaternion!.copyFrom(Quaternion.RotationYawPitchRoll(this.root.rotation.y, 0, 0));
        byte.body = new PhysicsAggregate(byte.mesh, PhysicsShapeType.BOX,
          { mass: .6, friction: .65, restitution: .22 }, this.scene);
        byte.body.body.setMotionType(falling ? PhysicsMotionType.DYNAMIC : PhysicsMotionType.ANIMATED);
        if (falling) {
          byte.body.body.setLinearVelocity(new Vector3(byte.velocity.x,
            byte.mesh.position.y <= .46 ? 0 : byte.velocity.y - 17 * elapsed, byte.velocity.z).scale(speed));
          byte.body.body.setAngularVelocity(new Vector3((index % 3 - 1) * 2, .8, 1.5).scale(speed));
        }
      }
      if (falling && !this.released && byte.body) {
        byte.body.body.setMotionType(PhysicsMotionType.DYNAMIC);
        if (!seek) byte.body.body.setLinearVelocity(byte.velocity.scale(speed));
        byte.body.body.setAngularVelocity(new Vector3((index % 3 - 1) * 2, .8, 1.5).scale(speed));
      }
    }
    if (falling) this.released = true;
  }
}
