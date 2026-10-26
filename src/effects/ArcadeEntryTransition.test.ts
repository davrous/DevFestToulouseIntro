import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ARCADE_ENTRY, CLAP_CRT } from "../content/showBeats";
import { ArcadeEntryTransition, arcadeEntryState } from "./ArcadeEntryTransition";

describe("retro-gaming screen entry", () => {
  it("starts one second later than 3.3s and completely clears when the camera crosses the panel", () => {
    expect(ARCADE_ENTRY.start).toBeCloseTo(3.3 + 1);
    expect(ARCADE_ENTRY.end).toBe(ARCADE_ENTRY.cross);
    expect(ARCADE_ENTRY.panelFadeStart).toBeGreaterThan(ARCADE_ENTRY.start);
    expect(ARCADE_ENTRY.panelFadeEnd).toBeLessThan(ARCADE_ENTRY.cross);
    expect(ARCADE_ENTRY.end).toBeLessThan(CLAP_CRT.start);
    expect(arcadeEntryState(ARCADE_ENTRY.cross - .4).strength).toBe(1);
    expect(arcadeEntryState(ARCADE_ENTRY.cross - .4).burst).toBe(1);
    for (const time of [0, ARCADE_ENTRY.start, ARCADE_ENTRY.end, 27, 51.18, 180]) {
      expect(arcadeEntryState(time)).toEqual({ active: false, elapsed: 0, strength: 0, burst: 0 });
    }
  });

  it("fades continuously, bounds all uniforms and repeats exactly on pause and rewind", () => {
    expect(arcadeEntryState(ARCADE_ENTRY.start + .001).strength).toBeLessThan(.001);
    expect(arcadeEntryState(ARCADE_ENTRY.end - .001).strength).toBeLessThan(.001);
    for (let time = ARCADE_ENTRY.start + .001; time < ARCADE_ENTRY.end; time += 1 / 120) {
      const state = arcadeEntryState(time);
      for (const value of [state.strength, state.burst]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(Math.abs(arcadeEntryState(time + .0001).strength - state.strength)).toBeLessThan(.001);
      arcadeEntryState(180);
      arcadeEntryState(0);
      expect(arcadeEntryState(time)).toEqual(state);
    }
    expect(() => arcadeEntryState(NaN)).toThrow();
  });

  it("precompiles, survives pipeline changes and detaches outside the entry window", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new FreeCamera("Arcade entry camera", Vector3.Zero(), scene);
    const pipeline = new DefaultRenderingPipeline("Arcade entry pipeline", false, scene, [camera]);
    const transition = new ArcadeEntryTransition(camera, pipeline);
    await transition.prepare();
    expect(transition.postProcess.isReady()).toBe(true);
    expect(camera._postProcesses).not.toContain(transition.postProcess);
    transition.update(ARCADE_ENTRY.cross - .4);
    transition.update(ARCADE_ENTRY.cross - .4);
    expect(camera._postProcesses.filter((pass) => pass === transition.postProcess)).toHaveLength(1);
    pipeline.bloomEnabled = true;
    pipeline.fxaaEnabled = true;
    expect(camera._postProcesses.filter(Boolean).at(-1)).toBe(transition.postProcess);
    pipeline.bloomEnabled = false;
    pipeline.imageProcessingEnabled = false;
    expect(camera._postProcesses.filter(Boolean).at(-1)).toBe(transition.postProcess);
    transition.update(ARCADE_ENTRY.end);
    expect(camera._postProcesses).not.toContain(transition.postProcess);
    transition.update(ARCADE_ENTRY.cross - .4);
    expect(camera._postProcesses).toContain(transition.postProcess);
    transition.update(0);
    expect(camera._postProcesses).not.toContain(transition.postProcess);
    transition.update(ARCADE_ENTRY.cross - .4);
    scene.dispose();
    expect(engine.postProcesses).not.toContain(transition.postProcess);
    engine.dispose();
  });

  it("surfaces compilation failures", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new FreeCamera("Arcade shader error camera", Vector3.Zero(), scene);
    const pipeline = new DefaultRenderingPipeline("Arcade shader error pipeline", false, scene, [camera]);
    const transition = new ArcadeEntryTransition(camera, pipeline);
    await transition.prepare();
    const effect = transition.postProcess.getEffect();
    vi.spyOn(transition.postProcess, "updateEffect").mockImplementation(
      (_defines, _uniforms, _samplers, _index, _compiled, error) => error?.(effect, "invalid test shader"));
    await expect(transition.prepare()).rejects.toThrow("Arcade entry shader failed to compile: invalid test shader");
    scene.dispose();
    engine.dispose();
  });
});
