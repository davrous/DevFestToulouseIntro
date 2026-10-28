import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { ArcadePhysics, WALL_TIME, arcadeWallVisible } from "./ArcadePhysics";
import { LEGACY_XOR } from "./LegacyXorSequence";

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
    const arcade = new ArcadePhysics(scene);
    expect(arcade.materials.every((material) => material.alpha === 1)).toBe(true);
    arcade.initialize(plugin);
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
    scene.dispose();
    engine.dispose();
  });
});
