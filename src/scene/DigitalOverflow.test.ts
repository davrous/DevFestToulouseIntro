import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { BUFFER_OVERFLOW, DigitalOverflow, overflowPhysicsActive } from "./DigitalOverflow";

vi.mock("./WorldText", () => ({
  createWorldText: (scene: Scene, options: { name: string }) => new Mesh(options.name, scene),
}));

describe("buffer overflow in the S bend", () => {
  it("holds a full memory stack, drops real Havok bytes, rests on the floor and cleans up for seek/replay", async () => {
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const havok = await HavokPhysics({ wasmBinary });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plugin = new HavokPlugin(true, havok);
    expect(scene.enablePhysics(new Vector3(0, -17, 0), plugin)).toBe(true);
    const overflow = new DigitalOverflow(scene);
    overflow.initialize(plugin);
    const bytes = scene.meshes.filter((mesh) => mesh.name.startsWith("Digital / overflowing byte"));
    expect(bytes).toHaveLength(BUFFER_OVERFLOW.count);
    expect(overflowPhysicsActive(BUFFER_OVERFLOW.start)).toBe(false);
    expect(overflowPhysicsActive(BUFFER_OVERFLOW.spill)).toBe(true);
    expect(overflowPhysicsActive(BUFFER_OVERFLOW.end)).toBe(false);
    overflow.update(BUFFER_OVERFLOW.start);
    const rows = [...new Set(bytes.map((mesh) => mesh.position.y))].sort((a, b) => a - b);
    for (let index = 1; index < rows.length; index++) {
      expect(rows[index] - rows[index - 1]).toBeGreaterThanOrEqual(.9);
    }
    const home = bytes[0].position.clone();
    for (let i = 1; i <= 30; i++) {
      overflow.update(BUFFER_OVERFLOW.start + i / 60);
      scene.getPhysicsEngine()!._step(1 / 60);
    }
    expect(Vector3.Distance(bytes[0].position, home)).toBeLessThan(.001);
    overflow.update(BUFFER_OVERFLOW.spill);
    expect(bytes.every((mesh) => mesh.physicsBody && mesh.isEnabled())).toBe(true);
    for (let i = 1; i <= 300; i++) {
      overflow.update(BUFFER_OVERFLOW.spill + i / 60);
      scene.getPhysicsEngine()!._step(1 / 60);
    }
    expect(Vector3.Distance(bytes[0].position, home)).toBeGreaterThan(2);
    expect(bytes.every((mesh) => mesh.position.y > .35)).toBe(true);
    expect(bytes[0].physicsBody?.getLinearVelocity().length()).toBeLessThan(.3);
    overflow.update(180);
    expect(bytes.every((mesh) => !mesh.isEnabled() && !mesh.physicsBody)).toBe(true);
    overflow.update(BUFFER_OVERFLOW.start);
    expect(Vector3.Distance(bytes[0].position, home)).toBeLessThan(.001);
    expect(bytes[0].physicsBody).not.toBeNull();
    overflow.update(112);
    expect(bytes[0].position.y).toBeCloseTo(home.y);
    overflow.update(114);
    expect(bytes[0].position.y).toBeLessThan(home.y);
    scene.dispose();
    engine.dispose();
  });
});
