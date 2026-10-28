import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { XorCpuGate, xorGateColliders, xorPanelPose, xorSymbolPaths } from "./XorCpuGate";
import { LEGACY_XOR, legacyXorSettings, legacyXorState, validateLegacyXorSettings } from "./LegacyXorSequence";
import { legacyAssembly, legacyGroup } from "./ArcadePhysics";
import { cameraPose, routeAnchor } from "../camera/CameraPath";
import { beveledPrism } from "./HardSurface";

vi.mock("./WorldText", async () => {
  const { Mesh } = await import("@babylonjs/core/Meshes/mesh");
  return { createWorldText: (scene: Scene, options: { name: string }) => new Mesh(options.name, scene) };
});

describe("Legacy → XOR deterministic choreography", () => {
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
