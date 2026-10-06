import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { CINEMA_FLOOR_TOP, CinemaPopcorn, POPCORN_COUNT, POPCORN_END, POPCORN_START } from "./CinemaPopcorn";
import { cameraPose } from "../camera/CameraPath";

describe("cinema popcorn impact", () => {
  it("spills a bounded number of Havok bodies, cleans them up, and replays on seek", async () => {
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const havok = await HavokPhysics({ wasmBinary });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plugin = new HavokPlugin(true, havok);
    expect(scene.enablePhysics(new Vector3(0, -17, 0), plugin)).toBe(true);
    const popcorn = new CinemaPopcorn(scene);
    popcorn.initialize(plugin);
    const pieces = scene.meshes.filter((mesh) => mesh.name.startsWith("Cinema / popcorn kernel"));
    expect(pieces).toHaveLength(POPCORN_COUNT);
    popcorn.update(POPCORN_START - .1, silentFeatures());
    expect(pieces.every((mesh) => !mesh.isEnabled())).toBe(true);
    popcorn.update(POPCORN_START, { ...silentFeatures(), drop: 1 });
    expect(pieces.every((mesh) => mesh.isEnabled() && mesh.physicsBody)).toBe(true);
    const start = pieces[0].position.clone();
    expect(start.y).toBeLessThan(18);
    expect(Vector3.Distance(start, cameraPose(POPCORN_START).position)).toBeLessThan(16);
    expect(pieces[0].physicsBody?.getLinearVelocity().y).toBeLessThan(0);
    for (let index = 1; index <= 270; index++) {
      popcorn.update(POPCORN_START + index / 60, silentFeatures());
      scene.getPhysicsEngine()!._step(1 / 60);
    }
    expect(Vector3.Distance(pieces[0].position, start)).toBeGreaterThan(.1);
    expect(pieces[0].position.y - CINEMA_FLOOR_TOP).toBeGreaterThan(.2);
    popcorn.update(POPCORN_END, silentFeatures());
    expect(pieces.every((mesh) => !mesh.isEnabled() && !mesh.physicsBody)).toBe(true);
    popcorn.update(POPCORN_START, silentFeatures());
    expect(pieces.every((mesh) => mesh.isEnabled() && mesh.physicsBody)).toBe(true);
    scene.dispose();
    engine.dispose();
  });
});
