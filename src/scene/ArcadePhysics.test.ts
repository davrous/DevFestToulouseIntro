import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { ArcadePhysics, WALL_TIME, arcadeWallVisible } from "./ArcadePhysics";
import { LEGACY_XOR, legacyXorSettings } from "./LegacyXorSequence";
import { xorGateColliders } from "./XorCpuGate";
import { bakeRigidBodies, samplePhysicsBake } from "./PhysicsBake";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsEngine } from "@babylonjs/core/Physics/v2/physicsEngine";

vi.mock("./WorldText", async () => {
  const { Mesh } = await import("@babylonjs/core/Meshes/mesh");
  return { createWorldText: (scene: Scene, options: { name: string }) => new Mesh(options.name, scene) };
});

describe("arcade story physics", () => {
  it("shows only event props, not camera-following balls", () => {
    expect(arcadeWallVisible(0)).toBe(false);
    expect(arcadeWallVisible(34)).toBe(false);
    expect(arcadeWallVisible(35)).toBe(true);
    expect(arcadeWallVisible(41.2)).toBe(true);
    expect(arcadeWallVisible(44)).toBe(true);
    expect(arcadeWallVisible(180)).toBe(true);
  });

  it("assembles the original homes and replays the real Havok collapse without live duplicate bodies", async () => {
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const havok = await HavokPhysics({ wasmBinary });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plugin = new HavokPlugin(true, havok);
    expect(scene.enablePhysics(new Vector3(0, -17, 0), plugin)).toBe(true);
    const physics = scene.getPhysicsEngine();
    if (!(physics instanceof PhysicsEngine)) throw new Error("Havok must provide a v2 physics engine.");
    const arcade = new ArcadePhysics(scene);
    expect(arcade.materials.every((material) => material.alpha === 1)).toBe(true);
    arcade.initialize(plugin);
    expect(arcade.gateContacts.length).toBeGreaterThan(0);
    expect(arcade.gateContacts.some((contact) => contact.cube === 42
      && contact.collider.startsWith("XOR collision / shutter") && contact.impulse > 1)).toBe(true);
    expect(arcade.gateContacts.some((contact) => contact.collider.startsWith("XOR collision / chassis"))).toBe(true);
    expect(physics.getBodies()).toHaveLength(0);
    const silence = silentFeatures();
    const voxel = scene.getMeshByName("Arcade / legacy voxel 0");
    if (!voxel) throw new Error("Arcade physics wall was not created.");
    expect(scene.meshes.some((mesh) => mesh.name.includes("bonus token"))).toBe(false);
    arcade.update(31, silence);
    expect(voxel.isEnabled()).toBe(false);
    arcade.update(35, silence);
    expect(voxel.isEnabled()).toBe(true);
    expect(voxel.physicsBody).toBeFalsy();
    const wallStart = arcade.wall[0].home.clone();
    expect(Vector3.Distance(voxel.position, wallStart)).toBeGreaterThan(1);
    arcade.update(WALL_TIME - .001, silence);
    expect(Vector3.Distance(voxel.position, wallStart)).toBeLessThan(.001);
    arcade.update(WALL_TIME, { ...silence, drop: 1 });
    expect(Vector3.Distance(voxel.position, wallStart)).toBeLessThan(.001);
    for (let index = 0; index < 45; index++) {
      arcade.update(WALL_TIME + (index + 1) / 60, silence);
      scene.getPhysicsEngine()!._step(1 / 60);
    }
    expect(Vector3.Distance(voxel.position, wallStart)).toBeGreaterThan(.4);
    arcade.update(44, silence);
    expect(voxel.isEnabled()).toBe(true);
    expect(voxel.physicsBody).toBeFalsy();
    const parked = voxel.position.asArray();
    arcade.update(0, silence); arcade.update(44, silence);
    expect(voxel.position.asArray()).toEqual(parked);
    arcade.update(40, silence);
    expect(Vector3.Distance(voxel.position, wallStart)).toBeGreaterThan(5);
    const snapshot = arcade.wall.map((prop) => [...prop.mesh.position.asArray(), ...prop.mesh.rotationQuaternion!.asArray()]);
    arcade.update(0, silence); arcade.update(180, silence); arcade.update(40, silence);
    expect(arcade.wall.map((prop) => [...prop.mesh.position.asArray(), ...prop.mesh.rotationQuaternion!.asArray()])).toEqual(snapshot);
    arcade.update(WALL_TIME - .01, silence);
    expect(voxel.isEnabled()).toBe(true);
    expect(Vector3.Distance(voxel.position, wallStart)).toBeLessThan(.001);
    arcade.update(37.7, { ...silence, drop: 1 });
    expect(Vector3.Distance(voxel.position, wallStart)).toBeLessThan(.001);
    expect(arcade.wall.every((prop) => !prop.mesh.physicsBody)).toBe(true);
    expect(arcade.bake?.tracks).toHaveLength(48);
    expect(arcade.bake?.frames).toBe(481);
    for (let frame = 0; frame <= 264; frame++) {
      arcade.update(WALL_TIME + frame / 60, silence);
      for (const prop of arcade.wall) {
        prop.mesh.computeWorldMatrix(true);
        expect(prop.mesh.getBoundingInfo().boundingBox.maximumWorld.x).toBeLessThan(
          LEGACY_XOR.exitX - LEGACY_XOR.thickness / 2 + .1);
      }
    }
    arcade.update(41.2, silence);
    const falling = arcade.wall.map((prop) => prop.mesh.position.clone());
    arcade.update(42.2, silence);
    expect(arcade.wall.some((prop, index) => Vector3.Distance(prop.mesh.position, falling[index]) > .1)).toBe(true);
    arcade.update(LEGACY_XOR.wallBakeEnd - 1, silence);
    const settling = arcade.wall.map((prop) => prop.mesh.position.clone());
    arcade.update(LEGACY_XOR.wallBakeEnd, silence);
    expect(Math.max(...arcade.wall.map((prop, index) =>
      Vector3.Distance(prop.mesh.position, settling[index])))).toBeLessThan(.03);
    const settled = arcade.wall.map((prop) => [...prop.mesh.position.asArray(), ...prop.mesh.rotationQuaternion!.asArray()]);
    for (const time of [49, 80, 180, 0, 180]) {
      arcade.update(time, silence);
      expect(arcade.wall.every((prop) => prop.mesh.isEnabled())).toBe(time >= 34.4);
      if (time >= LEGACY_XOR.wallBakeEnd) {
        expect(arcade.wall.map((prop) => [...prop.mesh.position.asArray(), ...prop.mesh.rotationQuaternion!.asArray()])).toEqual(settled);
      }
    }
    const firstBake = arcade.bake;
    arcade.refreshGateCollisions({ ...arcade.settings, signalColor: "#ffffff" });
    expect(arcade.bake).toBe(firstBake);
    scene.getPhysicsEngine()!.setGravity(new Vector3(0, -68, 0));
    plugin.setVelocityLimits(64, 24);
    arcade.refreshGateCollisions({ ...arcade.settings, openingDuration: 3 });
    expect(arcade.bake).not.toBe(firstBake);
    expect(scene.getPhysicsEngine()!.gravity.y).toBe(-68);
    expect(plugin.getMaxLinearVelocity()).toBe(64);
    expect(plugin.getMaxAngularVelocity()).toBe(24);
    expect(physics.getBodies()).toHaveLength(0);
    arcade.refreshGateCollisions({ ...arcade.settings, enableXorCpuGate: false });
    expect(arcade.gateContacts).toHaveLength(0);
    arcade.update(42.59, silence);
    expect(arcade.wall[42].mesh.position.x).toBeGreaterThan(LEGACY_XOR.exitX);
    arcade.refreshGateCollisions();
    arcade.update(42.59, silence);
    expect(arcade.wall[42].mesh.position.x).toBeLessThan(LEGACY_XOR.exitX - 1);
    expect(scene.transformNodes.some((node) => node.name.startsWith("XOR collision /"))).toBe(false);
    scene.dispose();
    engine.dispose();
  });

  it("physically reflects a projectile off a closed shutter but lets another cross the fully opened gate", async () => {
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const havok = await HavokPhysics({ wasmBinary });
    const engine = new NullEngine(), scene = new Scene(engine);
    scene.enablePhysics(Vector3.Zero(), new HavokPlugin(true, havok));
    const physics = scene.getPhysicsEngine();
    if (!(physics instanceof PhysicsEngine)) throw new Error("Havok must provide a v2 physics engine.");
    const parent = new TransformNode("Gate projectile test origin", scene);
    const recipe = { position: new Vector3(LEGACY_XOR.exitX - 4, 8, LEGACY_XOR.exitZ + 6),
      rotation: Quaternion.Identity(), velocity: new Vector3(10, 0, 0), angularVelocity: Vector3.Zero() };
    const bake = bakeRigidBodies(scene, parent, [{ ...recipe, release: 0 }, { ...recipe, release: 7.5 }],
      8, 1 / 60, PhysicsShapeType.BOX,
      { mass: 1.6, restitution: .32, extents: new Vector3(.4, .4, .4) }, xorGateColliders(legacyXorSettings()));
    const position = Vector3.Zero(), rotation = Quaternion.Identity();
    samplePhysicsBake(bake, 0, .6, position, rotation);
    const rebounded = position.x;
    samplePhysicsBake(bake, 0, .9, position, rotation);
    expect(position.x).toBeLessThan(rebounded - 1);
    samplePhysicsBake(bake, 1, 8, position, rotation);
    expect(position.x).toBeGreaterThan(LEGACY_XOR.exitX + .8);
    expect(physics.getBodies()).toHaveLength(0);
    parent.dispose(); scene.dispose(); engine.dispose();
  });
});
