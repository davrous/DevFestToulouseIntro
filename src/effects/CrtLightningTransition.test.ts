import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA } from "../content/showBeats";
import { CrtLightningTransition, crtLightningState } from "./CrtLightningTransition";

describe("59.2s CRT lightning strike", () => {
  it("starts at the exact drum cue with one strong decaying pulse and deterministic seek/replay", () => {
    expect(CINEMA.crtSync).toBe(59.2);
    expect(crtLightningState(59.199).active).toBe(false);
    expect(crtLightningState(59.2).energy).toBe(1);
    expect(crtLightningState(59.3).energy).toBeLessThan(1);
    expect(crtLightningState(59.5).energy).toBeLessThan(crtLightningState(59.3).energy);
    expect(crtLightningState(CINEMA.crtSyncEnd).active).toBe(false);
    const state = crtLightningState(59.35);
    crtLightningState(180); crtLightningState(0);
    expect(crtLightningState(59.35)).toEqual(state);
    expect(() => crtLightningState(NaN)).toThrow();
  });

  it("precompiles and follows pipeline rebuilds without accumulating postprocesses", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const camera = new FreeCamera("CRT camera", Vector3.Zero(), scene);
    const pipeline = new DefaultRenderingPipeline("CRT pipeline", false, scene, [camera]);
    const flash = new CrtLightningTransition(camera, pipeline, []);
    await flash.prepare();
    flash.update(59.2); flash.update(59.2);
    expect(camera._postProcesses.filter((pass) => pass === flash.postProcess)).toHaveLength(1);
    pipeline.bloomEnabled = true;
    expect(camera._postProcesses.filter(Boolean).at(-1)).toBe(flash.postProcess);
    flash.update(60);
    expect(camera._postProcesses).not.toContain(flash.postProcess);
    scene.dispose(); engine.dispose();
  });
});
