import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { BUFFER_OVERFLOW, bufferAnchor, bufferCubePosition, DigitalOverflow } from "./DigitalOverflow";
import { bufferFillState } from "../effects/BufferWater";
import { cellPosition } from "../content/title";

vi.mock("./WorldText", () => ({
  createWorldText: (scene: Scene, options: { name: string }) => new Mesh(options.name, scene),
}));

describe("cube-triggered water buffer overflow", () => {
  it("faces the incoming camera square across the corridor, perpendicular to the right wall", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const overflow = new DigitalOverflow(scene);
    const anchor = bufferAnchor();
    expect(overflow.root.position.asArray()).toEqual(anchor.position.asArray());
    expect(overflow.root.rotation.y).toBe(Math.PI);
    expect(overflow.root.position.x).toBe(cellPosition(3, 1).x - 2.5);
    const normal = new Vector3(Math.sin(anchor.yaw), 0, Math.cos(anchor.yaw));
    expect(Math.abs(Vector3.Dot(normal, Vector3.Right()))).toBeLessThan(1e-10);
    expect(scene.getMeshByName("Digital / buffer glass front")).not.toBeNull();
    scene.dispose();
    engine.dispose();
  });

  it("fills one fixed 32-slot volume progressively and reveals the title only when the extra cube arrives", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const overflow = new DigitalOverflow(scene);
    const bytes = scene.meshes.filter((mesh) => mesh.name.startsWith("Digital / overflowing byte"));
    const label = scene.getMeshByName("Digital / BUFFER OVERFLOW")!;
    expect(bytes).toHaveLength(BUFFER_OVERFLOW.count + 1);
    overflow.update(BUFFER_OVERFLOW.start);
    expect(bytes.filter((mesh) => mesh.isEnabled())).toHaveLength(1);
    expect(label.visibility).toBe(0);
    const halfway = BUFFER_OVERFLOW.start + 1.5;
    overflow.update(halfway);
    const half = bufferFillState(halfway);
    expect(half.filled).toBeGreaterThan(5);
    expect(half.filled).toBeLessThan(BUFFER_OVERFLOW.count);
    expect(label.visibility).toBe(0);
    overflow.update(BUFFER_OVERFLOW.spill - .001);
    expect(bufferFillState(BUFFER_OVERFLOW.spill - .001).filled).toBe(BUFFER_OVERFLOW.count);
    expect(label.visibility).toBe(0);
    expect(overflow.water.spill.isEnabled()).toBe(false);
    const positions = bytes.slice(0, BUFFER_OVERFLOW.count).map((byte) => byte.position.asArray());
    for (const byte of bytes.slice(0, BUFFER_OVERFLOW.count)) {
      expect(byte.position.x).toBeGreaterThan(BUFFER_OVERFLOW.tankX - 2.8);
      expect(byte.position.x).toBeLessThan(BUFFER_OVERFLOW.tankX + 2.8);
      expect(byte.position.y).toBeGreaterThan(BUFFER_OVERFLOW.tankFloor);
      expect(byte.position.y + .45).toBeLessThan(BUFFER_OVERFLOW.tankRim);
      expect(Math.abs(byte.position.z)).toBeLessThan(2.2);
    }
    overflow.update(BUFFER_OVERFLOW.spill + .3);
    expect(label.visibility).toBeGreaterThan(.9);
    expect(overflow.water.spill.isEnabled()).toBe(true);
    expect(bytes.slice(0, BUFFER_OVERFLOW.count).map((byte) => byte.position.asArray())).toEqual(positions);
    expect(bytes.at(-1)!.position.y).toBeCloseTo(5.65);
    expect(overflow.water.surface.position.y).toBeGreaterThan(BUFFER_OVERFLOW.tankRim);
    scene.dispose();
    engine.dispose();
  });

  it("replays every cube, wave and caption exactly without accumulating scene or physics objects", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const overflow = new DigitalOverflow(scene);
    const count = scene.meshes.length;
    const sample = (time: number) => {
      overflow.update(time);
      return {
        cubes: scene.meshes.filter((mesh) => mesh.name.startsWith("Digital / overflowing byte"))
          .map((mesh) => ({ position: mesh.position.asArray(), enabled: mesh.isEnabled() })),
        caption: scene.getMeshByName("Digital / BUFFER OVERFLOW")!.visibility,
        level: overflow.water.surface.position.y,
        spill: overflow.water.spill.isEnabled(),
      };
    };
    const original = sample(111);
    sample(180); sample(107.5); sample(114); sample(0);
    expect(sample(111)).toEqual(original);
    expect(scene.meshes).toHaveLength(count);
    expect(scene.meshes.every((mesh) => !mesh.physicsBody)).toBe(true);
    expect(() => bufferCubePosition(107, -1)).toThrow();
    expect(() => bufferFillState(NaN)).toThrow();
    scene.dispose();
    engine.dispose();
  });

  it("precompiles both cheap water shaders and bounds the height and spill envelopes", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const overflow = new DigitalOverflow(scene);
    await overflow.water.material.forceCompilationAsync(overflow.water.surface);
    await overflow.water.spill.material!.forceCompilationAsync(overflow.water.spill);
    for (let time = 106; time < 118; time += .02) {
      const state = bufferFillState(time);
      expect(state.filled).toBeGreaterThanOrEqual(0);
      expect(state.filled).toBeLessThanOrEqual(BUFFER_OVERFLOW.count);
      expect(state.waterHeight).toBeGreaterThanOrEqual(2.2);
      expect(state.waterHeight).toBeLessThanOrEqual(6.31);
      expect(state.spill).toBeGreaterThanOrEqual(0);
      expect(state.spill).toBeLessThanOrEqual(1);
      if (time < BUFFER_OVERFLOW.spill) {
        expect(state.spill).toBe(0);
        expect(state.label).toBe(0);
      }
    }
    scene.dispose();
    engine.dispose();
  });
});
