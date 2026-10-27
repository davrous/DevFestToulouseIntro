import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { routeAnchor } from "../camera/CameraPath";
import { SPEAKERS } from "../content/speakers";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { SpeakerPortal } from "./SpeakerPortal";
import { DEPLOY_ROCKET, EasterEggs } from "./EasterEggs";
import { CHOCOLATINE, chocolatineOpacity } from "../content/cues";
import { CINEMA } from "../content/showBeats";

vi.mock("./WorldText", () => ({
  routeAnchor,
  createWorldText: (scene: Scene, options: { name: string; width: number; height: number }) => {
    const mesh = MeshBuilder.CreatePlane(options.name, { width: options.width, height: options.height }, scene);
    mesh.material = new StandardMaterial(`${options.name} test material`, scene);
    return mesh;
  },
}));
vi.mock("@babylonjs/core/Materials/Textures/dynamicTexture", () => ({
  DynamicTexture: class {
    getContext() { return { fillStyle: "", font: "", fillRect() {}, fillText() {} }; }
    update() {}
  },
}));

describe("digital speaker props", () => {
  it("pre-stages the HTTP panel closer to Anne-Flore, square across the corridor, without a timed pop", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const props = new EasterEggs(scene);
    const root = scene.getTransformNodeByName("Toulouse HTTP redirect")!;
    const request = scene.getMeshByName("Chocolatine compiler stage 0")!;
    const redirect = scene.getMeshByName("Chocolatine compiler stage 1")!;
    const anneFlore = routeAnchor(SPEAKERS[0].gateTime).position;
    expect(root.rotation.y).toBe(0);
    expect(CHOCOLATINE.anchor).toBeLessThan(33.5);
    const horizontalDistance = (point: typeof anneFlore) => Math.hypot(point.x - anneFlore.x, point.z - anneFlore.z);
    expect(horizontalDistance(root.position)).toBeLessThan(horizontalDistance(routeAnchor(33.5).position));
    const meshes = scene.meshes.length;
    for (const time of [0, 15, 24, 26.999, 27, 28.999, 29, 31.85, 32.2, 32.55, 32.75, 36, 27]) {
      props.update(time);
      expect(root.isEnabled()).toBe(true);
      expect(request.isEnabled()).toBe(time < 29 && chocolatineOpacity(time) > 0);
      expect(redirect.isEnabled()).toBe(time >= 29 && chocolatineOpacity(time) > 0);
      expect(redirect.visibility).toBe(chocolatineOpacity(time));
    }
    props.update(32.75, 31.85);
    expect(redirect.visibility).toBe(1);
    expect(scene.meshes).toHaveLength(meshes);
    props.update(CINEMA.start);
    expect(root.isEnabled()).toBe(false);
    scene.dispose();
    engine.dispose();
  });

  it("removes obsolete agent snippets without changing Eric's speaker card", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const portal = new SpeakerPortal(scene, SPEAKERS[2], 2);
    portal.update(103, silentFeatures());
    expect(portal.root.isEnabled()).toBe(true);
    expect(portal.nameMesh.name).toBe("Speaker / Eric Mittelette");
    expect(portal.titleMesh.name).toBe("Demo / IA Barrée");
    expect(scene.meshes.some((mesh) => mesh.name.startsWith("Neural code /"))).toBe(false);
    scene.dispose();
    engine.dispose();
  });

  it("grounds the procedural rocket, preserves orbital link into pullback and clears the rocket before reveal", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const props = new EasterEggs(scene);
    const rocket = scene.getTransformNodeByName("Toulouse / npm run launch");
    const satellite = scene.getTransformNodeByName("Toulouse orbital hardware");
    if (!rocket || !satellite) throw new Error("Launch pad and orbital hardware must exist.");
    const bounds = rocket.getHierarchyBoundingVectors(true);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.max.y).toBeCloseTo(DEPLOY_ROCKET.height);
    props.update(138);
    expect(rocket.isEnabled()).toBe(true);
    expect(scene.getMeshByName("Rocket / deployment stage")).not.toBeNull();
    expect(scene.getMeshByName("Rocket / DEPLOY TO ORBIT")).not.toBeNull();
    props.update(160);
    expect(rocket.isEnabled()).toBe(false);
    expect(satellite.isEnabled()).toBe(true);
    props.update(180);
    expect(satellite.isEnabled()).toBe(false);
    props.update(138);
    expect(rocket.isEnabled()).toBe(true);
    scene.dispose();
    engine.dispose();
  });
});
