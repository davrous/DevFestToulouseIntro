import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA } from "../content/showBeats";
import { LensVortexTransition, lensVortexState } from "./LensVortexTransition";

describe("camera-lens demoscene vortex", () => {
  it("waits until the reels/popcorn are fully seen, then exits cleanly before Eric", () => {
    expect(CINEMA.lens).toBeGreaterThan(CINEMA.davidGate);
    expect(lensVortexState(CINEMA.lens).active).toBe(false);
    expect(lensVortexState(CINEMA.lens + .65).strength).toBe(1);
    for (const time of [CINEMA.reels, CINEMA.popcorn, CINEMA.popcornEnd]) {
      expect(lensVortexState(time).active).toBe(false);
    }
    expect(CINEMA.lens).toBeGreaterThan(CINEMA.popcornEnd + 1);
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

  it("curves toward the actual right-hand camera turn and opens an exit aperture", () => {
    expect(lensVortexState(CINEMA.lens + .01).turn).toBeLessThan(.01);
    expect(lensVortexState(95).turn).toBeGreaterThan(.6);
    expect(lensVortexState(96).turn).toBeGreaterThan(lensVortexState(94).turn);
    expect(lensVortexState(CINEMA.vortexExit).exit).toBe(0);
    expect(lensVortexState((CINEMA.vortexExit + CINEMA.vortexEnd) / 2).exit).toBeCloseTo(.5);
    expect(lensVortexState(CINEMA.vortexEnd).exit).toBe(1);
    expect(lensVortexState(CINEMA.vortexEnd - .001).strength).toBeLessThan(.001);
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
