import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { PONG_VOLLEY, VIOLIN_BITS, VIOLIN_FALL, violinLocalPosition } from "../content/violin";
import { bakeViolinPongImpact } from "./ViolinPongImpact";
import { samplePhysicsBake } from "./PhysicsBake";

describe("final Pong shot into the voxel violin", () => {
  it("measures an actual collision impulse before enabling gravity, with deterministic recorded replay", async () => {
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plugin = new HavokPlugin(true, await HavokPhysics({ wasmBinary }));
    scene.enablePhysics(new Vector3(0, -17, 0), plugin);
    plugin.setVelocityLimits(32, 12);
    const count = scene.transformNodes.length;
    const result = bakeViolinPongImpact(scene, Matrix.Identity());
    expect(result.impactTime).toBeGreaterThan(21.8);
    expect(result.impactTime).toBeLessThan(22.15);
    expect(result.contactIndex).toBeGreaterThanOrEqual(0);
    expect(result.impulse).toBeGreaterThan(.01);
    expect(scene.transformNodes).toHaveLength(count);
    const position = Vector3.Zero(), rotation = Quaternion.Identity();
    samplePhysicsBake(result.bake, result.contactIndex, result.impactTime - PONG_VOLLEY.shot - .05, position, rotation);
    expect(Vector3.Distance(position, violinLocalPosition(VIOLIN_BITS[result.contactIndex]))).toBeLessThan(.001);
    samplePhysicsBake(result.bake, result.contactIndex, 26 - PONG_VOLLEY.shot, position, rotation);
    expect(position.y).toBeLessThan(2);
    const saved = position.asArray();
    samplePhysicsBake(result.bake, result.contactIndex, 0, position, rotation);
    samplePhysicsBake(result.bake, result.contactIndex, 26 - PONG_VOLLEY.shot, position, rotation);
    expect(position.asArray()).toEqual(saved);
    expect(result.bake.tracks).toHaveLength(VIOLIN_BITS.length + 1);
    expect(result.bake.frames).toBeGreaterThan((VIOLIN_FALL.end - PONG_VOLLEY.shot) * 59);
    scene.dispose(); engine.dispose();
  });
});
