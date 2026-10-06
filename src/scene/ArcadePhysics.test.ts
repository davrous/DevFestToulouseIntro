import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { ArcadePhysics, TOKEN_TIME, WALL_TIME, arcadePropVisible } from "./ArcadePhysics";

vi.mock("./WorldText", async () => {
  const { Mesh } = await import("@babylonjs/core/Meshes/mesh");
  return { createWorldText: (scene: Scene, options: { name: string }) => new Mesh(options.name, scene) };
});

describe("arcade story physics", () => {
  it("shows only event props, not camera-following balls", () => {
    expect(arcadePropVisible(0, "wall")).toBe(false);
    expect(arcadePropVisible(34, "wall")).toBe(false);
    expect(arcadePropVisible(35, "wall")).toBe(true);
    expect(arcadePropVisible(44, "wall")).toBe(false);
    expect(TOKEN_TIME).toBeGreaterThan(29);
    expect(TOKEN_TIME).toBeLessThan(31);
    expect(arcadePropVisible(30, "token")).toBe(false);
    expect(arcadePropVisible(TOKEN_TIME, "token")).toBe(true);
    expect(arcadePropVisible(32, "token")).toBe(true);
    expect(arcadePropVisible(40, "token")).toBe(false);
  });

  it("breaks technical debt and scatters tokens with Havok, then cleans up and resets on seek", async () => {
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
    const token = scene.getMeshByName("Arcade / bonus token 0");
    if (!voxel || !token) throw new Error("Arcade physics props were not created.");
    arcade.update(TOKEN_TIME, silence);
    expect(token.isEnabled()).toBe(true);
    expect(token.physicsBody).toBeDefined();
    const tokenStart = token.position.clone();
    for (let index = 0; index < 35; index++) {
      arcade.update(TOKEN_TIME + (index + 1) / 60, silence);
      scene.getPhysicsEngine()!._step(1 / 60);
    }
    expect(Vector3.Distance(token.position, tokenStart)).toBeGreaterThan(.3);
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
    expect(token.isEnabled()).toBe(false);
    expect(voxel.physicsBody).toBeNull();
    expect(token.physicsBody).toBeNull();
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
