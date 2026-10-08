import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsMotionType, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import type { Scene } from "@babylonjs/core/scene";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { interiorPosition, routeAnchor } from "../camera/CameraPath";
import { CINEMA } from "../content/showBeats";
import { smoothstep } from "../engine/Timeline";

export const POPCORN_START = CINEMA.popcorn;
export const POPCORN_END = CINEMA.popcornEnd;
export const POPCORN_PER_BUCKET = 36;
export const POPCORN_COUNT = POPCORN_PER_BUCKET * 2;
export const CINEMA_FLOOR_TOP = .28;
export const POPCORN_SOURCES = [
  { side: -1, time: 80.4, lateral: -5, height: 18, size: 4.8 },
  { side: 1, time: 80.4, lateral: 5, height: 18, size: 4.8 },
] as const;
type PopcornSource = typeof POPCORN_SOURCES[number];

export function popcornTilt(time: number, side: number): number {
  return side * (.1 + smoothstep((time - CINEMA.popcornTip) / (POPCORN_START - CINEMA.popcornTip)) * 1.25);
}

export function popcornReleaseTime(index: number): number {
  return POPCORN_START + Math.floor(index / 6) * .12;
}

function spillPosition(source: PopcornSource, index: number): Vector3 {
  const anchor = routeAnchor(source.time, source.lateral);
  const rim = Vector3.TransformCoordinates(new Vector3(0, source.size / 2, 0),
    Matrix.RotationZ(popcornTilt(POPCORN_START, source.side)));
  rim.x += (index % 6 - 2.5) * .9;
  rim.z += (Math.floor(index / 6) % 2 - .5) * 1.1;
  return Vector3.TransformCoordinates(rim, Matrix.RotationY(anchor.yaw))
    .add(new Vector3(anchor.position.x, source.height, anchor.position.z));
}

function spillVelocity(home: Vector3, release: number, index: number): Vector3 {
  const downward = -1.8 - index % 3 * .2;
  const cameraHeight = interiorPosition(release + .9).y;
  const fall = (downward + Math.sqrt(downward * downward + 34 * (home.y - cameraHeight))) / 17;
  // Keep half the rain overhead and half visible ahead of the forward-facing camera.
  const target = interiorPosition(release + fall + (index % 2 ? 2.1 : 0));
  return new Vector3((target.x - home.x) / fall, downward, (target.z - home.z) / fall);
}

interface Kernel {
  mesh: Mesh;
  home: Vector3;
  release: number;
  velocity: Vector3;
  physics?: PhysicsAggregate;
}

export class CinemaPopcorn {
  private readonly kernels: Kernel[] = [];
  private plugin?: HavokPlugin;
  private previous?: number;

  constructor(private readonly scene: Scene) {
    const cream = new PBRMaterial("Cinema / popcorn ivory", scene);
    cream.albedoColor = Color3.FromHexString("#fff0c0");
    cream.emissiveColor = Color3.FromHexString("#f8c581").scale(.25);
    cream.roughness = .7;
    for (let index = 0; index < POPCORN_COUNT; index++) {
      const localIndex = index % POPCORN_PER_BUCKET;
      const source = POPCORN_SOURCES[Math.floor(index / POPCORN_PER_BUCKET)];
      const mesh = MeshBuilder.CreateIcoSphere(`Cinema / popcorn kernel ${index}`,
        { radius: .3 + localIndex % 4 * .04, subdivisions: 1 }, scene);
      mesh.material = cream;
      mesh.isPickable = false;
      const home = spillPosition(source, localIndex);
      const release = popcornReleaseTime(localIndex);
      mesh.position.copyFrom(home);
      mesh.setEnabled(false);
      this.kernels.push({ mesh, home, release, velocity: spillVelocity(home, release, localIndex) });
    }
  }

  initialize(plugin: HavokPlugin): void {
    this.plugin = plugin;
    const anchor = routeAnchor(POPCORN_SOURCES[0].time);
    const auditorium = routeAnchor(CINEMA.davidGate);
    const floor = new TransformNode("Cinema / popcorn invisible floor", this.scene);
    floor.position.set(auditorium.position.x + Math.sin(auditorium.yaw) * 5,
      CINEMA_FLOOR_TOP - .2, auditorium.position.z + Math.cos(auditorium.yaw) * 5);
    floor.rotation.y = auditorium.yaw;
    new PhysicsAggregate(floor, PhysicsShapeType.BOX,
      { mass: 0, friction: .7, restitution: .35, extents: new Vector3(27, .4, 90) }, this.scene);
    for (const side of [-1, 1]) {
      const wall = new TransformNode(`Cinema / aisle wall collider ${side}`, this.scene);
      wall.position.set(floor.position.x + Math.cos(auditorium.yaw) * side * 13, 15,
        floor.position.z - Math.sin(auditorium.yaw) * side * 13);
      wall.rotation.y = auditorium.yaw;
      new PhysicsAggregate(wall, PhysicsShapeType.BOX,
        { mass: 0, friction: .55, restitution: .25, extents: new Vector3(.5, 30, 90) }, this.scene);
      const ledge = new TransformNode(`Cinema / seat ledge collider ${side}`, this.scene);
      ledge.position.set(anchor.position.x + Math.cos(anchor.yaw) * side * 10, 2,
        anchor.position.z - Math.sin(anchor.yaw) * side * 10);
      ledge.rotation.y = anchor.yaw;
      new PhysicsAggregate(ledge, PhysicsShapeType.BOX,
        { mass: 0, friction: .55, restitution: .48, extents: new Vector3(3, .8, 25) }, this.scene);
    }
  }

  update(time: number, audio: AudioFeatures, speed = 1): void {
    if (!this.plugin) return;
    const seek = this.previous === undefined || time < this.previous || time - this.previous > .3;
    this.previous = time;
    if (seek) {
      for (const kernel of this.kernels) {
        kernel.physics?.dispose();
        kernel.physics = undefined;
        kernel.mesh.setEnabled(false);
      }
    }
    if (time < POPCORN_START || time >= POPCORN_END) {
      for (const kernel of this.kernels) {
        kernel.mesh.setEnabled(false);
        kernel.physics?.dispose();
        kernel.physics = undefined;
      }
      return;
    }
    for (const [index, kernel] of this.kernels.entries()) {
      if (time < kernel.release || kernel.physics) continue;
      const elapsed = time - kernel.release;
      kernel.mesh.setEnabled(true);
      kernel.mesh.position.copyFrom(kernel.home).addInPlace(kernel.velocity.scale(elapsed));
      const radius = .3 + index % 4 * .04;
      const floorHeight = CINEMA_FLOOR_TOP + radius;
      kernel.mesh.position.y = Math.max(floorHeight, kernel.mesh.position.y - elapsed * elapsed * 8.5);
      kernel.mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(index * .7, index * .3, 0);
      kernel.physics = new PhysicsAggregate(kernel.mesh, PhysicsShapeType.SPHERE,
        { mass: .17, friction: .48, restitution: .55, radius }, this.scene);
      const body = kernel.physics.body;
      body.setMotionType(PhysicsMotionType.DYNAMIC);
      body.setLinearVelocity(new Vector3(kernel.velocity.x,
        kernel.mesh.position.y <= floorHeight ? 0 : kernel.velocity.y - 17 * elapsed,
        kernel.velocity.z).scale(speed));
      body.setAngularVelocity(new Vector3(index % 3, 2 + index % 4 + audio.kick, index % 5).scale(speed));
    }
  }
}
