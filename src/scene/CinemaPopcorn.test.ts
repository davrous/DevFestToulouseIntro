import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { CINEMA_FLOOR_TOP, CinemaPopcorn, POPCORN_COUNT, POPCORN_END, POPCORN_PER_BUCKET,
  POPCORN_SOURCES, POPCORN_START, popcornTilt } from "./CinemaPopcorn";
import { CINEMA } from "../content/showBeats";
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
    expect(pieces.filter((mesh) => mesh.isEnabled() && mesh.physicsBody)).toHaveLength(12);
    const start = pieces[0].position.clone();
    expect(start.y).toBeGreaterThan(cameraPose(POPCORN_START).position.y + 6);
    expect(Vector3.Distance(start, cameraPose(POPCORN_START).position)).toBeLessThan(16);
    expect(pieces[0].physicsBody?.getLinearVelocity().y).toBeLessThan(0);
    const overhead = new Set<number>();
    const visibleFallTime = Array<number>(POPCORN_COUNT).fill(0);
    let closestFloor = { clearance: Infinity, index: -1, time: 0 };
    const frames = Math.floor((POPCORN_END - POPCORN_START - .02) * 60);
    for (let index = 1; index <= frames; index++) {
      const time = POPCORN_START + index / 60;
      popcorn.update(time, silentFeatures());
      scene.getPhysicsEngine()!._step(1 / 60);
      const pose = cameraPose(time);
      const camera = pose.position;
      const view = Matrix.LookAtLH(camera, pose.target, Vector3.Up())
        .multiply(Matrix.PerspectiveFovLH(pose.fov, 16 / 9, .15, 12000));
      pieces.forEach((piece, i) => {
        if (!piece.isEnabled()) return;
        const screen = Vector3.TransformCoordinates(piece.position, view);
        const visible = Math.abs(screen.x) < .95 && Math.abs(screen.y) < .9 && screen.z > 0 && screen.z < 1;
        const clearance = piece.position.y - CINEMA_FLOOR_TOP;
        if (visible && clearance < closestFloor.clearance) closestFloor = { clearance, index: i, time };
        if (piece.position.y > camera.y + .5 && piece.physicsBody!.getLinearVelocity().y < -1
          && visible) {
          visibleFallTime[i] += 1 / 60;
        }
        if (Math.hypot(piece.position.x - camera.x, piece.position.z - camera.z) < 2.5
          && piece.position.y >= camera.y && piece.position.y < camera.y + 2
          && piece.physicsBody!.getLinearVelocity().y < -1) overhead.add(i);
      });
    }
    for (const bucket of [0, 1]) {
      const foreground = visibleFallTime.slice(bucket * POPCORN_PER_BUCKET, (bucket + 1) * POPCORN_PER_BUCKET)
        .filter((duration, index) => index % 2 === 1 && duration >= .35);
      expect(foreground.length, `visible foreground rain from bucket ${bucket}`).toBeGreaterThanOrEqual(12);
    }
    expect.soft(closestFloor.clearance, `kernel ${closestFloor.index} at ${closestFloor.time}s`).toBeGreaterThan(.2);
    expect.soft(overhead.size).toBeGreaterThanOrEqual(24);
    expect([...overhead].some((index) => index < POPCORN_PER_BUCKET)).toBe(true);
    expect([...overhead].some((index) => index >= POPCORN_PER_BUCKET)).toBe(true);
    expect(Vector3.Distance(pieces[0].position, start)).toBeGreaterThan(.1);
    expect(pieces[0].position.y - CINEMA_FLOOR_TOP,
      `kernel floor clearance at ${pieces[0].position.asArray().join(", ")}`).toBeGreaterThan(.2);
    popcorn.update(POPCORN_END, silentFeatures());
    expect(pieces.every((mesh) => !mesh.isEnabled() && !mesh.physicsBody)).toBe(true);
    popcorn.update(POPCORN_START, silentFeatures());
    expect(pieces.filter((mesh) => mesh.isEnabled() && mesh.physicsBody)).toHaveLength(12);
    popcorn.update(POPCORN_START + .61, silentFeatures());
    expect(pieces.every((mesh) => mesh.isEnabled() && mesh.physicsBody)).toBe(true);
    popcorn.update(POPCORN_START - .1, silentFeatures());
    expect(pieces.every((mesh) => !mesh.isEnabled() && !mesh.physicsBody)).toBe(true);
    scene.dispose();
    engine.dispose();
  });

  it("tips two raised buckets toward the aisle before releasing the synchronized rain", () => {
    expect(POPCORN_SOURCES.map((source) => source.lateral)).toEqual([-5, 5]);
    expect(POPCORN_SOURCES.every((source) => source.height >= 18)).toBe(true);
    expect(popcornTilt(CINEMA.popcornTip, -1)).toBeCloseTo(-.1);
    expect(popcornTilt(CINEMA.popcornTip, 1)).toBeCloseTo(.1);
    expect(popcornTilt(POPCORN_START, -1)).toBeCloseTo(-1.35);
    expect(popcornTilt(POPCORN_START, 1)).toBeCloseTo(1.35);
    expect(popcornTilt(POPCORN_END, 1)).toBe(popcornTilt(POPCORN_START, 1));
    expect(POPCORN_COUNT).toBe(72);
  });
});
