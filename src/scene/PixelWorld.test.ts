import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { PixelWorld, RUNNER_COUNT, SCENERY_COUNT } from "./PixelWorld";
import { ARCADE_WALL_PIXELS, ArcadeT } from "./ArcadeT";
import { CELL, cellPosition } from "../content/title";
import { ARCADE_WALL_PANELS, ArcadeCathedral, CABINET_COUNT, CABINET_Z, CABINET_WALL_CLEARANCE } from "./ArcadeCathedral";
import { ARCADE_ENTRY } from "../content/showBeats";
import { cameraPose, routeAnchor } from "../camera/CameraPath";
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
vi.mock("./EventBranding", () => ({
  loadEventArtwork: vi.fn(async () => ({})),
  createEventDecal: vi.fn((scene: Scene, name: string, _texture: unknown, size: number) =>
    MeshBuilder.CreatePlane(name, { size }, scene)),
}));
vi.mock("@babylonjs/core/Loading/sceneLoader", () => ({
  SceneLoader: {
    ImportMeshAsync: async (_meshes: string, _root: string, file: string, scene: Scene) => {
      const root = new Mesh("Arcade cabinet template", scene);
      const body = MeshBuilder.CreateBox(`Cabinet body / ${file}`, {
        width: .55, height: .9, depth: file === "dance-machine.glb" ? .75 : file === "pinball.glb" ? .6 : .4,
      }, scene);
      body.parent = root;
      body.position.set(0, .45, .1);
      return { meshes: [root] };
    },
  },
}));

describe("wall-mounted pixel art", () => {
  it("keeps all four input icons near the entrance and behind the speaker approach", () => {
    const engine = new NullEngine(), scene = new Scene(engine), pixels = new PixelWorld(scene);
    pixels.update(12, silentFeatures());
    const prompts = scene.meshes.filter((mesh) => mesh.name.startsWith("Arcade / floating input"));
    expect(prompts).toHaveLength(4);
    for (const mesh of prompts) {
      expect(mesh.position.z - 1.55).toBeGreaterThan(cameraPose(ARCADE_ENTRY.cross).position.z);
      expect(mesh.position.z + 1.55).toBeLessThan(cameraPose(12).position.z);
    }
    scene.dispose(); engine.dispose();
  });

  it("keeps all six machines balanced while clearing the speaker lasers and Anne-Flore", async () => {
    const engine = new NullEngine(), scene = new Scene(engine), arcade = new ArcadeCathedral(scene);
    await arcade.prepare();
    expect(CABINET_Z).toHaveLength(CABINET_COUNT);
    const speakerZ = routeAnchor(29).position.z;
    const nominalSpacing = (speakerZ - 15.3 - (scene.getMeshByName("Arcade / hero portal screen")!.position.z + 18))
      / (CABINET_COUNT - 1);
    const expectedAdjustments = [0, 0, -3, 0, -3, -7];
    const gaps: number[] = [];
    expect(CABINET_Z[0]).toBeCloseTo(scene.getMeshByName("Arcade / hero portal screen")!.position.z + 18);
    for (let index = 0; index < CABINET_Z.length; index++) {
      const nominalZ = scene.getMeshByName("Arcade / hero portal screen")!.position.z + 18 + nominalSpacing * index;
      expect(CABINET_Z[index]).toBeCloseTo(nominalZ + expectedAdjustments[index], 8);
      expect(arcade.machines[index].root.position.z).toBeCloseTo(CABINET_Z[index], 8);
      if (index > 0) gaps.push(CABINET_Z[index] - CABINET_Z[index - 1]);
    }
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(7.1);
    for (const machine of arcade.machines) {
      expect(machine.root.getHierarchyBoundingVectors(true).max.z).toBeLessThan(speakerZ - 8);
    }
    expect(speakerZ - arcade.machines[5].root.getHierarchyBoundingVectors(true).max.z).toBeGreaterThan(17.5);
    expect(scene.getMeshByName("Arcade / NEXT LEVEL")).toBeNull();
    scene.dispose(); engine.dispose();
  });

  it("keeps the first four floating panels out of every machine and raises wall panels above cabinets", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const arcade = new ArcadeCathedral(scene), pixels = new PixelWorld(scene);
    await arcade.prepare();
    pixels.update(12, silentFeatures());
    const prompts = scene.meshes.filter(mesh => mesh.name.startsWith("Arcade / floating input"));
    const intersects = (a: ReturnType<Mesh["getHierarchyBoundingVectors"]>,
      b: ReturnType<Mesh["getHierarchyBoundingVectors"]>) =>
      a.min.x < b.max.x && a.max.x > b.min.x && a.min.y < b.max.y && a.max.y > b.min.y
      && a.min.z < b.max.z && a.max.z > b.min.z;
    for (const prompt of prompts) {
      const bounds = prompt.getHierarchyBoundingVectors(true);
      expect(arcade.machines.every(machine => !intersects(bounds, machine.root.getHierarchyBoundingVectors(true))))
        .toBe(true);
    }
    const panels = scene.meshes.filter(mesh => mesh.name.startsWith("FX/Arcade wall panel /"));
    for (const [index, panel] of panels.entries()) {
      const panelBounds = panel.getHierarchyBoundingVectors(true);
      const cabinetBounds = arcade.machines[index].root.getHierarchyBoundingVectors(true);
      expect(panel.position.y).toBe(ARCADE_WALL_PANELS.height);
      expect(panelBounds.min.y).toBeGreaterThan(cabinetBounds.max.y + 2.5);
    }
    scene.dispose(); engine.dispose();
  });

  it("labels the opening CLOSING KEYNOTE and fades its DevFest logo with the panel", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const arcade = new ArcadeCathedral(scene);
    expect(createWorldText).toHaveBeenCalledWith(scene, expect.objectContaining({
      name: "Arcade / hero portal screen",
      lines: [{ text: "DEVFEST AI4FUN", color: "#b8ffe4" }, { text: "CLOSING KEYNOTE", color: "#ffbad9" }],
    }));
    await arcade.prepare();
    const screen = scene.getMeshByName("Arcade / hero portal screen")!;
    const logo = scene.getMeshByName("Arcade / opening DevFest logo")!;
    expect(logo.parent).toBe(screen);
    expect(logo.visibility).toBe(1);
    expect(screen.position.y).toBe(cameraPose(ARCADE_ENTRY.cross).position.y);
    expect(scene.getMeshByName("FX/Arcade portal CRT scanlines")?.position.y).toBe(screen.position.y);
    expect(screen.visibility).toBe(1);
    expect(cameraPose(ARCADE_ENTRY.cross - .05).position.z).toBeLessThan(screen.position.z);
    expect(cameraPose(ARCADE_ENTRY.cross + .05).position.z).toBeGreaterThan(screen.position.z);
    arcade.update(ARCADE_ENTRY.start, silentFeatures());
    expect(screen.visibility).toBe(1);
    arcade.update((ARCADE_ENTRY.panelFadeStart + ARCADE_ENTRY.panelFadeEnd) / 2, silentFeatures());
    expect(screen.visibility).toBeCloseTo(.5);
    expect(logo.visibility).toBeCloseTo(.5);
    arcade.update(ARCADE_ENTRY.cross, silentFeatures());
    expect(screen.visibility).toBe(0);
    expect(logo.visibility).toBe(0);
    expect(scene.getMeshByName("FX/Arcade portal CRT scanlines")?.isEnabled()).toBe(false);
    arcade.update(0, silentFeatures());
    expect(screen.visibility).toBe(1);
    expect(logo.visibility).toBe(1);
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

  it("leaves a consistent wall gap for every rotated cabinet, including deeper asymmetric models", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const arcade = new ArcadeCathedral(scene);
    await arcade.prepare();
    const cabinets = scene.meshes.filter((mesh) => /^Arcade cathedral \/ cabinet \d$/.test(mesh.name));
    expect(cabinets).toHaveLength(CABINET_COUNT);
    const center = cellPosition(-1, 12).x, innerHalfWidth = CELL / 2 - .75;
    const positions = cabinets.map((cabinet) => cabinet.position.asArray());
    for (const time of [0, 7, 30, 48, 0]) {
      arcade.update(time, { ...silentFeatures(), bass: 1 });
      expect(cabinets.map((cabinet) => cabinet.position.asArray())).toEqual(positions);
      for (const [index, cabinet] of cabinets.entries()) {
        const bounds = cabinet.getHierarchyBoundingVectors(true);
        const gap = index % 2 ? center + innerHalfWidth - bounds.max.x : bounds.min.x - (center - innerHalfWidth);
        expect(gap).toBeCloseTo(CABINET_WALL_CLEARANCE, 3);
        expect(bounds.min.y).toBeCloseTo(0, 6);
        expect(cabinet.scaling.asArray()).toEqual([12 + index % 3 * 1.2, 12 + index % 3 * 1.2, 12 + index % 3 * 1.2]);
        expect(bounds.min.x).toBeGreaterThan(center - innerHalfWidth);
        expect(bounds.max.x).toBeLessThan(center + innerHalfWidth);
      }
    }
    scene.dispose(); engine.dispose();
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
