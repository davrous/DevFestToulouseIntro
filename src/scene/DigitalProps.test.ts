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

vi.mock("./WorldText", () => ({
  routeAnchor,
  createWorldText: (scene: Scene, options: { name: string; width: number; height: number }) => {
    const mesh = MeshBuilder.CreatePlane(options.name, { width: options.width, height: options.height }, scene);
    mesh.material = new StandardMaterial(`${options.name} test material`, scene);
    return mesh;
  },
}));

describe("digital speaker props", () => {
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
