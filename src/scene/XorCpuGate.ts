import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Path3D } from "@babylonjs/core/Maths/math.path";
import type { Scene } from "@babylonjs/core/scene";
import { clamp } from "../engine/Timeline";
import { routeAnchor } from "../camera/CameraPath";
import { BoxBatch } from "./Instances";
import { emissive } from "./Labyrinth";
import { createWorldText } from "./WorldText";
import { beveledPrism } from "./HardSurface";
import { LEGACY_XOR, legacyXorState, type LegacyXorSettings } from "./LegacyXorSequence";
import { CircuitSignal } from "../effects/CircuitSignal";
import type { BakedColliderRecipe } from "./PhysicsBake";

export const XOR_PANEL_SIGNS = [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const;
export const XOR_CHASSIS_BOXES = [
  { position: [-12.05, 16.25, -2], extents: [2.1, 32.5, .45] },
  { position: [12.05, 16.25, -2], extents: [2.1, 32.5, .45] },
  { position: [0, 30.95, -2], extents: [25.8, 3.5, .45] },
  { position: [0, 1.25, -2], extents: [25.8, 2.5, .45] },
] as const;

export function xorPanelPose(index: number, opening: number, settings: LegacyXorSettings) {
  const [sx, sy] = XOR_PANEL_SIGNS[index];
  const open = clamp(opening);
  return {
    position: new Vector3(sx * (LEGACY_XOR.halfWidth / 2 + settings.panelTravel * open),
      LEGACY_XOR.centerY + sy * (LEGACY_XOR.halfHeight / 2 + settings.panelLift * open),
      settings.panelDepthTravel * open),
    rotation: Quaternion.RotationYawPitchRoll(sx * settings.hingeAngle * Math.PI / 180 * open, 0, 0),
  };
}

export function xorGateColliders(settings: LegacyXorSettings): BakedColliderRecipe[] {
  if (!settings.enableXorCpuGate) return [];
  const scale = new Vector3(settings.gateScale, settings.gateScale, settings.gateScale);
  const rotation = Quaternion.RotationYawPitchRoll(settings.gateYaw, 0, 0);
  const world = Matrix.Compose(scale, rotation, new Vector3(settings.gateX, settings.gateY, settings.gateZ));
  const chassis = XOR_CHASSIS_BOXES.map((box, index): BakedColliderRecipe => ({
    name: `XOR collision / chassis ${index}`,
    position: Vector3.TransformCoordinates(Vector3.FromArray(box.position), world),
    rotation, extents: Vector3.FromArray(box.extents).scale(settings.gateScale), friction: .55, restitution: .55,
  }));
  const panels = XOR_PANEL_SIGNS.map((_, index): BakedColliderRecipe => {
    const pose = (elapsed: number) => {
      const local = xorPanelPose(index, legacyXorState(LEGACY_XOR.impact + elapsed, settings).open, settings);
      return { position: Vector3.TransformCoordinates(local.position, world), rotation: rotation.multiply(local.rotation) };
    };
    return { name: `XOR collision / shutter ${index}`, ...pose(0), pose,
      extents: new Vector3(LEGACY_XOR.halfWidth, LEGACY_XOR.halfHeight, LEGACY_XOR.thickness).scale(settings.gateScale),
      friction: .55, restitution: .55 };
  });
  return [...chassis, ...panels];
}

function curve(points: readonly Vector3[], steps = 30): Vector3[] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps, s = 1 - t;
    return points[0].scale(s ** 3).add(points[1].scale(3 * s * s * t))
      .add(points[2].scale(3 * s * t * t)).add(points[3].scale(t ** 3));
  });
}

export function xorSignalPath(): Vector3[] {
  const wall = routeAnchor(40).position;
  const frontX = wall.x - 5;
  const z = LEGACY_XOR.exitZ - 12.1;
  const edgeZ = z;
  const rightX = wall.x + 5;
  const start = new Vector3(frontX, 7.2, wall.z);
  const frontEdge = new Vector3(frontX, 7.2, edgeZ);
  const rightEdge = new Vector3(rightX, 7.2, edgeZ);
  const wallClear = new Vector3(wall.x + 9.5, 7.5, z);
  const approach = new Vector3(wall.x + 11.5, 9.5, z);
  const gateRun = new Vector3(LEGACY_XOR.exitX - 2, 9.5, z);
  const gateRise = new Vector3(LEGACY_XOR.exitX - 1.3, 11.5, z);
  const gateTop = new Vector3(LEGACY_XOR.exitX - .85, 16.4, z + 1);
  const gateEnd = new Vector3(LEGACY_XOR.exitX - .85, 16.4, LEGACY_XOR.exitZ - 3.4);
  const segments = [
    curve([start, new Vector3(frontX, 7.2, wall.z - 5), new Vector3(frontX, 7.2, edgeZ + 5), frontEdge], 24),
    curve([frontEdge, new Vector3(frontX, 7.2, edgeZ - .6),
      new Vector3(rightX - 1.5, 7.2, edgeZ), rightEdge], 16),
    curve([rightEdge, new Vector3(rightX + 1.5, 7.2, edgeZ),
      new Vector3(wall.x + 6.5, 7.5, z - .4), wallClear], 16),
    curve([wallClear, new Vector3(wall.x + 9, 7.5, z),
      new Vector3(wall.x + 9, 9.5, z), approach], 12),
    curve([approach, approach.add(new Vector3(5, 0, 0)),
      gateRun.subtract(new Vector3(5, 0, 0)), gateRun], 24),
    curve([gateRun, gateRun.add(new Vector3(.35, 0, 0)),
      gateRise.subtract(new Vector3(.2, 1.5, 0)), gateRise], 12),
    curve([gateRise, gateRise.add(new Vector3(.15, 1.5, 0)),
      gateTop.subtract(new Vector3(0, 0, 1)), gateTop], 12),
    curve([gateTop, gateTop.add(new Vector3(0, 0, 2)),
      gateEnd.subtract(new Vector3(0, 0, 2)), gateEnd], 16),
  ];
  return segments.flatMap((segment, index) => index === 0 ? segment : segment.slice(1));
}

export function xorSymbolPaths(): Vector3[][] {
  const v = (x: number, y: number) => new Vector3(x, y, 0);
  return [
    curve([v(-1.25, 1.05), v(.1, 1.2), v(.95, .9), v(1.7, 0)]),
    curve([v(1.7, 0), v(.95, -.9), v(.1, -1.2), v(-1.25, -1.05)]),
    curve([v(-1.25, -1.05), v(-.7, -.5), v(-.7, .5), v(-1.25, 1.05)]),
    curve([v(-1.65, -1.05), v(-1.1, -.5), v(-1.1, .5), v(-1.65, 1.05)]),
    [v(-2.2, -.55), v(-1.05, -.55)], [v(-2.2, .55), v(-1.05, .55)],
    [v(1.7, 0), v(2.2, 0)],
  ];
}

export class XorCpuGate {
  readonly root: TransformNode;
  readonly panels: Mesh[] = [];
  readonly leaves: TransformNode[] = [];
  readonly signal: CircuitSignal;
  readonly panelCircuits: CircuitSignal[] = [];
  readonly symbol: Mesh;
  readonly logicModule: Mesh;
  readonly aperture: Mesh;
  readonly light: PointLight;
  readonly keyLight: PointLight;
  readonly spark;
  readonly chargeSpark;
  private readonly signalPath: Path3D;
  state;
  private readonly symbolMaterial: StandardMaterial;
  private readonly status: Mesh;
  private readonly latches: Mesh[] = [];
  private readonly moduleRods: Mesh[] = [];
  private readonly metal: PBRMaterial;
  private readonly gold: PBRMaterial;
  private readonly cyan: StandardMaterial;

  constructor(scene: Scene, parent: TransformNode, readonly settings: LegacyXorSettings) {
    this.root = new TransformNode("Arcade / XOR CPU mechanical gate", scene);
    this.root.parent = parent;
    this.metal = new PBRMaterial("XOR CPU / graphite titanium", scene);
    this.metal.albedoColor = Color3.FromHexString("#26303b"); this.metal.metallic = .82; this.metal.roughness = .3;
    this.metal.maxSimultaneousLights = 5;
    this.metal.emissiveColor.set(.012, .018, .025);
    const armor = new PBRMaterial("XOR CPU / brushed armor", scene);
    armor.albedoColor = Color3.FromHexString("#52616d"); armor.metallic = .78; armor.roughness = .36;
    armor.maxSimultaneousLights = 5;
    this.gold = new PBRMaterial("XOR CPU / copper and gold", scene);
    this.gold.albedoColor = Color3.FromHexString(settings.copperColor); this.gold.metallic = .76; this.gold.roughness = .28;
    this.gold.maxSimultaneousLights = 5;
    this.cyan = emissive(scene, "FX/XOR CPU / aperture backlight", settings.signalColor, .1);
    const fixed = new BoxBatch("XOR CPU / layered chassis", this.metal);
    const copper = new BoxBatch("XOR CPU / frame bus bars", this.gold);
    const vents = new BoxBatch("XOR CPU / processor heat sinks", armor);
    const rim = new BoxBatch("FX/XOR CPU / recessed aperture light", this.cyan);
    for (const box of XOR_CHASSIS_BOXES) {
      const [x, y, z] = box.position, [width, height, depth] = box.extents;
      fixed.add(x, y, z, width, height, depth);
    }
    for (const sx of [-1, 1]) {
      copper.add(sx * 12.19, 16.1, -2.3, .16, 29.8, .14);
      rim.add(sx * 11.9, 16.1, 1.15, .12, 29.4, .18);
      for (let row = 0; row < 24; row++) vents.add(sx * 12.75, 1.2 + row * 1.3, -2.27, .67, .22, .4);
    }
    copper.add(0, 31.38, -2.3, 24.3, .15, .14);
    rim.add(0, 31.15, 1.15, 23.8, .12, .18);
    for (const batch of [fixed, copper, vents, rim]) {
      const mesh = batch.build(scene); mesh.unfreezeWorldMatrix(); mesh.parent = this.root;
    }
    for (const [index, [sx, sy]] of XOR_PANEL_SIGNS.entries()) {
      const leaf = new TransformNode(`XOR CPU / ${sy > 0 ? "upper" : "lower"} ${sx < 0 ? "left" : "right"} carriage`, scene);
      leaf.parent = this.root; this.leaves.push(leaf);
      const w = LEGACY_XOR.halfWidth, h = LEGACY_XOR.halfHeight;
      const armorOutline: Array<readonly [number, number]> = [
        [-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2 - .7],
        [w / 2 - .7, h / 2], [-w / 2 + .7, h / 2], [-w / 2, h / 2 - .7],
      ];
      const outline: Array<readonly [number, number]> = [[-w / 2, -h / 2], [w / 2, -h / 2],
        [w / 2, h / 2], [-w / 2, h / 2]];
      const panel = beveledPrism(`XOR CPU / thick angular shutter ${index}`, outline, LEGACY_XOR.thickness, .18, scene);
      panel.parent = leaf; panel.material = this.metal; this.panels.push(panel);
      const inset = beveledPrism(`XOR CPU / inset armor ${index}`,
        armorOutline.map(([x, y]) => [x * .88, y * .92]), .22, .07, scene);
      inset.parent = leaf; inset.position.z = -.63; inset.material = armor;
      const wing = beveledPrism(`XOR CPU / diagonal titanium wing ${index}`,
        [[-5.3, -5.7], [-2.4, -7], [5.1, .2], [5.4, 5.8], [3, 6.9], [-5.1, -.8]]
          .map(([x, y]) => [x * sx, y * sy]), .36, .12, scene);
      wing.parent = leaf; wing.position.z = -.83; wing.material = armor;
      const screws = new BoxBatch(`XOR CPU / fasteners ${index}`, this.gold);
      for (const x of [-4.7, 4.7]) for (const y of [-6.4, 6.4]) screws.add(x, y, -1.08, .25, .25, .15, Math.PI / 4);
      const bolts = screws.build(scene); bolts.unfreezeWorldMatrix(); bolts.parent = leaf;
      const paths = Array.from({ length: 3 }, (_, branch) => [
        new Vector3(sx * 5.5, sy * (6.4 - branch * 1.7), -1.12),
        new Vector3(sx * (3.4 - branch * .4), sy * (6.4 - branch * 1.7), -1.12),
        new Vector3(sx * (2.6 - branch * .4), sy * (5.6 - branch * 1.7), -1.12),
        new Vector3(sx * (2.6 - branch * .4), sy * 1.4, -1.12),
        new Vector3(sx * .6, sy * .4, -1.12),
      ]);
      paths.push([[-5.3, -5.7], [-2.4, -7], [5.1, .2], [5.4, 5.8], [3, 6.9], [-5.1, -.8], [-5.3, -5.7]]
        .map(([x, y]) => new Vector3(x * sx, y * sy, -1.08)));
      this.panelCircuits.push(new CircuitSignal(scene, `XOR CPU / panel PCB ${index}`, paths, .065, leaf));
      const pose = xorPanelPose(index, 1, settings);
      const closed = xorPanelPose(index, 0, settings);
      const railPath = [new Vector3(sx * 12.6, closed.position.y, 1.1),
        new Vector3(sx * 12.8, pose.position.y, 10.5)];
      const rail = MeshBuilder.CreateTube(`XOR CPU / diagonal carriage rail ${index}`, { path: railPath, radius: .18, tessellation: 8 }, scene);
      rail.material = armor; rail.parent = this.root; rail.isPickable = false;
      const latch = MeshBuilder.CreateBox(`XOR CPU / retracting lock pin ${index}`, { width: .5, height: .75, depth: .6 }, scene);
      latch.parent = leaf; latch.position.set(-sx * 1.3, -sy * 6.7, -1.2); latch.material = this.gold;
      this.latches.push(latch);
    }
    const module = beveledPrism("XOR CPU / central logic chip",
      [[-3.6, -3.1], [3.6, -3.1], [3.6, 2.7], [3.2, 3.1], [-3.2, 3.1], [-3.6, 2.7]], .55, .14, scene);
    module.parent = this.leaves[1]; module.position.set(-LEGACY_XOR.halfWidth / 2, -7.1, -1.08); module.material = this.metal;
    this.logicModule = module;
    for (const y of [-6.25, -7.95]) {
      const rod = MeshBuilder.CreateCylinder("XOR CPU / logic module sliding piston",
        { height: 1, diameter: .22, tessellation: 8 }, scene);
      rod.parent = this.leaves[1]; rod.position.set(-2.8, y, -.7); rod.rotation.x = Math.PI / 2;
      rod.material = this.gold; rod.isPickable = false; this.moduleRods.push(rod);
    }
    const paths = xorSymbolPaths().map((path) => {
      const mesh = MeshBuilder.CreateTube("XOR CPU / symbol curve", { path, radius: .065, tessellation: 8 }, scene);
      return mesh;
    });
    const symbol = Mesh.MergeMeshes(paths, true, true);
    if (!symbol) throw new Error("XOR symbol geometry could not be generated.");
    this.symbol = symbol; symbol.name = "FX/XOR CPU / correct XOR logic symbol";
    symbol.parent = module; symbol.position.set(0, .8, -.33); symbol.scaling.setAll(1.25);
    this.symbolMaterial = emissive(scene, "FX/XOR CPU / XOR energized cyan", settings.signalColor, .08);
    symbol.material = this.symbolMaterial;
    const name = createWorldText(scene, { name: "XOR CPU / logic identifier", width: 3, height: .85,
      background: "#111c25", lines: [{ text: "XOR", color: "#7cefff" }] });
    name.parent = module; name.position.set(0, -1, -.31);
    this.status = createWorldText(scene, { name: "XOR CPU / access granted", width: 6, height: 1.15,
      background: "#09241f", border: "#61ffa2", lines: [{ text: "ACCESS GRANTED", color: "#82ffb1" }] });
    this.status.parent = module; this.status.position.set(0, -2.15, -.31);
    const signalPoints = xorSignalPath();
    this.signalPath = new Path3D(signalPoints);
    this.signal = new CircuitSignal(scene, "XOR CPU / wall-impact circuit", [signalPoints], .14, parent);
    this.spark = MeshBuilder.CreateLineSystem("FX/XOR CPU / wall-impact discharge", {
      lines: Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4;
        return [Vector3.Zero(), new Vector3(Math.cos(angle) * .75, Math.sin(angle) * .75, -.15),
          new Vector3(Math.cos(angle + .18) * 1.15, Math.sin(angle + .18) * 1.15, -.1),
          new Vector3(Math.cos(angle) * 1.9, Math.sin(angle) * 1.9, 0)];
      }),
    }, scene);
    this.spark.parent = parent; this.spark.position.copyFrom(signalPoints[0]);
    this.spark.rotation.y = Math.PI / 2; this.spark.color.set(.1, 1.5, 2); this.spark.isPickable = false;
    this.chargeSpark = this.spark.clone("FX/XOR CPU / travelling electrical sparks", parent);
    this.chargeSpark.color.set(.5, 1.8, 2.5);
    this.aperture = MeshBuilder.CreateBox("Debug / XOR free aperture", { width: 10, height: 18, depth: 1.5 }, scene);
    this.aperture.parent = this.root; this.aperture.position.y = 12;
    const debug = emissive(scene, "Debug / XOR free aperture green", "#5aff8c", .45);
    debug.wireframe = true; this.aperture.material = debug; this.aperture.isPickable = false;
    this.light = new PointLight("XOR CPU / soft passage backlight", new Vector3(0, 17, 3.5), scene);
    this.light.parent = this.root; this.light.diffuse = Color3.FromHexString(settings.signalColor);
    this.light.intensity = 0; this.light.range = 30; this.light.falloffType = PointLight.FALLOFF_PHYSICAL;
    this.light.includedOnlyMeshes = [module, ...this.panels, ...this.leaves.flatMap((node) => node.getChildMeshes())];
    this.keyLight = new PointLight("XOR CPU / warm titanium key", new Vector3(-7, 25, -8), scene);
    this.keyLight.parent = this.root; this.keyLight.diffuse.set(1, .83, .62);
    this.keyLight.range = 42; this.keyLight.falloffType = PointLight.FALLOFF_PHYSICAL;
    this.keyLight.includedOnlyMeshes = this.root.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
    this.keyLight.intensity = 0;
    this.state = legacyXorState(0, settings);
    this.update(0);
  }

  update(time: number): void {
    this.state = legacyXorState(time, this.settings);
    this.root.position.set(this.settings.gateX, this.settings.gateY, this.settings.gateZ);
    this.root.rotation.y = this.settings.gateYaw; this.root.scaling.setAll(this.settings.gateScale);
    this.root.setEnabled(this.settings.enableXorCpuGate && time < LEGACY_XOR.end);
    for (const [index, leaf] of this.leaves.entries()) {
      const pose = xorPanelPose(index, this.state.open, this.settings);
      leaf.position.copyFrom(pose.position); leaf.rotationQuaternion = pose.rotation;
      this.panels[index].showBoundingBox = this.settings.boundingBoxes;
      this.panelCircuits[index].update(clamp((time - this.state.arrival - index * .07) / .95), this.state.power > 0, this.settings);
      this.latches[index].position.z = -1.2 + this.state.latch * .75;
    }
    this.logicModule.position.z = -1.08 - Math.sin(Math.PI * this.state.open) * 3;
    for (const rod of this.moduleRods) {
      const back = this.logicModule.position.z + .275;
      rod.position.z = (back - .575) / 2; rod.scaling.y = -.575 - back;
    }
    this.gold.albedoColor.copyFrom(Color3.FromHexString(this.settings.copperColor));
    this.symbolMaterial.emissiveColor.copyFrom(Color3.FromHexString(this.settings.signalColor))
      .scaleInPlace(.045 + this.state.power * this.settings.emission * 1.6);
    this.cyan.emissiveColor.copyFrom(Color3.FromHexString(this.settings.signalColor))
      .scaleInPlace(.025 + this.state.power * this.settings.emission * .8);
    this.status.setEnabled(this.state.power > .9);
    this.signal.copper.setEnabled(this.root.isEnabled());
    this.signal.update(this.state.signal, this.root.isEnabled() && this.state.signalActive, this.settings);
    const discharge = clamp((time - LEGACY_XOR.impact) / .32);
    this.spark.setEnabled(this.root.isEnabled() && time >= LEGACY_XOR.impact && time < LEGACY_XOR.impact + .32);
    this.spark.scaling.setAll(.3 + discharge * 1.3); this.spark.alpha = (1 - discharge) ** 2;
    const arrivalBurst = clamp((time - this.state.arrival) / .35);
    this.chargeSpark.setEnabled(this.root.isEnabled() && this.state.signalActive && time < this.state.arrival + .35);
    this.chargeSpark.position.copyFrom(this.signalPath.getPointAt(this.state.signal));
    this.chargeSpark.rotation.x = time * 18;
    this.chargeSpark.scaling.setAll(time < this.state.arrival
      ? .22 + .12 * Math.sin(time * 43) ** 2 : .4 + arrivalBurst * 1.4);
    this.chargeSpark.alpha = (1 - arrivalBurst) ** 2;
    this.aperture.setEnabled(this.settings.freeAperture);
    this.light.intensity = this.root.isEnabled() ? this.state.power * 350 : 0;
    this.keyLight.intensity = this.root.isEnabled() ? 45 + this.state.power * 400 : 0;
  }
}
