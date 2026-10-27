import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { prewarmRenderStates } from "./RenderWarmup";

describe("offscreen intro render warmup", () => {
  it("draws real render states offscreen, waits for render targets and restores time/output/physics", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const camera = new FreeCamera("Show camera", Vector3.Zero(), scene);
    const output = new RenderTargetTexture("Existing output", 32, scene);
    camera.outputRenderTarget = output;
    scene.physicsEnabled = true;
    const ready = vi.spyOn(scene, "whenReadyAsync").mockResolvedValue();
    const states: number[] = [];
    let time = 0;
    const render = vi.spyOn(scene, "render").mockImplementation(() => {
      expect(camera.outputRenderTarget).not.toBe(output);
      expect(scene.physicsEnabled).toBe(false);
      states.push(time);
    });
    const count = scene.textures.length;
    await prewarmRenderStates(scene, camera, [14.01, 17.6, 18.2, 20].map((value) => () => { time = value; }), () => { time = 0; });
    expect(states).toEqual([14.01, 14.01, 17.6, 17.6, 18.2, 18.2, 20, 20]);
    expect(ready.mock.calls.every(([renderTargets]) => renderTargets === true)).toBe(true);
    expect(render).toHaveBeenCalledTimes(8);
    expect(time).toBe(0);
    expect(camera.outputRenderTarget).toBe(output);
    expect(scene.physicsEnabled).toBe(true);
    expect(scene.textures.length).toBe(count);
    scene.dispose(); engine.dispose();
  });

  it("disposes temporary output and restores state when preparation fails, without swallowing the error", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const camera = new FreeCamera("Show camera", Vector3.Zero(), scene);
    scene.physicsEnabled = false;
    vi.spyOn(scene, "whenReadyAsync").mockRejectedValue(new Error("GPU warmup failure"));
    const evaluate = vi.fn(), restore = vi.fn(), count = scene.textures.length;
    await expect(prewarmRenderStates(scene, camera, [evaluate], restore)).rejects.toThrow("GPU warmup failure");
    expect(evaluate).toHaveBeenCalledOnce();
    expect(restore).toHaveBeenCalledOnce();
    expect(camera.outputRenderTarget).toBeNull();
    expect(scene.physicsEnabled).toBe(false);
    expect(scene.textures.length).toBe(count);
    scene.dispose(); engine.dispose();
  });

  it("still releases the render target if resetting the intro itself fails", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const camera = new FreeCamera("Show camera", Vector3.Zero(), scene);
    scene.physicsEnabled = true;
    const count = scene.textures.length;
    await expect(prewarmRenderStates(scene, camera, [], () => { throw new Error("Reset failed"); }))
      .rejects.toThrow("Reset failed");
    expect(camera.outputRenderTarget).toBeNull();
    expect(scene.physicsEnabled).toBe(true);
    expect(scene.textures.length).toBe(count);
    scene.dispose(); engine.dispose();
  });
});
