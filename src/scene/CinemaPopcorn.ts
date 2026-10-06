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
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { routeAnchor } from "../camera/CameraPath";
import { CINEMA } from "../content/showBeats";

export const POPCORN_START = CINEMA.popcorn;
export const POPCORN_END = CINEMA.popcornEnd;
export const POPCORN_COUNT = 36;
export const CINEMA_FLOOR_TOP = .28;
export const POPCORN_SOURCE = { time: 79.5, lateral: -5, height: 11.5, size: 4.8 } as const;

function spillPosition(): Vector3 {
  const anchor = routeAnchor(POPCORN_SOURCE.time, POPCORN_SOURCE.lateral);
  return anchor.position.add(new Vector3(Math.cos(anchor.yaw) * 2.5,
    POPCORN_SOURCE.height + .1 - anchor.position.y, -Math.sin(anchor.yaw) * 2.5));
}

function spillVelocity(index: number, impact: number): Vector3 {
  const { yaw } = routeAnchor(POPCORN_SOURCE.time);
  const lateral = (2.5 + index % 6 * .6) * impact;
  const forward = (index % 7 - 3) * .85;
  return new Vector3(Math.cos(yaw) * lateral + Math.sin(yaw) * forward,
    -1.5 - index % 4 * .5, -Math.sin(yaw) * lateral + Math.cos(yaw) * forward);
}

interface Kernel { mesh: Mesh; home: Vector3; physics?: PhysicsAggregate }

export class CinemaPopcorn {
  private readonly kernels: Kernel[] = [];
  private plugin?: HavokPlugin;
  private previous?: number;
  private released = false;

  constructor(private readonly scene: Scene) {
    const cream = new PBRMaterial("Cinema / popcorn ivory", scene);
    cream.albedoColor = Color3.FromHexString("#fff0c0");
    cream.emissiveColor = Color3.FromHexString("#f8c581").scale(.25);
    cream.roughness = .7;
    const anchor = spillPosition();
    for (let index = 0; index < POPCORN_COUNT; index++) {
      const mesh = MeshBuilder.CreateIcoSphere(`Cinema / popcorn kernel ${index}`,
        { radius: .35 + index % 4 * .07, subdivisions: 1 }, scene);
      mesh.material = cream;
      mesh.isPickable = false;
      const home = anchor.add(new Vector3((index % 6 - 2.5) * .22,
        Math.floor(index / 6) * .15, (index % 5 - 2) * .22));
      mesh.position.copyFrom(home);
      mesh.setEnabled(false);
      this.kernels.push({ mesh, home });
    }
  }

  initialize(plugin: HavokPlugin): void {
    this.plugin = plugin;
    const anchor = routeAnchor(POPCORN_SOURCE.time);
    const floor = new TransformNode("Cinema / popcorn invisible floor", this.scene);
    floor.position.set(anchor.position.x, CINEMA_FLOOR_TOP - .2, anchor.position.z);
    new PhysicsAggregate(floor, PhysicsShapeType.BOX,
      { mass: 0, friction: .7, restitution: .35, extents: new Vector3(27, .4, 35) }, this.scene);
    for (const side of [-1, 1]) {
      const ledge = new TransformNode(`Cinema / seat ledge collider ${side}`, this.scene);
      ledge.position.set(anchor.position.x + Math.cos(anchor.yaw) * side * 10, 2,
        anchor.position.z - Math.sin(anchor.yaw) * side * 10);
      ledge.rotation.y = anchor.yaw;
      new PhysicsAggregate(ledge, PhysicsShapeType.BOX,
        { mass: 0, friction: .55, restitution: .48, extents: new Vector3(3, .8, 25) }, this.scene);
    }
  }

  update(time: number, audio: AudioFeatures): void {
    if (!this.plugin) return;
    const seek = this.previous === undefined || time < this.previous || time - this.previous > .3;
    this.previous = time;
    if (seek) {
      for (const kernel of this.kernels) {
        kernel.physics?.dispose();
        kernel.physics = undefined;
        kernel.mesh.setEnabled(false);
      }
      this.released = false;
    }
    if (time < POPCORN_START || time >= POPCORN_END) {
      for (const kernel of this.kernels) {
        kernel.mesh.setEnabled(false);
        kernel.physics?.dispose();
        kernel.physics = undefined;
      }
      return;
    }
    if (!this.kernels[0].mesh.isEnabled()) {
      const elapsed = Math.max(0, time - POPCORN_START);
      for (const [index, kernel] of this.kernels.entries()) {
        kernel.mesh.setEnabled(true);
        kernel.mesh.position.copyFrom(kernel.home);
        kernel.mesh.position.addInPlace(spillVelocity(index, 1).scale(elapsed));
        kernel.mesh.position.y = Math.max(.6, kernel.mesh.position.y - elapsed * elapsed * 8.5);
        kernel.mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(index * .7, index * .3, 0);
        kernel.physics = new PhysicsAggregate(kernel.mesh, PhysicsShapeType.SPHERE,
          { mass: .17, friction: .48, restitution: .55 }, this.scene);
      }
    }
    if (!this.released) {
      for (const [index, kernel] of this.kernels.entries()) {
        const body = kernel.physics?.body;
        if (!body) continue;
        body.setMotionType(PhysicsMotionType.DYNAMIC);
        const impact = 1 + audio.drop * .35 + audio.kick * .12;
        body.setLinearVelocity(spillVelocity(index, impact));
        body.setAngularVelocity(new Vector3(index % 3, 2 + index % 4, index % 5));
      }
      this.released = true;
    }
  }
}
