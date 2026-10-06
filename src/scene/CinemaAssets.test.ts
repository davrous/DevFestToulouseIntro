import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CinemaAssets } from "./CinemaAssets";

afterEach(() => vi.restoreAllMocks());

describe("cinema asset physical scale", () => {
  it("excludes presentation geometry, preserves handedness, and normalizes chairs by height", async () => {
    vi.spyOn(SceneLoader, "ImportMeshAsync").mockImplementation(async (_names, _root, file, scene) => {
      if (!scene || typeof file !== "string") throw new Error("Test imports require a scene and local filename.");
      const root = new Mesh(file, scene);
      root.scaling.z = -1;
      const body = MeshBuilder.CreateBox("prop", { width: 2, height: 4, depth: 1 }, scene);
      body.parent = root;
      body.position.set(3, 2, 7);
      if (file === "cinema_camera.glb" || file === "directors_chair.glb") {
        const decoration = new TransformNode(file === "cinema_camera.glb" ? "ground_0" : "Cylinder.003", scene);
        decoration.parent = root;
        const floor = MeshBuilder.CreateBox("presentation floor", { width: 100, height: .1, depth: 100 }, scene);
        floor.parent = decoration;
      }
      return { meshes: [root], animationGroups: [], particleSystems: [], skeletons: [], transformNodes: [],
        geometries: [], lights: [], spriteManagers: [] };
    });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const assets = new CinemaAssets(scene);
    await assets.prepare();
    const parent = new TransformNode("stage", scene);
    const camera = assets.create("camera", parent, "hero camera", 40);
    const chair = assets.create("chair", parent, "director chair", 4.2, "height");
    const seat = assets.create("seat", parent, "cinema seat", 4.2, "height");
    if (!camera || !chair || !seat) throw new Error("All test assets must be created.");
    const cameraBounds = camera.getHierarchyBoundingVectors(true);
    expect(cameraBounds.max.subtract(cameraBounds.min).y).toBeCloseTo(40);
    expect(cameraBounds.max.add(cameraBounds.min).length()).toBeCloseTo(0);
    expect(camera.getChildMeshes().every((mesh) => mesh.name !== "presentation floor")).toBe(true);
    expect(camera.getChildMeshes().every((mesh) => mesh instanceof Mesh)).toBe(true);
    for (const node of [chair, seat]) {
      const bounds = node.getHierarchyBoundingVectors(true);
      expect(bounds.max.y - bounds.min.y).toBeCloseTo(4.2);
    }
    expect(scene.getTransformNodeByName("ground_0")).toBeNull();
    expect(scene.getTransformNodeByName("Cylinder.003")).toBeNull();
    scene.dispose();
    engine.dispose();
  });
});
