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

vi.mock("./WorldText", async () => {
  const { Mesh } = await import("@babylonjs/core/Meshes/mesh");
  return { createWorldText: (scene: Scene, options: { name: string }) => new Mesh(options.name, scene) };
});

describe("arcade story physics", () => {
  it("shows only event props, not camera-following balls", () => {
    expect(arcadeWallVisible(0)).toBe(false);
    expect(arcadeWallVisible(34)).toBe(false);
    expect(arcadeWallVisible(35)).toBe(true);
    expect(arcadeWallVisible(44)).toBe(false);
  });

  it("removes bonus tokens and breaks technical debt with Havok, then cleans up and resets on seek", async () => {
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const havok = await HavokPhysics({ wasmBinary });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plugin = new HavokPlugin(true, havok);
    expect(scene.enablePhysics(new Vector3(0, -17, 0), plugin)).toBe(true);
    const arcade = new ArcadePhysics(scene);
    expect(scene.getMaterialByName("Arcade / technical debt")?.alpha).toBeLessThan(1);
    arcade.initialize(plugin);
    const silence = silentFeatures();
    const voxel = scene.getMeshByName("Arcade / legacy voxel 0");
    if (!voxel) throw new Error("Arcade physics wall was not created.");
    expect(scene.meshes.some((mesh) => mesh.name.includes("bonus token"))).toBe(false);
    arcade.update(31, silence);
    expect(voxel.isEnabled()).toBe(false);
    arcade.update(35, silence);
    expect(voxel.isEnabled()).toBe(true);
    expect(voxel.physicsBody).toBeDefined();
    const wallStart = voxel.position.clone();
    arcade.update(WALL_TIME, { ...silence, drop: 1 });
    for (let index = 0; index < 45; index++) {
      arcade.update(WALL_TIME + (index + 1) / 60, silence);
      scene.getPhysicsEngine()!._step(1 / 60);
    }
    expect(Vector3.Distance(voxel.position, wallStart)).toBeGreaterThan(.4);
    arcade.update(44, silence);
    expect(voxel.isEnabled()).toBe(false);
    expect(voxel.physicsBody).toBeNull();
    arcade.update(40, silence);
    expect(Vector3.Distance(voxel.position, wallStart)).toBeGreaterThan(5);
    arcade.update(35, silence);
    expect(voxel.isEnabled()).toBe(true);
    expect(Vector3.Distance(voxel.position, wallStart)).toBeLessThan(.001);
    arcade.update(37.7, { ...silence, drop: 1 });
    expect(voxel.physicsBody!.getLinearVelocity().length()).toBeGreaterThan(5);
    scene.dispose();
    engine.dispose();
  });
});
