import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { readFileSync } from "node:fs";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import { cameraPose } from "../camera/CameraPath";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { DemosceneTransition, VIOLIN_FALL, VIOLIN_PATTERN, VOXEL_COUNT } from "./DemosceneTransition";

describe("arcade violin and warp transition", () => {
  it("draws a pixel violin with strings, curved bouts and a separate bow", () => {
    expect(VIOLIN_PATTERN.every((row) => row.length === VIOLIN_PATTERN[0].length)).toBe(true);
    expect(VIOLIN_PATTERN.some((row) => row.includes("||"))).toBe(true);
    expect(VIOLIN_PATTERN.some((row) => row.includes("ooo||ooo"))).toBe(true);
    expect(VIOLIN_PATTERN.some((row) => row.startsWith("+"))).toBe(true);
    expect(VOXEL_COUNT).toBe(VIOLIN_PATTERN.join("").replaceAll(".", "").length);
  });
  it("reuses a few thin-instanced meshes and clears before the D journey", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const transition = new DemosceneTransition(scene);
    const namedMesh = (name: string): Mesh => {
      const mesh = scene.getMeshByName(name);
      if (!(mesh instanceof Mesh)) throw new Error(`Missing mesh ${name}`);
      return mesh;
    };
    const voxels = [0, 1, 2].map((index) => namedMesh(`FX/Pixel to voxel / ${index}`));
    const streaks = namedMesh("FX/Arcade warp streaks");
    expect(VOXEL_COUNT).toBeGreaterThan(90);
    expect(voxels.reduce((total, mesh) => total + mesh.thinInstanceCount, 0)).toBe(VOXEL_COUNT);
    expect(streaks.thinInstanceCount).toBe(96);
    transition.update(VIOLIN_FALL.start - .5, { ...silentFeatures(), bass: 1, kick: 1 });
    expect(voxels.every((mesh) => mesh.isEnabled())).toBe(true);
    transition.update(54, silentFeatures());
    expect(voxels.every((mesh) => !mesh.isEnabled())).toBe(true);
    expect(streaks.isEnabled()).toBe(false);
    transition.update(70, silentFeatures());
    expect(streaks.isEnabled()).toBe(false);
    transition.update(VIOLIN_FALL.start - .5, silentFeatures());
    expect(voxels.every((mesh) => mesh.isEnabled())).toBe(true);
    scene.dispose();
    engine.dispose();
  });

  it("drops every violin and bow voxel onto the Havok floor on approach, then resets on replay", async () => {
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const plugin = new HavokPlugin(true, await HavokPhysics({ wasmBinary }));
    expect(scene.enablePhysics(new Vector3(0, -17, 0), plugin)).toBe(true);
    const transition = new DemosceneTransition(scene);
    transition.initialize(plugin);
    const pieces = scene.meshes.filter((mesh) => mesh.name.startsWith("Arcade / violin voxel "));
    const intact = scene.getMeshByName("FX/Pixel to voxel / 0")!;
    expect(pieces).toHaveLength(VOXEL_COUNT);
    transition.update(VIOLIN_FALL.start - .01, silentFeatures());
    expect(intact.isEnabled()).toBe(true);
    expect(pieces.every((mesh) => !mesh.isEnabled() && !mesh.physicsBody)).toBe(true);
    transition.update(VIOLIN_FALL.start, silentFeatures());
    expect(intact.isEnabled()).toBe(false);
    expect(pieces.every((mesh) => mesh.isEnabled() && mesh.physicsBody)).toBe(true);
    const pose = cameraPose(VIOLIN_FALL.start);
    const projection = Matrix.LookAtLH(pose.position, pose.target, Vector3.Up())
      .multiply(Matrix.PerspectiveFovLH(pose.fov, 16 / 9, .15, 12000));
    const screen = Vector3.TransformCoordinates(pieces[0].position, projection);
    expect(Math.abs(screen.x)).toBeLessThan(.95);
    expect(Math.abs(screen.y)).toBeLessThan(.9);
    expect(screen.z).toBeGreaterThan(0);
    expect(screen.z).toBeLessThan(1);
    const start = pieces[0].position.clone();
    transition.update(VIOLIN_FALL.start, silentFeatures());
    expect(pieces[0].position.equals(start)).toBe(true);
    const visibleBounces = new Set<number>();
    for (let frame = 1; frame <= 240; frame++) {
      const time = VIOLIN_FALL.start + frame / 60;
      transition.update(time, silentFeatures());
      scene.getPhysicsEngine()!._step(1 / 60);
      const pose = cameraPose(time);
      const view = Matrix.LookAtLH(pose.position, pose.target, Vector3.Up())
        .multiply(Matrix.PerspectiveFovLH(pose.fov, 16 / 9, .15, 12000));
      pieces.forEach((piece, index) => {
        const screen = Vector3.TransformCoordinates(piece.position, view);
        if (piece.position.y < 1 && piece.physicsBody!.getLinearVelocity().y > .2
          && Math.abs(screen.x) < .95 && Math.abs(screen.y) < .93 && screen.z > 0 && screen.z < 1) {
          visibleBounces.add(index);
        }
      });
    }
    expect(visibleBounces.size).toBeGreaterThanOrEqual(VOXEL_COUNT / 3);
    expect(pieces.every((mesh) => mesh.position.y >= .1 && mesh.position.y < 1)).toBe(true);
    transition.update(VIOLIN_FALL.end, silentFeatures());
    expect(pieces.every((mesh) => !mesh.isEnabled() && !mesh.physicsBody)).toBe(true);
    transition.update(VIOLIN_FALL.start - .1, silentFeatures());
    expect(intact.isEnabled()).toBe(true);
    transition.update(VIOLIN_FALL.start, silentFeatures());
    expect(pieces[0].position.equals(start)).toBe(true);
    expect(pieces[0].physicsBody!.getLinearVelocity().y).toBeLessThan(0);
    transition.update(VIOLIN_FALL.start + 2, silentFeatures());
    expect(pieces[0].position.y).toBeLessThan(1);
    transition.update(0, silentFeatures());
    expect(pieces.every((mesh) => !mesh.physicsBody)).toBe(true);
    scene.dispose();
    engine.dispose();
  });
});
