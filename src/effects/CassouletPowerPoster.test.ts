import { afterEach, describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CASSOULET_POWER_POSTER, CASSOULET_POWER_TITLE, CassouletPowerPoster, cassouletPowerState } from "./CassouletPowerPoster";
import { CASSOULET_WALL_POSTER } from "../content/showBeats";
import { CELL, createTitleCells } from "../content/title";

const canvas = vi.hoisted(() => {
  const text = vi.fn(), update = vi.fn(), dispose = vi.fn();
  const context = {
    clearRect() {}, fillRect() {}, strokeRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {}, arc() {}, ellipse() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, strokeText() {}, fillText: text,
    measureText: (value: string) => ({ width: value.length * 65 }),
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  return { text, update, dispose, context };
});
vi.mock("@babylonjs/core/Materials/Textures/dynamicTexture", () => ({
  DynamicTexture: class {
    getContext() { return canvas.context; }
    update = canvas.update;
    dispose = canvas.dispose;
  },
}));

describe("The Power Of Cassoulet wall manga", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("waits for victory, then stays on the wall instead of disappearing after one second", () => {
    const destruction = 126.25, start = destruction + CASSOULET_POWER_POSTER.delay;
    expect(cassouletPowerState(126, undefined).active).toBe(false);
    expect(cassouletPowerState(start - .001, destruction).active).toBe(false);
    expect(cassouletPowerState(start, destruction).active).toBe(true);
    expect(cassouletPowerState(start + .05, destruction).opacity).toBe(1);
    expect(cassouletPowerState(150, destruction).active).toBe(true);
    expect(cassouletPowerState(159, destruction).opacity).toBe(1);
    expect(cassouletPowerState(180, destruction).active).toBe(true);
    expect(cassouletPowerState(180.001, destruction).active).toBe(false);
    expect(cassouletPowerState(start + .2, destruction, false).active).toBe(false);
    expect(() => cassouletPowerState(NaN, destruction)).toThrow();
    expect(() => cassouletPowerState(127, Infinity)).toThrow();
  });

  it("restores the same fixed presence after pause, rewind and replay", () => {
    const state = cassouletPowerState(154, 126.25);
    cassouletPowerState(180, 126.25); cassouletPowerState(0, undefined);
    expect(cassouletPowerState(154, 126.25)).toEqual(state);
  });

  it("preloads a local font before drawing the wall comic, without any fullscreen postprocess", async () => {
    canvas.text.mockClear(); canvas.update.mockClear(); canvas.dispose.mockClear();
    const load = vi.fn(async () => ({})), add = vi.fn();
    vi.stubGlobal("FontFace", class { load = load; });
    vi.stubGlobal("document", { fonts: { add }, removeEventListener() {} });
    const engine = new NullEngine(), scene = new Scene(engine);
    const camera = new FreeCamera("Comic camera", Vector3.Zero(), scene);
    const poster = new CassouletPowerPoster(scene);
    expect(canvas.update).not.toHaveBeenCalled();
    await poster.prepare();
    expect(load).toHaveBeenCalledOnce();
    expect(add).toHaveBeenCalledOnce();
    expect(poster.artwork.anisotropicFilteringLevel).toBe(8);
    expect(CASSOULET_POWER_TITLE).toBe("The Power Of Cassoulet!");
    expect(canvas.text.mock.calls.map(([text]) => text)).toEqual(expect.arrayContaining([
      "The Power Of", "Cassoulet!", "CASSOULET", "K.O.!", "T-800", "T-800: 0 / TERROIR: 1",
    ]));
    expect(canvas.update).toHaveBeenCalledTimes(1);
    expect(poster.mesh.material).toMatchObject({ emissiveColor: { r: 0, g: 0, b: 0 } });
    expect(poster.frame.material).toMatchObject({ disableLighting: true });
    poster.update(154, 126.25);
    const matrix = Array.from(poster.root.computeWorldMatrix(true).asArray());
    camera.position.set(123, 32, -40);
    poster.update(180, 126.25); poster.update(0, undefined); poster.update(154, 126.25);
    expect(Array.from(poster.root.computeWorldMatrix(true).asArray())).toEqual(matrix);
    expect(poster.root.position.asArray()).toEqual([CASSOULET_WALL_POSTER.x, CASSOULET_WALL_POSTER.y, CASSOULET_WALL_POSTER.z]);
    expect(poster.root.rotation.asArray()).toEqual([0, CASSOULET_WALL_POSTER.yaw, 0]);
    expect(camera._postProcesses.filter(Boolean)).toHaveLength(0);
    expect(createTitleCells().some((cell) => cell.col === 3 && cell.row === 5 && cell.line === 0)).toBe(true);
    expect(createTitleCells().some((cell) => cell.col === 2 && cell.row === 5 && cell.line === 0)).toBe(false);
    const bounds = poster.frame.getHierarchyBoundingVectors(true);
    expect(bounds.min.x).toBeCloseTo(CASSOULET_WALL_POSTER.wallX - .03, 4);
    expect(bounds.min.z).toBeGreaterThan(CASSOULET_WALL_POSTER.z - CELL / 2 + .75);
    expect(bounds.max.z).toBeLessThan(CASSOULET_WALL_POSTER.z + CELL / 2 - .75);
    expect(canvas.update).toHaveBeenCalledTimes(1);
    poster.update(154, 126.25, false);
    expect(poster.root.isEnabled()).toBe(false);
    scene.dispose();
    expect(canvas.dispose).toHaveBeenCalledTimes(1);
    engine.dispose();
  });
});
