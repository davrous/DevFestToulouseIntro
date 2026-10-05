import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { BouncingBalls } from "./BouncingBalls";

describe("Havok stage balls", () => {
  it("collides with audio-driven bars, bounces under gravity and resets on seek", async () => {
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const havok = await HavokPhysics({ wasmBinary });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plugin = new HavokPlugin(true, havok);
    expect(scene.enablePhysics(new Vector3(0, -17, 0), plugin)).toBe(true);
    const balls = new BouncingBalls(scene);
    balls.initialize(scene, plugin);
    const ball = scene.getTransformNodeByName("FX/Bouncing data ball 0");
    const platform = scene.getTransformNodeByName("FX/Physics spectrum 0/0");
    if (!ball || !platform || !ball.physicsBody) throw new Error("Physics bodies were not initialized.");
    const audio = silentFeatures();
    const heights: number[] = [];
    for (let frame = 0; frame < 150; frame++) {
      balls.update(frame / 60, audio);
      scene.getPhysicsEngine()!._step(1 / 60);
      heights.push(ball.position.y);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(.9);
    expect(heights.every((height) => height > .4 && height < 8)).toBe(true);
    const before = platform.position.y;
    balls.update(2.5, { ...audio, bass: 1, kick: 1 });
    expect(platform.position.y).toBeGreaterThan(before);
    balls.update(31, audio);
    expect(ball.position.y).toBeCloseTo(2.3);
    expect(ball.physicsBody.getLinearVelocity().y).toBe(0);
    scene.dispose();
    engine.dispose();
  });
});
