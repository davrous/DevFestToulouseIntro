import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import type { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import type { Scene } from "@babylonjs/core/scene";
import { routeAnchor } from "../camera/CameraPath";
import { clamp, smoothstep } from "../engine/Timeline";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { createWorldText } from "./WorldText";
import { bakeRigidBodies, samplePhysicsBake, type PhysicsBake, type BakedColliderRecipe } from "./PhysicsBake";
import { LEGACY_XOR, legacyXorSettings, type LegacyXorSettings } from "./LegacyXorSequence";
import { beveledPrism } from "./HardSurface";
import "@babylonjs/core/Rendering/boundingBoxRenderer";

export const WALL_TIME = LEGACY_XOR.impact;
export const WALL_COUNT = 48;
export const LEGACY_CUBE = { width: 2.65, height: 3.35, depth: 2.15 } as const;
export const LEGACY_LABELS = ["TODO", "FIXME", "deprecated", "legacy.dll", "tech debt", "v1_final_FINAL"] as const;
const PALETTE = ["#ff365c", "#ffba32", "#35d69c", "#3088ff", "#9d55ff", "#ff59c4"];

interface Prop { mesh: Mesh; home: Vector3; homeRotation: Quaternion; group: number }

export function arcadeWallVisible(time: number): boolean { return time >= 34.4; }

export function legacyGroup(index: number): number {
  const col = index % 8, row = Math.floor(index / 8), x = col % 4;
  const upper = row % 2 === 1;
  return Math.floor(row / 2) * 4 + Math.floor(col / 4) * 2 + (upper ? (x === 3 ? 1 : 0) : (x === 0 ? 0 : 1));
}

export function legacyAssembly(index: number, time: number, settings: LegacyXorSettings) {
  const group = legacyGroup(index), start = WALL_TIME - settings.assemblyLead + group * settings.stagger;
  const progress = clamp((time - start) / (.9 / settings.assemblySpeed));
  const ease = smoothstep(progress), remaining = 1 - ease;
  const style = group % 4;
  const offset = new Vector3(style === 0 ? -42 : style === 1 ? 42 : 0,
    style === 2 ? 38 : 4, style === 3 ? 48 : 0).scale(remaining);
  if (style === 3) offset.x -= 42 * remaining;
  const snap = progress > .85 && progress < 1 ? Math.sin((progress - .85) / .15 * Math.PI) * .12 : 0;
  offset.y += snap;
  return { offset, progress, group, lock: Math.exp(-Math.max(0, time - start - .9 / settings.assemblySpeed) * 13)
    * (progress === 1 ? 1 : 0) };
}

export class ArcadePhysics {
  readonly wall: Prop[] = [];
  readonly labels: Mesh[] = [];
  readonly banners: Mesh[] = [];
  readonly materials: PBRMaterial[] = [];
  readonly fallback: PBRMaterial;
  bake?: PhysicsBake;
  state: "parked" | "assembling" | "locked" | "cached Havok" = "parked";
  private readonly rotation = Quaternion.Identity();
  private readonly offset = Vector3.Zero();
  private readonly anchor = routeAnchor(40);
  private readonly matrix = Matrix.RotationY(this.anchor.yaw)
    .multiply(Matrix.Translation(this.anchor.position.x, 0, this.anchor.position.z));

  constructor(private readonly scene: Scene, readonly settings = legacyXorSettings()) {
    this.fallback = new PBRMaterial("Arcade / technical debt", scene);
    this.fallback.albedoColor = Color3.FromHexString("#495164");
    this.fallback.emissiveColor = Color3.FromHexString("#af537b").scale(.22);
    this.fallback.alpha = .55; this.fallback.metallic = .3; this.fallback.roughness = .65;
    for (let group = 0; group < 12; group++) {
      const material = new PBRMaterial(`Arcade / Tetris legacy color ${group}`, scene);
      material.albedoColor = Color3.FromHexString(PALETTE[group % PALETTE.length]);
      material.emissiveColor = material.albedoColor.scale(.15);
      material.metallic = .18; material.roughness = .3;
      this.materials.push(material);
    }
    for (let index = 0; index < WALL_COUNT; index++) {
      const col = index % 8, row = Math.floor(index / 8);
      const mesh = beveledPrism(`Arcade / legacy voxel ${index}`,
        [[-1.325, -1.675], [1.325, -1.675], [1.325, 1.675], [-1.325, 1.675]], 2.15, .12, scene);
      mesh.position.copyFrom(Vector3.TransformCoordinates(new Vector3((col - 3.5) * 2.75, 1.75 + row * 3.45, 0), this.matrix));
      mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(this.anchor.yaw, 0, 0);
      const group = legacyGroup(index); mesh.material = this.materials[group];
      this.wall.push({ mesh, home: mesh.position.clone(), homeRotation: mesh.rotationQuaternion.clone(), group });
      mesh.setEnabled(false);
    }
    for (const [label, text] of LEGACY_LABELS.entries()) {
      const cube = this.wall[[33, 38, 42, 44, 9, 14][label]].mesh;
      const mesh = createWorldText(scene, { name: `Arcade / code label ${text}`, width: 2.42, height: 1.2,
        background: "#111827", lines: [{ text, color: "#fff5d5" }] });
      mesh.parent = cube; mesh.position.z = -1.095; this.labels.push(mesh);
    }
    for (const message of ["BUILD FAILED", "LEGACY CODE"] as const) {
      const mesh = createWorldText(scene, { name: `Arcade / wall ${message}`, width: 17, height: 3.1,
        background: "#260d22", border: "#ff3b64", lines: [{ text: message, color: "#ff6287", size: 125 }] });
      mesh.position.copyFrom(Vector3.TransformCoordinates(new Vector3(0, 12.15, -1.13), this.matrix));
      mesh.rotation.y = this.anchor.yaw; mesh.setEnabled(false); this.banners.push(mesh);
    }
    const todo = createWorldText(scene, { name: "Arcade / TODO remove wall", width: 7.7, height: 1.15,
      background: "#151a22", lines: [{ text: "// TODO: remove this wall", color: "#ffdc6b" }] });
    todo.position.copyFrom(Vector3.TransformCoordinates(new Vector3(5.5, 8.5, -1.15), this.matrix));
    todo.rotation.y = this.anchor.yaw; todo.setEnabled(false); this.banners.push(todo);
  }

  initialize(_plugin: HavokPlugin): void {
    if (this.bake) return;
    const parent = new TransformNode("Arcade / temporary wall bake origin", this.scene);
    const colliders: BakedColliderRecipe[] = [
      { position: new Vector3(-560, -.25, -65), extents: new Vector3(125, .5, 145), friction: .7, restitution: .35 },
    ];
    for (const side of [-1, 1]) {
      const p = this.anchor.position.add(new Vector3(Math.cos(this.anchor.yaw) * side * 12.8, 0,
        -Math.sin(this.anchor.yaw) * side * 12.8)); p.y = 12;
      colliders.push({ position: p, extents: new Vector3(.5, 24, 25), friction: .6, restitution: .3,
        rotation: Quaternion.RotationYawPitchRoll(this.anchor.yaw, 0, 0) });
    }
    try {
      const recipes = this.wall.map((prop, index) => {
        const sign = index % 2 ? 1 : -1, spread = (index % 8 - 3.5) / 3.5;
        return { release: 0, position: prop.home.clone(), rotation: prop.homeRotation.clone(),
          velocity: new Vector3(7 + index % 3, 3 + index % 5, spread * 5 + sign),
          angularVelocity: new Vector3(sign * 2, 1 + index % 3, sign * 3) };
      });
      this.bake = bakeRigidBodies(this.scene, parent, recipes, LEGACY_XOR.wallBakeEnd - WALL_TIME, 1 / 60,
        PhysicsShapeType.BOX, { mass: 1.6, friction: .55, restitution: .32,
          extents: new Vector3(LEGACY_CUBE.width, LEGACY_CUBE.height, LEGACY_CUBE.depth) }, colliders);
    } finally { parent.dispose(); }
  }

  update(time: number, _audio: AudioFeatures): void {
    if (!Number.isFinite(time)) throw new RangeError("Legacy wall time must be finite.");
    const visible = arcadeWallVisible(time) && (this.settings.enableLegacyWallAssembly || time >= 35);
    const physical = time >= WALL_TIME;
    const lastLock = WALL_TIME - this.settings.assemblyLead + 11 * this.settings.stagger + .9 / this.settings.assemblySpeed;
    this.state = !visible ? "parked" : physical ? "cached Havok"
      : !this.settings.enableLegacyWallAssembly || time >= lastLock ? "locked" : "assembling";
    for (const [index, prop] of this.wall.entries()) {
      prop.mesh.setEnabled(visible);
      prop.mesh.showBoundingBox = this.settings.colliders && visible;
      if (!visible) {
        if (physical && this.bake) samplePhysicsBake(this.bake, index, time - WALL_TIME, prop.mesh.position, prop.mesh.rotationQuaternion!);
        else {
          prop.mesh.position.copyFrom(prop.home);
          prop.mesh.rotationQuaternion!.copyFrom(prop.homeRotation);
        }
        continue;
      }
      prop.mesh.material = this.settings.enableLegacyWallAssembly ? this.materials[prop.group] : this.fallback;
      if (physical) {
        if (!this.bake) throw new Error("Legacy destruction must be baked by Havok before playback.");
        samplePhysicsBake(this.bake, index, time - WALL_TIME, prop.mesh.position, prop.mesh.rotationQuaternion!);
      } else {
        const assembly = legacyAssembly(index, time, this.settings);
        this.offset.copyFrom(assembly.offset);
        Vector3.TransformNormalToRef(this.offset, this.matrix, this.offset);
        prop.mesh.position.copyFrom(prop.home).addInPlace(this.settings.enableLegacyWallAssembly ? this.offset : Vector3.ZeroReadOnly);
        Quaternion.RotationYawPitchRollToRef(this.anchor.yaw, 0,
          this.settings.enableLegacyWallAssembly ? (1 - assembly.progress) * (prop.group % 2 ? .18 : -.18) : 0, this.rotation);
        prop.mesh.rotationQuaternion!.copyFrom(this.rotation);
      }
    }
    for (let group = 0; group < 12; group++) {
      const index = this.wall.findIndex((prop) => prop.group === group);
      const pulse = legacyAssembly(index, time, this.settings).lock;
      this.materials[group].emissiveColor.copyFrom(this.materials[group].albedoColor)
        .scaleInPlace(.16 + pulse * .32 * this.settings.emission);
    }
    this.labels.forEach((mesh, index) => mesh.setEnabled(this.settings.labelMode === "all"
      || (this.settings.labelMode === "minimal" && index < 2)));
    this.banners.forEach((mesh, index) => mesh.setEnabled(visible && time >= lastLock && time < WALL_TIME
      && this.settings.labelMode !== "none" && (index === 2 || mesh.name.endsWith(this.settings.wallMessage))));
  }
}
