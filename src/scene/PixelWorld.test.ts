import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { PixelWorld, RUNNER_COUNT, SCENERY_COUNT } from "./PixelWorld";

vi.mock("@babylonjs/core/Materials/Textures/texture", () => ({
  Texture: class {
    static NEAREST_SAMPLINGMODE = 1;
    static CLAMP_ADDRESSMODE = 0;
  },
}));
vi.mock("./WorldText", () => ({
  createWorldText: (scene: Scene, options: { name: string }) => new Mesh(options.name, scene),
}));

describe("wall-mounted pixel art", () => {
  it("keeps its character, position and scale fixed through bass hits and time, including rewind", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const world = new PixelWorld(scene);
    const sprites = scene.meshes.filter((mesh) =>
      mesh.name.startsWith("Arcade / running pixel character") || mesh.name.startsWith("Arcade / pixel landscape"));
    expect(sprites).toHaveLength(RUNNER_COUNT + SCENERY_COUNT);
    world.update(12, silentFeatures());
    const snapshot = () => sprites.map((mesh) => ({
      position: mesh.position.asArray(), scale: mesh.scaling.asArray(),
      uv: Array.from(mesh.getVerticesData(VertexBuffer.UVKind)!),
    }));
    const original = snapshot();
    for (const time of [12, 12.1, 18, 32, 7]) {
      world.update(time, { ...silentFeatures(), bass: 1, kick: 1 });
      expect(snapshot()).toEqual(original);
      expect(sprites.every((mesh) => mesh.isEnabled())).toBe(true);
    }
    world.update(60, silentFeatures());
    expect(sprites.every((mesh) => !mesh.isEnabled())).toBe(true);
    scene.dispose();
    engine.dispose();
  });
});
