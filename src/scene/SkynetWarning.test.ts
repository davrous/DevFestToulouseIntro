import { beforeEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SKYNET_WARNING } from "../content/showBeats";
import { cameraPose } from "../camera/CameraPath";
import { createEventDecal, loadEventArtwork } from "./EventBranding";
import { createWorldText } from "./WorldText";
import { SkynetWarning, skynetWarningActive, skynetTriangleIntensity, SKYNET_TRIANGLE_UV_START, SKYNET_WARNING_TEXT } from "./SkynetWarning";

vi.mock("./WorldText", () => ({
  createWorldText: vi.fn((scene: Scene, options: { name: string; width: number; height: number }) => {
    const mesh = MeshBuilder.CreatePlane(options.name, options, scene);
    mesh.material = new StandardMaterial(`${options.name} test material`, scene);
    return mesh;
  }),
}));
vi.mock("./EventBranding", () => ({
  loadEventArtwork: vi.fn(async () => ({ getSize: () => ({ width: 1920, height: 1080 }), clone: () => ({ level: 1 }) })),
  createEventDecal: vi.fn((scene: Scene, name: string, _texture: unknown, size: number) => {
    const mesh = MeshBuilder.CreatePlane(name, { size }, scene);
    mesh.material = new StandardMaterial(`${name} test material`, scene);
    return mesh;
  }),
}));

beforeEach(() => vi.clearAllMocks());

describe("Skynet wall foreshadowing", () => {
  it("preloads the local logo and mounts an opaque warning on the east wall before the right turn", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const warning = new SkynetWarning(scene);
    expect(warning.root.isEnabled()).toBe(false);
    await warning.ready;
    expect(loadEventArtwork).toHaveBeenCalledOnce();
    expect(loadEventArtwork).toHaveBeenCalledWith(scene, expect.stringContaining("skynet-logo.png"), expect.any(String));
    expect(createEventDecal).toHaveBeenCalledTimes(2);
    expect(SKYNET_WARNING_TEXT).toBe("Warning, it's operational!");
    expect(createWorldText).toHaveBeenCalledWith(scene, expect.objectContaining({
      lines: [{ text: "" }, { text: SKYNET_WARNING_TEXT, color: "#ffd1d6", size: 148 }],
    }));
    const logo = scene.getMeshByName("Digital / Skynet logo")!;
    const triangle = scene.getMeshByName("Digital / Skynet warning triangle")!;
    expect(logo.parent).toBe(warning.root);
    expect(triangle.parent).toBe(warning.root);
    expect(logo.scaling.y).toBe(9 / 16 * SKYNET_TRIANGLE_UV_START);
    expect(triangle.scaling.y).toBe(9 / 16 * (1 - SKYNET_TRIANGLE_UV_START));
    const lowerUV = logo.getVerticesData("uv")!.filter((_, index) => index % 2);
    const upperUV = triangle.getVerticesData("uv")!.filter((_, index) => index % 2);
    expect(Math.max(...lowerUV)).toBeCloseTo(SKYNET_TRIANGLE_UV_START);
    expect(Math.min(...upperUV)).toBeCloseTo(SKYNET_TRIANGLE_UV_START);
    expect(Math.min(...lowerUV)).toBe(0);
    expect(Math.max(...upperUV)).toBe(1);
    const logoBounds = logo.getHierarchyBoundingVectors(true);
    const triangleBounds = triangle.getHierarchyBoundingVectors(true);
    expect(logoBounds.max.y).toBeCloseTo(triangleBounds.min.y);
    expect(logoBounds.min.y - warning.root.position.y).toBeGreaterThan(-1.5);
    expect(logo.position.z).toBeLessThan(0);
    expect(warning.mesh.material).toBeInstanceOf(StandardMaterial);
    expect(warning.mesh.material?.transparencyMode).toBe(StandardMaterial.MATERIAL_OPAQUE);
    expect(warning.root.position.asArray()).toEqual([-436, 14.3, 185]);
    const normal = Vector3.TransformNormal(new Vector3(0, 0, -1), warning.root.computeWorldMatrix(true));
    expect(normal.x).toBeCloseTo(-1);
    const bounds = warning.root.getHierarchyBoundingVectors(true);
    expect(bounds.max.x).toBeLessThan(SKYNET_WARNING.wallX);
    expect(bounds.min.y).toBeGreaterThan(0);
    expect(bounds.max.y).toBeLessThan(32.85);
    for (let time = SKYNET_WARNING.readStart; time <= SKYNET_WARNING.readEnd; time += .1) {
      expect(SKYNET_WARNING.x - cameraPose(time).position.x).toBeGreaterThan(12);
    }
    scene.dispose(); engine.dispose();
  });

  it("pulses only the triangle slowly by timeline time and restores the exact state after pause and seek", async () => {
    const engine = new NullEngine(), scene = new Scene(engine), warning = new SkynetWarning(scene);
    warning.update(116.6);
    await warning.ready;
    const triangle = scene.getMeshByName("Digital / Skynet warning triangle")!;
    const wordmark = scene.getMeshByName("Digital / Skynet logo")!;
    if (!(triangle.material instanceof StandardMaterial) || !(wordmark.material instanceof StandardMaterial)) {
      throw new Error("Both Skynet slices must retain standard materials.");
    }
    const steady = wordmark.material.emissiveColor.asArray();
    const count = [scene.meshes.length, scene.materials.length, scene.textures.length];
    expect(SKYNET_WARNING.blinkPeriod).toBeGreaterThan(1);
    for (const [time, intensity] of [[114.8, 1], [115.4, 0], [116, 1], [116.6, 0], [116.6, 0], [116, 1]]) {
      warning.update(time);
      expect(skynetTriangleIntensity(time)).toBeCloseTo(intensity);
      expect(warning.triangleIntensity).toBeCloseTo(intensity);
      expect(triangle.material.emissiveColor.r).toBeCloseTo(.9 * intensity);
      expect(triangle.material.emissiveTexture?.level).toBeCloseTo(intensity);
      expect(wordmark.material.emissiveColor.asArray()).toEqual(steady);
      expect(warning.mesh.visibility).toBe(1);
    }
    expect([scene.meshes.length, scene.materials.length, scene.textures.length]).toEqual(count);
    expect(() => skynetTriangleIntensity(Infinity)).toThrow();
    scene.dispose(); engine.dispose();
  });

  it("keeps the warning present without a timed pop, restores it on rewind and respects rescue gating", async () => {
    const engine = new NullEngine(), scene = new Scene(engine), warning = new SkynetWarning(scene);
    await warning.ready;
    const count = [scene.meshes.length, scene.materials.length, scene.transformNodes.length];
    const position = warning.root.position.asArray();
    for (const time of [0, 94.2, 114.8, 116, 118.7, 120, 133.9, 134, 180, 0, 116, 116]) {
      warning.update(time);
      expect(warning.root.isEnabled()).toBe(skynetWarningActive(time));
      expect(warning.mesh.visibility).toBe(1);
      expect(warning.root.position.asArray()).toEqual(position);
    }
    warning.update(116, false);
    expect(warning.root.isEnabled()).toBe(false);
    warning.update(116);
    expect(warning.root.isEnabled()).toBe(true);
    expect([scene.meshes.length, scene.materials.length, scene.transformNodes.length]).toEqual(count);
    expect(() => warning.update(NaN)).toThrow();
    scene.dispose(); engine.dispose();
  });

  it("surfaces logo-loading failures instead of silently showing an incomplete warning", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    vi.mocked(loadEventArtwork).mockRejectedValueOnce(new Error("Local logo missing"));
    const warning = new SkynetWarning(scene);
    await expect(warning.ready).rejects.toThrow("Local logo missing");
    scene.dispose(); engine.dispose();
  });
});
