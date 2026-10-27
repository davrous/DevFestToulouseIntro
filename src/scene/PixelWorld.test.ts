import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { PixelWorld, RUNNER_COUNT, SCENERY_COUNT } from "./PixelWorld";
import { ARCADE_WALL_PIXELS, ArcadeT } from "./ArcadeT";
import { CELL, cellPosition } from "../content/title";
import { ARCADE_WALL_PANELS, ArcadeCathedral, CABINET_COUNT } from "./ArcadeCathedral";
import { ARCADE_ENTRY } from "../content/showBeats";
import { cameraPose } from "../camera/CameraPath";
import { createWorldText } from "./WorldText";

vi.mock("@babylonjs/core/Materials/Textures/texture", () => ({
  Texture: class {
    static NEAREST_SAMPLINGMODE = 1;
    static CLAMP_ADDRESSMODE = 0;
  },
}));
vi.mock("./WorldText", () => ({
  createWorldText: vi.fn((scene: Scene, options: { name: string }) => new Mesh(options.name, scene)),
}));
vi.mock("@babylonjs/core/Loading/sceneLoader", () => ({
  SceneLoader: {
    ImportMeshAsync: async (_meshes: string, _root: string, _file: string, scene: Scene) =>
      ({ meshes: [new Mesh("Arcade cabinet template", scene)] }),
  },
}));

describe("wall-mounted pixel art", () => {
  it("labels the opening screen AI4FUN / AGENDA and clears it before the shader's crossing burst", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const arcade = new ArcadeCathedral(scene);
    expect(createWorldText).toHaveBeenCalledWith(scene, expect.objectContaining({
      name: "Arcade / hero portal screen",
      lines: [{ text: "DEVFEST AI4FUN", color: "#b8ffe4" }, { text: "AGENDA", color: "#ffbad9" }],
    }));
    const screen = scene.getMeshByName("Arcade / hero portal screen")!;
    expect(screen.position.y).toBe(cameraPose(ARCADE_ENTRY.cross).position.y);
    expect(scene.getMeshByName("FX/Arcade portal CRT scanlines")?.position.y).toBe(screen.position.y);
    expect(screen.visibility).toBe(1);
    expect(cameraPose(ARCADE_ENTRY.cross - .05).position.z).toBeLessThan(screen.position.z);
    expect(cameraPose(ARCADE_ENTRY.cross + .05).position.z).toBeGreaterThan(screen.position.z);
    arcade.update(ARCADE_ENTRY.start, silentFeatures());
    expect(screen.visibility).toBe(1);
    arcade.update((ARCADE_ENTRY.panelFadeStart + ARCADE_ENTRY.panelFadeEnd) / 2, silentFeatures());
    expect(screen.visibility).toBeCloseTo(.5);
    arcade.update(ARCADE_ENTRY.cross, silentFeatures());
    expect(screen.visibility).toBe(0);
    expect(scene.getMeshByName("FX/Arcade portal CRT scanlines")?.isEnabled()).toBe(false);
    arcade.update(0, silentFeatures());
    expect(screen.visibility).toBe(1);
    scene.dispose();
    engine.dispose();
  });

  it("places the six reactive panels against the walls above the cabinets, not in front of their screens", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const arcade = new ArcadeCathedral(scene);
    await arcade.prepare();
    const panels = scene.meshes.filter((mesh) => mesh.name.startsWith("FX/Arcade wall panel /"));
    expect(panels).toHaveLength(CABINET_COUNT);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith("FX/Arcade screen /"))).toBe(false);
    const center = cellPosition(-1, 12).x;
    const positions = panels.map((panel) => panel.position.asArray());
    for (const time of [0, 8, 20, 32, 5]) {
      arcade.update(time, { ...silentFeatures(), bass: 1, kick: 1 });
      expect(panels.map((panel) => panel.position.asArray())).toEqual(positions);
      for (const panel of panels) {
        const offset = Math.abs(panel.position.x - center);
        expect(offset).toBeCloseTo(ARCADE_WALL_PANELS.offset, 8);
        expect(CELL / 2 - .75 - offset).toBeCloseTo(.01, 8);
        expect(panel.position.y).toBe(ARCADE_WALL_PANELS.height);
        expect(Math.abs(panel.rotation.y)).toBe(Math.PI / 2);
      }
    }
    arcade.update(50, silentFeatures());
    expect(panels.every((panel) => !panel.isEnabled())).toBe(true);
    scene.dispose();
    engine.dispose();
  });

  it("mounts luminous squares flat against both side walls without floating or resizing on beats", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const arcade = new ArcadeT(scene);
    const meshes = scene.meshes.filter((mesh): mesh is Mesh =>
      mesh instanceof Mesh && mesh.name.startsWith("FX/Arcade bit sprites"));
    expect(meshes).toHaveLength(2);
    const snapshot = () => meshes.map((mesh) => mesh.thinInstanceGetWorldMatrices().map((matrix) => matrix.asArray()));
    const original = snapshot();
    const center = cellPosition(-1, 12).x;
    for (const mesh of meshes) {
      const matrices = mesh.thinInstanceGetWorldMatrices();
      expect(matrices).toHaveLength(ARCADE_WALL_PIXELS.count);
      for (const matrix of matrices) {
        const position = Vector3.TransformCoordinates(Vector3.Zero(), matrix);
        expect(Math.abs(position.x - center)).toBeCloseTo(ARCADE_WALL_PIXELS.offset, 3);
        const corners = [-.5, .5].flatMap((x) => [-.5, .5].map((z) =>
          Vector3.TransformCoordinates(new Vector3(x, 0, z), matrix).x));
        expect(Math.max(...corners) - Math.min(...corners)).toBeCloseTo(ARCADE_WALL_PIXELS.depth, 3);
        expect(Math.abs(position.x - center) + ARCADE_WALL_PIXELS.depth / 2).toBeLessThan(CELL / 2 - .75);
        expect(CELL / 2 - .75 - Math.abs(position.x - center)).toBeLessThan(.2);
        expect(position.y).toBeGreaterThan(15);
      }
    }
    for (const time of [0, 7, 20, 32, 5]) {
      arcade.update(time, { ...silentFeatures(), energy: 1, kick: 1, violaEnergy: 1 });
      expect(snapshot()).toEqual(original);
    }
    scene.dispose();
    engine.dispose();
  });

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
