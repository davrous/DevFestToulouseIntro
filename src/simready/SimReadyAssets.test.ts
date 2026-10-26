import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SimReadyAssets } from "./SimReadyAssets";
import { parseReports } from "./registry";

const manifest: unknown = JSON.parse(readFileSync(new URL("../../public/assets/simready/manifest.json", import.meta.url), "utf8"));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("shared SimReady asset cache", () => {
  it("parses the nine checked-in reports and rejects incomplete or invalid metadata", () => {
    expect(parseReports(manifest).size).toBe(9);
    expect(() => parseReports({})).toThrow();
    expect(() => parseReports({ assets: [{ id: "unknown" }] })).toThrow();
    expect(() => parseReports({ assets: [{ id: "croissant", dimensions: [NaN, 1, 1] }] })).toThrow();
  });

  it("loads each GLB once, shares geometry with independent visibility, normalizes bounds and disposes its cache once", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(manifest))));
    const container = new AssetContainer(scene);
    const root = new Mesh("source root", scene);
    root.scaling.z = -1;
    const body = MeshBuilder.CreateBox("source geometry", { width: 2, height: 4, depth: 1 }, scene);
    body.parent = root;
    body.position.set(3, 2, 7);
    container.meshes.push(root, body);
    container.rootNodes.push(root);
    container.removeAllFromScene();
    const load = vi.spyOn(SceneLoader, "LoadAssetContainerAsync").mockResolvedValue(container);
    const dispose = vi.spyOn(container, "dispose");
    const assets = new SimReadyAssets(scene);
    await assets.prepare(["croissant", "croissant"]);
    await assets.prepare(["croissant"]);
    expect(load).toHaveBeenCalledTimes(1);
    const parent = new TransformNode("test stage", scene);
    const first = assets.create("croissant", parent, "first", 8, "height")!;
    const second = assets.create("croissant", parent, "second", 4)!;
    const firstMesh = first.getChildMeshes().find((mesh) => mesh.getTotalVertices() > 0);
    const secondMesh = second.getChildMeshes().find((mesh) => mesh.getTotalVertices() > 0);
    if (!(firstMesh instanceof Mesh) || !(secondMesh instanceof Mesh)) throw new Error("Fadeable clones must be meshes.");
    expect(firstMesh.geometry).toBe(secondMesh.geometry);
    firstMesh.visibility = .5;
    expect(firstMesh.visibility).toBe(.5);
    expect(secondMesh.visibility).toBe(1);
    const bounds = first.getHierarchyBoundingVectors(true);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(8);
    expect(bounds.min.y).toBeCloseTo(0);
    expect((bounds.max.x + bounds.min.x) / 2).toBeCloseTo(0);
    expect(first.getChildMeshes().some((mesh) => mesh.getTotalVertices() > 0)).toBe(true);
    expect(() => assets.create("croissant", parent, "bad", 0)).toThrow();
    first.dispose();
    second.dispose();
    assets.dispose();
    assets.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    scene.dispose();
    engine.dispose();
  });

  it("reports an optional load failure explicitly without substituting fake geometry", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(manifest))));
    vi.spyOn(SceneLoader, "LoadAssetContainerAsync").mockRejectedValue(new Error("missing fixture"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const notify = vi.fn();
    const assets = new SimReadyAssets(scene, notify);
    await assets.prepare(["croissant"]);
    expect(assets.errors.get("croissant")).toContain("missing fixture");
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("croissant unavailable"));
    expect(error).toHaveBeenCalled();
    expect(assets.create("croissant", new TransformNode("test", scene), "missing", 1)).toBeUndefined();
    expect(scene.meshes).toHaveLength(0);
    scene.dispose();
    engine.dispose();
  });
});
