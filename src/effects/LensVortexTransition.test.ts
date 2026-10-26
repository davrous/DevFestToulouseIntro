import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA } from "../content/showBeats";
import { LensVortexTransition, lensVortexState } from "./LensVortexTransition";

describe("camera-lens demoscene vortex", () => {
  it("starts only after the lens is entered, keeps the reels/popcorn window and clears before Eric", () => {
    expect(CINEMA.lens).toBeGreaterThan(CINEMA.davidGate);
    expect(lensVortexState(CINEMA.lens).active).toBe(false);
    expect(lensVortexState(CINEMA.lens + .65).strength).toBe(1);
    expect(lensVortexState(CINEMA.popcorn).active).toBe(true);
    expect(lensVortexState(CINEMA.vortexEnd).active).toBe(false);
    expect(lensVortexState(98).active).toBe(false);
    expect(CINEMA.vortexEnd).toBeLessThan(99);
    for (let time = CINEMA.lens; time <= CINEMA.vortexEnd; time += .025) {
      const state = lensVortexState(time);
      expect(state.strength).toBeGreaterThanOrEqual(0);
      expect(state.strength).toBeLessThanOrEqual(1);
      lensVortexState(180);
      lensVortexState(0);
      expect(lensVortexState(time)).toEqual(state);
    }
    expect(() => lensVortexState(Infinity)).toThrow();
  });

  it("precompiles and stays after the render pipeline, including pause/seek and bloom toggles", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new FreeCamera("Vortex camera", Vector3.Zero(), scene);
    const pipeline = new DefaultRenderingPipeline("Vortex pipeline", false, scene, [camera]);
    const vortex = new LensVortexTransition(camera, pipeline);
    await vortex.prepare();
    expect(vortex.postProcess.isReady()).toBe(true);
    vortex.update(CINEMA.popcorn);
    vortex.update(CINEMA.popcorn);
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
