import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA } from "../content/showBeats";
import { LensVortexTransition, lensVortexState } from "./LensVortexTransition";
import { LENS_PORTAL_RADIUS, LensTunnelPreview, TUNNEL_SPEAKER_TRAILS } from "./TunnelRendering";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { routeAnchor } from "../camera/CameraPath";
import { SPEAKERS } from "../content/speakers";

describe("camera-lens demoscene vortex", () => {
  it("accelerates exactly at 80 seconds and clears at precisely 94.2", () => {
    expect(CINEMA.lens).toBeGreaterThan(CINEMA.davidGate);
    expect(lensVortexState(CINEMA.lens).active).toBe(true);
    expect(lensVortexState(CINEMA.lens + .65).strength).toBe(1);
    for (const time of [CINEMA.reels, CINEMA.popcorn, 79.999]) {
      expect(lensVortexState(time).active).toBe(false);
    }
    expect(CINEMA.camera).toBe(80);
    expect(CINEMA.lens - CINEMA.camera).toBeLessThan(.5);
    expect(lensVortexState(80).active).toBe(true);
    expect(CINEMA.vortexEnd).toBe(94.2);
    expect(lensVortexState(94.199).active).toBe(true);
    expect(lensVortexState(94.199).exit).toBeLessThan(1);
    expect(lensVortexState(94.2).exit).toBe(1);
    expect(lensVortexState(CINEMA.vortexEnd).active).toBe(false);
    expect(lensVortexState(98).active).toBe(false);
    expect(CINEMA.vortexEnd).toBeLessThan(98);
    for (let time = CINEMA.lens; time <= CINEMA.vortexEnd; time += .025) {
      const state = lensVortexState(time);
      expect(state.strength).toBeGreaterThanOrEqual(0);
      expect(state.strength).toBeLessThanOrEqual(1);
      expect(state.turn).toBeGreaterThanOrEqual(0);
      expect(state.turn).toBeLessThanOrEqual(1);
      expect(state.exit).toBeGreaterThanOrEqual(0);
      expect(state.exit).toBeLessThanOrEqual(1);
      lensVortexState(180);
      lensVortexState(0);
      expect(lensVortexState(time)).toEqual(state);
    }
    expect(() => lensVortexState(Infinity)).toThrow();
  });

  it("fits a shared opaque preview inside the lens rim and assigns one trail to each speaker", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const parent = new TransformNode("Lens parent", scene);
    const anchor = routeAnchor(CINEMA.lens);
    const preview = new LensTunnelPreview(scene, parent, anchor.position, anchor.yaw);
    const axis = new Vector3(Math.sin(anchor.yaw), 0, Math.cos(anchor.yaw));
    expect(Vector3.Cross(preview.mesh.position.subtract(anchor.position), axis).length()).toBeLessThan(.0001);
    expect(preview.mesh.rotation.y).toBe(anchor.yaw);
    expect(LENS_PORTAL_RADIUS).toBeLessThan(13.6 / 2 - .24 / 2);
    expect(13.6 / 2 - .24 / 2 - LENS_PORTAL_RADIUS).toBeLessThan(.03);
    preview.update(79.9);
    expect(preview.mesh.isEnabled()).toBe(true);
    expect(preview.material.needAlphaBlending()).toBe(false);
    preview.update(CINEMA.lens);
    expect(preview.mesh.isEnabled()).toBe(false);
    expect(lensVortexState(CINEMA.lens).active).toBe(true);
    expect(TUNNEL_SPEAKER_TRAILS.map((trail) => trail.name)).toEqual(SPEAKERS.map((speaker) => speaker.name));
    expect(new Set(TUNNEL_SPEAKER_TRAILS.map((trail) => trail.color)).size).toBe(4);
    scene.dispose(); engine.dispose();
  });

  it("curves toward the actual right-hand camera turn and opens an exit aperture", () => {
    expect(lensVortexState(CINEMA.lens + .01).turn).toBeLessThan(.01);
    expect(lensVortexState(91.5).turn).toBeGreaterThan(0);
    expect(lensVortexState(CINEMA.vortexExit).turn).toBe(1);
    expect(lensVortexState(CINEMA.vortexExit).exit).toBe(0);
    expect(lensVortexState((CINEMA.vortexExit + CINEMA.vortexEnd) / 2).exit).toBeCloseTo(.5);
    expect(lensVortexState(CINEMA.vortexEnd).exit).toBe(1);
  });

  it("precompiles and stays after the render pipeline, including pause/seek and bloom toggles", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new FreeCamera("Vortex camera", Vector3.Zero(), scene);
    const pipeline = new DefaultRenderingPipeline("Vortex pipeline", false, scene, [camera]);
    const vortex = new LensVortexTransition(camera, pipeline);
    await vortex.prepare();
    expect(vortex.postProcess.isReady()).toBe(true);
    vortex.update(CINEMA.lens + 1);
    vortex.update(CINEMA.lens + 1);
    expect(camera._postProcesses.filter((pass) => pass === vortex.postProcess)).toHaveLength(1);
    pipeline.bloomEnabled = true;
    pipeline.imageProcessingEnabled = false;
    expect(camera._postProcesses.filter(Boolean).at(-1)).toBe(vortex.postProcess);
    vortex.update(CINEMA.vortexEnd);
    expect(camera._postProcesses).not.toContain(vortex.postProcess);
    vortex.update(CINEMA.lens + .5);
    expect(camera._postProcesses).toContain(vortex.postProcess);
    scene.dispose();
    expect(engine.postProcesses).not.toContain(vortex.postProcess);
    engine.dispose();
  });
});
