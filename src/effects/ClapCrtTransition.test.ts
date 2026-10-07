import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA, CLAP_CRT } from "../content/showBeats";
import { ClapCrtTransition, clapCrtState } from "./ClapCrtTransition";

describe("arcade to cinema CRT transmission", () => {
  it("keeps the clap and cinema timing and completely clears outside the transition", () => {
    expect(CLAP_CRT.start).toBeLessThan(CINEMA.clapperClose);
    expect(CLAP_CRT.collapse).toBe(CINEMA.clap);
    expect(CLAP_CRT.reopen).toBeGreaterThan(CINEMA.start);
    expect(CLAP_CRT.reopen - CLAP_CRT.collapsed).toBeGreaterThanOrEqual(.24);
    expect(CLAP_CRT.reopen - CLAP_CRT.collapsed).toBeLessThanOrEqual(.26);
    expect(CLAP_CRT.end - CLAP_CRT.start).toBeGreaterThan(1.5);
    expect(CLAP_CRT.end - CLAP_CRT.start).toBeLessThan(1.6);
    for (const time of [0, 49, CLAP_CRT.start, CLAP_CRT.end, 90, 180]) {
      expect(clapCrtState(time)).toEqual({
        active: false, elapsed: 0, signalHeight: 1, pixelation: 0, distortion: 0, scanlines: 0,
      });
    }
  });

  it("pixelates the intact arcade, holds the phosphor line across the scene swap, then reopens the CRT", () => {
    expect(clapCrtState(CINEMA.clapperClose).pixelation).toBeGreaterThan(.5);
    expect(clapCrtState(CINEMA.clap).signalHeight).toBe(1);
    for (let time = CLAP_CRT.collapsed; time <= CLAP_CRT.reopen; time += .001) {
      expect(clapCrtState(time).signalHeight).toBeCloseTo(CLAP_CRT.minimumHeight);
    }
    const opening = clapCrtState((CLAP_CRT.reopen + CLAP_CRT.open) / 2);
    expect(opening.signalHeight).toBeCloseTo((1 + CLAP_CRT.minimumHeight) / 2);
    expect(opening.scanlines).toBe(1);
    expect(clapCrtState(CLAP_CRT.open).signalHeight).toBe(1);
    expect(clapCrtState(CLAP_CRT.end - .001).distortion).toBeLessThan(.001);
  });

  it("has finite bounded uniforms, continuous shutter height and repeatable absolute-time states", () => {
    for (let time = CLAP_CRT.start; time < CLAP_CRT.end; time += 1 / 240) {
      const state = clapCrtState(time);
      expect(state.signalHeight).toBeGreaterThanOrEqual(CLAP_CRT.minimumHeight - 1e-10);
      expect(state.signalHeight).toBeLessThanOrEqual(1);
      for (const value of [state.pixelation, state.distortion, state.scanlines]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(Math.abs(clapCrtState(time + .0001).signalHeight - state.signalHeight)).toBeLessThan(.002);
      clapCrtState(180);
      clapCrtState(0);
      expect(clapCrtState(time)).toEqual(state);
    }
  });

  it("precompiles before playback, follows seek and remains last after a bloom/FXAA rebuild", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new FreeCamera("CRT test camera", Vector3.Zero(), scene);
    const pipeline = new DefaultRenderingPipeline("CRT test pipeline", false, scene, [camera]);
    const transition = new ClapCrtTransition(camera, pipeline);
    await transition.prepare();
    expect(transition.postProcess.isReady()).toBe(true);
    expect(camera._postProcesses).not.toContain(transition.postProcess);
    transition.update(CINEMA.clap + .05);
    expect(camera._postProcesses.filter(Boolean).at(-1)).toBe(transition.postProcess);
    const size = camera._postProcesses.filter(Boolean).length;
    transition.update(CINEMA.clap + .05);
    expect(camera._postProcesses.filter(Boolean)).toHaveLength(size);
    pipeline.bloomEnabled = true;
    pipeline.fxaaEnabled = true;
    expect(camera._postProcesses.filter(Boolean).at(-1)).toBe(transition.postProcess);
    expect(camera._postProcesses.filter((pass) => pass === transition.postProcess)).toHaveLength(1);
    pipeline.bloomEnabled = false;
    pipeline.imageProcessingEnabled = false;
    expect(camera._postProcesses.filter(Boolean).at(-1)).toBe(transition.postProcess);
    transition.update(CLAP_CRT.end);
    expect(camera._postProcesses).not.toContain(transition.postProcess);
    transition.update(CINEMA.start + .1);
    expect(camera._postProcesses).toContain(transition.postProcess);
    transition.update(49);
    expect(camera._postProcesses).not.toContain(transition.postProcess);
    transition.update(180);
    expect(camera._postProcesses).not.toContain(transition.postProcess);
    transition.update(CINEMA.start + .1);
    scene.dispose();
    expect(engine.postProcesses).not.toContain(transition.postProcess);
    engine.dispose();
  });

  it("surfaces shader compilation errors instead of silently cutting to black", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new FreeCamera("CRT test camera", Vector3.Zero(), scene);
    const pipeline = new DefaultRenderingPipeline("CRT test pipeline", false, scene, [camera]);
    const transition = new ClapCrtTransition(camera, pipeline);
    await transition.prepare();
    const effect = transition.postProcess.getEffect();
    vi.spyOn(transition.postProcess, "updateEffect").mockImplementation(
      (_defines, _uniforms, _samplers, _index, _compiled, error) => error?.(effect, "invalid test shader"));
    await expect(transition.prepare()).rejects.toThrow("CRT transition shader failed to compile: invalid test shader");
    scene.dispose();
    engine.dispose();
  });
});
