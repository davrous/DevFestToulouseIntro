import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { XorCpuGate, xorGateColliders, xorPanelPose, xorSignalPath, xorSymbolPaths } from "./XorCpuGate";
import { LEGACY_XOR, legacyXorSettings, legacyXorState, validateLegacyXorSettings } from "./LegacyXorSequence";
import { legacyAssembly, legacyGroup } from "./ArcadePhysics";
import { cameraPose, routeAnchor } from "../camera/CameraPath";
import { beveledPrism } from "./HardSurface";
import { createLabyrinth } from "./Labyrinth";

vi.mock("./WorldText", async () => {
  const { Mesh } = await import("@babylonjs/core/Meshes/mesh");
  return { createWorldText: (scene: Scene, options: { name: string }) => new Mesh(options.name, scene) };
});

vi.mock("@babylonjs/core/Materials/Textures/dynamicTexture", () => ({
  DynamicTexture: class {
    getContext() {
      return { fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
    }
    update() {}
  },
}));

describe("Legacy → XOR deterministic choreography", () => {
  it("keeps the complete copper surface inside the corridor, clear of the actual architectural solids", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const labyrinth = createLabyrinth(scene);
    const gate = new XorCpuGate(scene, new TransformNode("T root", scene), legacyXorSettings());
    const copper = gate.signal.copper, vertices = copper.getVerticesData("position")!;
    const points = Array.from({ length: vertices.length / 3 }, (_, index) =>
      Vector3.TransformCoordinates(Vector3.FromArray(vertices, index * 3), copper.computeWorldMatrix(true)));
    const tube = copper.getBoundingInfo().boundingBox;
    let minimum = Infinity;
    for (const mesh of labyrinth.meshes.slice(0, 5)) {
      for (const instance of mesh.thinInstanceGetWorldMatrices()) {
        const world = instance.multiply(mesh.computeWorldMatrix(true)), center = world.getTranslation();
        const scale = new Vector3(); world.decompose(scale);
        const half = scale.scale(.5);
        if (center.x + half.x < tube.minimumWorld.x - 1 || center.x - half.x > tube.maximumWorld.x + 1
          || center.y + half.y < tube.minimumWorld.y - 1 || center.y - half.y > tube.maximumWorld.y + 1
          || center.z + half.z < tube.minimumWorld.z - 1 || center.z - half.z > tube.maximumWorld.z + 1) continue;
        const inverse = Matrix.Invert(world);
        for (const point of points) {
          const local = Vector3.TransformCoordinates(point, inverse);
          minimum = Math.min(minimum, Math.hypot(
            Math.max(Math.abs(local.x) - .5, 0) * scale.x,
            Math.max(Math.abs(local.y) - .5, 0) * scale.y,
            Math.max(Math.abs(local.z) - .5, 0) * scale.z));
        }
      }
    }
    expect(minimum).toBeGreaterThan(.25);
    scene.dispose(); engine.dispose();
  });

  it("routes the visible lead around the Tetris wall edge without covering its TODO plaque", () => {
    const anchor = routeAnchor(40), yaw = anchor.yaw;
    const halfX = 3.5 * 2.75 + 1.325, halfZ = 2.15 / 2;
    const extentX = Math.abs(Math.cos(yaw)) * halfX + Math.abs(Math.sin(yaw)) * halfZ;
    const extentZ = Math.abs(Math.sin(yaw)) * halfX + Math.abs(Math.cos(yaw)) * halfZ;
    const wall = { minX: anchor.position.x - extentX, maxX: anchor.position.x + extentX,
      minZ: anchor.position.z - extentZ, maxZ: anchor.position.z + extentZ };
    const transform = Matrix.RotationY(yaw).multiply(Matrix.Translation(anchor.position.x, 0, anchor.position.z));
    const todoCenter = Vector3.TransformCoordinates(new Vector3(5.5, 8.5, -1.15), transform);
    const todoHalfX = Math.abs(Math.cos(yaw)) * 7.7 / 2 + Math.abs(Math.sin(yaw)) * .01;
    const todoHalfZ = Math.abs(Math.sin(yaw)) * 7.7 / 2 + Math.abs(Math.cos(yaw)) * .01;
    const wallLocal = Matrix.RotationY(-yaw);
    const radius = .14;
    const path = xorSignalPath();
    expect(path.length).toBeGreaterThan(100);
    for (const point of path) {
      const local = Vector3.TransformCoordinates(point.subtract(anchor.position), wallLocal);
      const clearance = Math.hypot(Math.max(Math.abs(local.x) - halfX, 0),
        Math.max(Math.abs(local.z) - halfZ, 0));
      expect(clearance).toBeGreaterThan(radius + .6);
      if (point.x + radius >= todoCenter.x - todoHalfX && point.x - radius <= todoCenter.x + todoHalfX
        && point.z + radius >= todoCenter.z - todoHalfZ && point.z - radius <= todoCenter.z + todoHalfZ) {
        expect(point.y + radius).toBeLessThan(7.925);
      }
    }
    expect(path[0].x).toBeLessThan(wall.minX - 2.5);
    expect(path.at(-1)!.x).toBeCloseTo(LEGACY_XOR.exitX - .85);
    expect(path.at(-1)!.y).toBeCloseTo(16.4);
  });

  it("pre-stages protruding copper and follows the packet with sparks through its arrival at the door", () => {
    const engine = new NullEngine(), scene = new Scene(engine), settings = legacyXorSettings();
    const gate = new XorCpuGate(scene, new TransformNode("T root", scene), settings);
    const meshes = scene.meshes.length, arrival = LEGACY_XOR.impact + settings.signalDuration;
    gate.update(0);
    expect(gate.signal.copper.isEnabled()).toBe(true);
    expect(gate.signal.glow.isEnabled()).toBe(false);
    expect(gate.chargeSpark.isEnabled()).toBe(false);
    gate.update(LEGACY_XOR.impact);
    expect(gate.spark.position.x).toBeLessThan(routeAnchor(40).position.x - 1.5);
    expect(gate.spark.isEnabled()).toBe(true);
    expect(gate.chargeSpark.position).toEqual(gate.spark.position);
    gate.update(arrival - .2);
    expect(gate.chargeSpark.isEnabled()).toBe(true);
    const nearDoor = gate.chargeSpark.position.clone();
    gate.update(arrival + .1);
    expect(gate.chargeSpark.isEnabled()).toBe(true);
    expect(gate.chargeSpark.position.y).toBeCloseTo(16.4);
    expect(gate.chargeSpark.position.x).toBeCloseTo(LEGACY_XOR.exitX - .85);
    expect(Vector3.Distance(nearDoor, gate.chargeSpark.position)).toBeGreaterThan(0);
    const pose = gate.chargeSpark.position.clone(), scale = gate.chargeSpark.scaling.clone(), alpha = gate.chargeSpark.alpha;
    gate.update(arrival + .35);
    expect(gate.chargeSpark.isEnabled()).toBe(false);
    gate.update(0); gate.update(arrival + .1);
    expect(gate.chargeSpark.position).toEqual(pose);
    expect(gate.chargeSpark.scaling).toEqual(scale);
    expect(gate.chargeSpark.alpha).toBe(alpha);
    expect(scene.meshes).toHaveLength(meshes);
    settings.enableXorCpuGate = false; gate.update(40);
    expect(gate.signal.copper.isEnabled()).toBe(false);
    expect(gate.chargeSpark.isEnabled()).toBe(false);
    scene.dispose(); engine.dispose();
  });

  it("partitions the original 48 homes into 12 staggered L/J tetrominoes", () => {
    const groups = Array.from({ length: 12 }, () => 0), settings = legacyXorSettings();
    for (let index = 0; index < 48; index++) {
      groups[legacyGroup(index)]++;
      expect(legacyAssembly(index, LEGACY_XOR.impact - .001, settings).offset.length()).toBe(0);
    }
    expect(groups).toEqual(Array(12).fill(4));
    const directions = [0, 3, 4, 7].map((index) => legacyAssembly(index, 34.4, settings).offset.normalize().asArray());
    expect(new Set(directions.map((direction) => JSON.stringify(direction))).size).toBeGreaterThanOrEqual(3);
    expect(() => validateLegacyXorSettings(settings)).not.toThrow();
    expect(() => validateLegacyXorSettings({ ...settings, openingDuration: 4 })).toThrow();
    expect(() => validateLegacyXorSettings({ ...settings, signalOffset: .4, signalDuration: 3.6 })).toThrow();
  });

  it("waits for the impact packet, powers the XOR, then retracts four distinct solid panels before crossing", () => {
    const settings = legacyXorSettings();
    expect(legacyXorState(38.199, settings).signalActive).toBe(false);
    expect(legacyXorState(38.2, settings).signalActive).toBe(true);
    expect(legacyXorState(40, settings).power).toBe(0);
    expect(legacyXorState(41.5, settings).signal).toBe(1);
    expect(legacyXorState(42.59, settings).open).toBe(0);
    expect(legacyXorState(45.7, settings).open).toBeCloseTo(1);
    for (let index = 0; index < 4; index++) {
      const closed = xorPanelPose(index, 0, settings), open = xorPanelPose(index, 1, settings);
      expect(Math.abs(open.position.x)).toBeGreaterThan(Math.abs(closed.position.x));
      expect(Math.abs(open.position.y - LEGACY_XOR.centerY)).toBeGreaterThan(Math.abs(closed.position.y - LEGACY_XOR.centerY));
      expect(open.position.z).toBeGreaterThan(6);
      expect(open.rotation.equals(closed.rotation)).toBe(false);
    }
    const paths = xorSymbolPaths();
    expect(paths).toHaveLength(7);
    expect(paths[2]).toHaveLength(31);
    expect(paths[3][0].x).toBeLessThan(paths[2][0].x);
    expect(paths[2][15].x - paths[3][15].x).toBeCloseTo(.4);
  });

  it("builds outward-facing beveled caps instead of hollow inverted boxes", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const mesh = beveledPrism("test solid", [[-1, -1], [1, -1], [1, 1], [-1, 1]], 1, .1, scene);
    const normals = mesh.getVerticesData("normal")!;
    expect(normals[2]).toBeCloseTo(-1);
    const data = mesh.getBoundingInfo().boundingBox;
    expect(data.minimum.asArray()).toEqual([-1, -1, -.5]);
    expect(data.maximum.asArray()).toEqual([1, 1, .5]);
    scene.dispose(); engine.dispose();
  });

  it("keeps all four animated collision boxes aligned with the real carriages throughout opening and tuning", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const settings = legacyXorSettings(), gate = new XorCpuGate(scene, new TransformNode("T root", scene), settings);
    for (const tuning of [{ ...settings }, { ...settings, gateX: settings.gateX + .1, gateYaw: settings.gateYaw + .002,
      gateY: .03, gateScale: .99, panelTravel: 3, hingeAngle: 80, openingDuration: 3 }]) {
      Object.assign(settings, tuning);
      const colliders = xorGateColliders(tuning), shutters = colliders.filter((collider) => collider.pose);
      expect(colliders).toHaveLength(8);
      expect(shutters).toHaveLength(4);
      for (const time of [38.2, 42.6, 43, 44.15, 45, 45.7, 46.2]) {
        gate.update(time);
        for (const [index, collider] of shutters.entries()) {
          const pose = collider.pose!(time - LEGACY_XOR.impact), panel = gate.panels[index];
          const world = panel.computeWorldMatrix(true), scale = Vector3.Zero(), rotation = pose.rotation.clone();
          world.decompose(scale, rotation);
          expect(Vector3.Distance(panel.getAbsolutePosition(), pose.position)).toBeLessThan(.0001);
          expect(Math.abs(rotation.dot(pose.rotation))).toBeCloseTo(1, 6);
          expect(collider.extents.asArray()).toEqual(
            [LEGACY_XOR.halfWidth, LEGACY_XOR.halfHeight, LEGACY_XOR.thickness].map((value) => value * tuning.gateScale));
        }
      }
    }
    expect(xorGateColliders({ ...settings, enableXorCpuGate: false })).toEqual([]);
    scene.dispose(); engine.dispose();
  });

  it("keeps all moving metal within the lateral housing and the unmodified camera's near-plane safety envelope clear", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    new FreeCamera("Gate test camera", Vector3.Zero(), scene);
    const settings = legacyXorSettings(), gate = new XorCpuGate(scene, new TransformNode("T root", scene), settings);
    expect(gate.panels).toHaveLength(4);
    const shapes = gate.root.getChildMeshes().filter((mesh): mesh is Mesh =>
      mesh instanceof Mesh && mesh.material instanceof PBRMaterial).map((mesh) => {
      const data = mesh.getVerticesData("position")!, min = new Vector3(Infinity, Infinity, Infinity), max = min.negate();
      for (let index = 0; index < data.length; index += 3) {
        min.minimizeInPlaceFromFloats(data[index], data[index + 1], data[index + 2]);
        max.maximizeInPlaceFromFloats(data[index], data[index + 1], data[index + 2]);
      }
      return { mesh, min, max };
    });
    let minimum = Infinity;
    for (let frame = 0; frame <= 120; frame++) {
      const time = 43 + frame / 20; gate.update(time);
      gate.root.computeWorldMatrix(true);
      gate.leaves.forEach((leaf) => leaf.computeWorldMatrix(true));
      for (const panel of gate.panels) {
        panel.computeWorldMatrix(true);
        const box = panel.getBoundingInfo().boundingBox;
        for (const point of box.vectorsWorld) {
          expect(point.y).toBeGreaterThan(0);
          expect(point.y).toBeLessThan(32.85);
          expect(Math.abs(point.z - LEGACY_XOR.exitZ)).toBeLessThan(13.25);
          const local = Vector3.TransformCoordinates(point, Matrix.Invert(gate.root.getWorldMatrix()));
          expect(local.z).toBeGreaterThan(-1.75);
        }
      }
      const pose = cameraPose(time), forward = pose.target.subtract(pose.position).normalize();
      const right = Vector3.Cross(Vector3.UpReadOnly, forward).normalize(), up = Vector3.Cross(forward, right).normalize();
      const near = pose.position.add(forward.scale(.15)), half = Math.tan(pose.fov / 2) * .15;
      const samples = [pose.position, ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) =>
        near.add(right.scale(sx * half * 16 / 9)).add(up.scale(sy * half))))];
      for (const { mesh, min, max } of shapes) {
        const world = mesh.computeWorldMatrix(true);
        const instances = mesh.hasThinInstances ? mesh.thinInstanceGetWorldMatrices() : [Matrix.Identity()];
        for (const instance of instances) {
          const transform = instance.multiply(world), inverse = Matrix.Invert(transform);
          const scale = new Vector3(), q = gate.leaves[0].rotationQuaternion!.clone();
          transform.decompose(scale, q);
          for (const sample of samples) {
            const point = Vector3.TransformCoordinates(sample, inverse);
            const distance = Math.hypot(Math.max(min.x - point.x, 0, point.x - max.x) * scale.x,
              Math.max(min.y - point.y, 0, point.y - max.y) * scale.y,
              Math.max(min.z - point.z, 0, point.z - max.z) * scale.z);
            minimum = Math.min(minimum, distance);
          }
        }
      }
    }
    expect(minimum).toBeGreaterThan(.6);
    const counts = [scene.meshes.length, scene.transformNodes.length, scene.materials.length, scene.lights.length];
    const snapshot = () => gate.leaves.map((leaf) => [...leaf.position.asArray(), ...leaf.rotationQuaternion!.asArray()]);
    gate.update(44.2); const before = snapshot();
    for (let loop = 0; loop < 10; loop++) for (const time of [180, 0, 37, 39, 44.2]) gate.update(time);
    expect(snapshot()).toEqual(before);
    expect([scene.meshes.length, scene.transformNodes.length, scene.materials.length, scene.lights.length]).toEqual(counts);
    settings.enableXorCpuGate = false; gate.update(44);
    expect(gate.root.isEnabled()).toBe(false);
    expect(gate.light.intensity).toBe(0);
    expect(gate.keyLight.intensity).toBe(0);
    expect(routeAnchor(40).position.x).toBeCloseTo(-554.4);
    scene.dispose(); engine.dispose();
  });
});
