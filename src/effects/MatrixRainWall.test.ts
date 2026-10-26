import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MATRIX_GLYPHS, MATRIX_SIGNATURE, MATRIX_WALL, MatrixRainWall } from "./MatrixRainWall";

const canvas = vi.hoisted(() => ({ text: vi.fn(), updates: vi.fn() }));
vi.mock("@babylonjs/core/Materials/Textures/dynamicTexture", () => ({
  DynamicTexture: class {
    getContext() {
      return { fillStyle: "", font: "", clearRect() {}, fillText: canvas.text, measureText: () => ({ width: 28 }) };
    }
    update = canvas.updates;
  },
}));

describe("readable Matrix-style snack wall", () => {
  it("builds a real glyph atlas once and places the rain on the wall beside the machine", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const root = new TransformNode("vending stage", scene);
    canvas.text.mockClear();
    canvas.updates.mockClear();
    const wall = new MatrixRainWall(scene, root, 4);
    expect(canvas.text).toHaveBeenCalledTimes(MATRIX_GLYPHS.length);
    expect(canvas.updates).toHaveBeenCalledTimes(1);
    expect(MATRIX_GLYPHS.length).toBeLessThanOrEqual(64);
    expect([...MATRIX_SIGNATURE].every((glyph) => MATRIX_GLYPHS.includes(glyph))).toBe(true);
    expect(MATRIX_SIGNATURE).toBe("DEVFESTTOULOUSE");
    expect(wall.mesh.parent).toBe(root);
    expect(wall.mesh.position.asArray()).toEqual([MATRIX_WALL.offsetX, MATRIX_WALL.centerY, 4 - MATRIX_WALL.inset]);
    expect(wall.mesh.rotation.y).toBe(0);
    const clock = vi.spyOn(wall.material, "setFloat");
    wall.update(61.5);
    expect(clock).toHaveBeenLastCalledWith("time", 61.5);
    wall.update(64); wall.update(58); wall.update(61.5);
    expect(clock).toHaveBeenLastCalledWith("time", 61.5);
    expect(canvas.updates).toHaveBeenCalledTimes(1);
    expect(() => wall.update(NaN)).toThrow();
    scene.dispose();
    engine.dispose();
  });
});
