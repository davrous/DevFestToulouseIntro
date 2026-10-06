import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { DemosceneTransition, VIOLIN_PATTERN, VOXEL_COUNT } from "./DemosceneTransition";

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
    transition.update(26, { ...silentFeatures(), bass: 1, kick: 1 });
    expect(voxels.every((mesh) => mesh.isEnabled())).toBe(true);
    transition.update(54, silentFeatures());
    expect(voxels.every((mesh) => !mesh.isEnabled())).toBe(true);
    expect(streaks.isEnabled()).toBe(true);
    transition.update(70, silentFeatures());
    expect(streaks.isEnabled()).toBe(false);
    transition.update(26, silentFeatures());
    expect(voxels.every((mesh) => mesh.isEnabled())).toBe(true);
    scene.dispose();
    engine.dispose();
  });
});
