import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { routeAnchor } from "../camera/CameraPath";
import { DEPLOY_ROCKET, rocketLift } from "../content/showBeats";
import { HEIGHT, ROOF_THICKNESS, cellPosition, createTitleCells } from "../content/title";
import { DeployRocket } from "./DeployRocket";

vi.mock("./WorldText", () => ({
  createWorldText: (scene: Scene, options: { name: string; width: number; height: number }) => {
    const mesh = MeshBuilder.CreatePlane(options.name, { width: options.width, height: options.height }, scene);
    mesh.material = new StandardMaterial(`${options.name} test material`, scene);
    return mesh;
  },
}));

describe("rocket ceiling crash", () => {
  it("places the next-corner launch pad inside the D, clear of its ceiling ribs", () => {
    const anchor = routeAnchor(DEPLOY_ROCKET.time, DEPLOY_ROCKET.lateral);
    const corner = cellPosition(3, 6);
    expect(createTitleCells().some((cell) => cell.line === 0 && cell.letter === 0 && cell.col === 3 && cell.row === 6)).toBe(true);
    expect(Math.abs(anchor.position.x - corner.x) + DEPLOY_ROCKET.width / 2).toBeLessThan(13);
    expect(Math.abs(anchor.position.z - corner.z) + DEPLOY_ROCKET.width / 2).toBeLessThan(13);
    expect(DEPLOY_ROCKET.time).toBeGreaterThan(148);
  });

  it("keeps the pad fixed and contacts the actual roof underside without crossing it", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const rocket = new DeployRocket(scene, new PBRMaterial("metal", scene));
    const pad = scene.getMeshByName("Rocket / launch pad");
    const nose = scene.getMeshByName("Rocket / payload fairing");
    if (!pad || !nose) throw new Error("Rocket pad and nose must exist.");
    rocket.update(DEPLOY_ROCKET.launch - 1);
    expect(rocket.airframe.position.y).toBe(0);
    let previous = 0;
    for (let time = DEPLOY_ROCKET.launch; time <= DEPLOY_ROCKET.impact + .1; time += .01) {
      rocket.update(time);
      nose.computeWorldMatrix(true);
      const tip = nose.getBoundingInfo().boundingBox.maximumWorld.y;
      expect(tip).toBeLessThanOrEqual(HEIGHT - ROOF_THICKNESS / 2 + 1e-5);
      expect(rocket.airframe.position.y).toBeGreaterThanOrEqual(previous);
      previous = rocket.airframe.position.y;
      pad.computeWorldMatrix(true);
      expect(pad.getBoundingInfo().boundingBox.minimumWorld.y).toBeCloseTo(0);
    }
    rocket.update(DEPLOY_ROCKET.impact);
    nose.computeWorldMatrix(true);
    expect(nose.getBoundingInfo().boundingBox.maximumWorld.y).toBeCloseTo(DEPLOY_ROCKET.ceiling);
    expect(rocket.airframe.isEnabled()).toBe(false);
    expect(rocket.particles.isEnabled()).toBe(true);
    expect(rocketLift(180)).toBeCloseTo(DEPLOY_ROCKET.ceiling - DEPLOY_ROCKET.height);
    scene.dispose();
    engine.dispose();
  });

  it("uses bounded downward particles and deterministically restores launch, explosion and cleanup on seek", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const rocket = new DeployRocket(scene, new PBRMaterial("metal", scene));
    const velocities = rocket.particles.getVerticesData(VertexBuffer.PositionKind);
    if (!velocities) throw new Error("Explosion particle velocities must exist.");
    expect(rocket.particles.getTotalVertices()).toBe(DEPLOY_ROCKET.particleCount);
    for (let i = 0; i < velocities.length; i += 3) {
      expect(velocities[i + 1]).toBeLessThan(0);
      expect(Math.hypot(velocities[i], velocities[i + 2])).toBeLessThanOrEqual(7.5);
    }
    const flash = scene.getMeshByName("FX/Rocket / impact flash");
    const shock = scene.getMeshByName("FX/Rocket / ceiling shockwave");
    if (!flash || !shock) throw new Error("Impact flash and shockwave must exist.");
    rocket.update(DEPLOY_ROCKET.impact + .1);
    const scale = flash.scaling.clone();
    const opacity = flash.visibility;
    expect(flash.isEnabled()).toBe(true);
    expect(shock.isEnabled()).toBe(true);
    rocket.update(180);
    expect(rocket.root.isEnabled()).toBe(false);
    expect(rocket.particles.isEnabled()).toBe(false);
    expect(flash.isEnabled()).toBe(false);
    expect(shock.isEnabled()).toBe(false);
    rocket.update(DEPLOY_ROCKET.launch - 1);
    expect(rocket.root.isEnabled()).toBe(true);
    expect(rocket.airframe.isEnabled()).toBe(true);
    expect(rocket.airframe.position.y).toBe(0);
    expect(rocket.particles.isEnabled()).toBe(false);
    rocket.update(DEPLOY_ROCKET.impact + .1);
    expect(flash.scaling).toEqual(scale);
    expect(flash.visibility).toBe(opacity);
    expect(rocket.particles.isEnabled()).toBe(true);
    rocket.update(DEPLOY_ROCKET.end);
    expect(rocket.particles.isEnabled()).toBe(false);
    expect(flash.isEnabled()).toBe(false);
    expect(shock.isEnabled()).toBe(false);
    expect(rocket.airframe.isEnabled()).toBe(false);
    scene.dispose();
    engine.dispose();
  });
});
