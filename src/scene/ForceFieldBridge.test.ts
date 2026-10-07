import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { cameraPose } from "../camera/CameraPath";
import { BRIDGE_CLOSE } from "../content/showBeats";
import { CELL, cellPosition } from "../content/title";
import { ForceFieldBridge, bridgeClosure } from "./Labyrinth";

describe("final drawbridge closure", () => {
  it("keeps both decks at corridor level until the camera has escaped, then closes both apertures", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const bridge = new ForceFieldBridge(scene);
    for (const time of [0, 49, 61, 159, 163, BRIDGE_CLOSE.start]) {
      bridge.update(time);
      expect(bridge.leaves.every((leaf) => leaf.position.y === 0 && leaf.rotation.x === 0
        && leaf.scaling.equals(Vector3.One()))).toBe(true);
    }
    expect(cameraPose(BRIDGE_CLOSE.start).position.y).toBeGreaterThan(500);
    bridge.update((BRIDGE_CLOSE.start + BRIDGE_CLOSE.end) / 2);
    expect(bridge.leaves.every((leaf) => leaf.rotation.x < 0 && leaf.rotation.x > -Math.PI / 2)).toBe(true);
    bridge.update(BRIDGE_CLOSE.end);
    const [t, d] = bridge.leaves;
    const tTop = Vector3.TransformCoordinates(new Vector3(0, 0, CELL), t.computeWorldMatrix(true));
    const dTop = Vector3.TransformCoordinates(new Vector3(0, 0, CELL * 2), d.computeWorldMatrix(true));
    expect(tTop.y).toBeCloseTo(26);
    expect(tTop.x).toBeCloseTo(cellPosition(1, 9).x + CELL / 2);
    expect(tTop.z).toBeCloseTo(cellPosition(1, 9).z);
    expect(dTop.y).toBeCloseTo(24);
    expect(dTop.x).toBeCloseTo(cellPosition(2, 6).x);
    expect(dTop.z).toBeCloseTo(cellPosition(2, 6).z - CELL / 2);
    expect(d.scaling.x * CELL).toBeCloseTo(20);
    const settled = bridge.leaves.map((leaf) => Array.from(leaf.getWorldMatrix().asArray()));
    for (const time of [173, 180, 190]) {
      bridge.update(time);
      expect(bridge.root.isEnabled()).toBe(true);
      expect(bridge.leaves.map((leaf) => Array.from(leaf.computeWorldMatrix(true).asArray()))).toEqual(settled);
    }
    bridge.update(60);
    expect(bridge.leaves.every((leaf) => leaf.rotation.x === 0 && leaf.scaling.equals(Vector3.One()))).toBe(true);
    expect(bridgeClosure(0)).toBe(0);
    expect(bridgeClosure(180)).toBe(1);
    scene.dispose();
    engine.dispose();
  });
});
