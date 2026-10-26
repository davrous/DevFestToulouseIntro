import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { DIGITAL_PROGRESSION, DigitalMoments } from "./DigitalMoments";
import { ASTRONAUT_CORNER } from "../content/showBeats";
import { smoothstep } from "../engine/Timeline";

describe("two digital speaker chapters", () => {
  it("raises the existing adjacent arch with the astronaut, without adding a separate arch", () => {
    const gate = ASTRONAUT_CORNER.gateTime;
    const sample = (time: number) => {
      const engine = new NullEngine();
      const scene = new Scene(engine);
      const digital = new DigitalMoments(scene);
      const mesh = scene.getMeshByName("FX/Digital / evolving data corridor");
      if (!(mesh instanceof Mesh)) throw new Error("Existing corridor arches must be present.");
      const count = scene.meshes.length;
      digital.update(time, silentFeatures());
      // Babylon caches this CPU snapshot; sample each GPU buffer before its first inspection.
      const offset = DIGITAL_PROGRESSION.gates.indexOf(gate) * 4;
      const heights = mesh.thinInstanceGetWorldMatrices().slice(offset, offset + 4).map((matrix) => matrix.getTranslation().y);
      expect(scene.meshes).toHaveLength(count);
      expect(mesh.thinInstanceCount).toBe(24);
      expect(scene.getTransformNodeByName("Digital / astronaut rising arch")).toBeNull();
      scene.dispose(); engine.dispose();
      return heights;
    };
    const initial = sample(ASTRONAUT_CORNER.riseStart);
    const raised = sample(ASTRONAUT_CORNER.riseEnd);
    const height = (time: number) => 8 + 20 * smoothstep((time - gate + 6) / 3);
    const build = height(ASTRONAUT_CORNER.riseEnd) - height(ASTRONAUT_CORNER.riseStart);
    raised.forEach((value, index) => {
      const originalMotion = index < 2 ? build / 2 : index === 2 ? build : 0;
      expect(value - initial[index]).toBeCloseTo(originalMotion + ASTRONAUT_CORNER.gateLift, 4);
    });
    expect(Math.abs(gate - ASTRONAUT_CORNER.anchor)).toBeLessThan(.5);
  });

  it("uses separate instanced streams for Eric and Mitsuru and clears them for the reveal", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const digital = new DigitalMoments(scene);
    const eric = scene.getMeshByName("FX/Digital / Eric Mittelette converging streams");
    const mitsuru = scene.getMeshByName("FX/Digital / Mitsuru Furuta converging streams");
    if (!(eric instanceof Mesh) || !(mitsuru instanceof Mesh)) {
      throw new Error("Both digital speakers need separate effects.");
    }
    expect(eric.thinInstanceCount).toBe(48);
    expect(mitsuru.thinInstanceCount).toBe(48);
    const corridor = scene.getMeshByName("FX/Digital / evolving data corridor");
    if (!(corridor instanceof Mesh)) throw new Error("D progression must use shared geometry.");
    expect(corridor.thinInstanceCount).toBe(DIGITAL_PROGRESSION.gates.length * 4);
    digital.update(110, silentFeatures());
    expect(eric.isEnabled()).toBe(true);
    expect(mitsuru.isEnabled()).toBe(false);
    for (let time = 116; time <= 130; time += .25) {
      digital.update(time, silentFeatures());
      expect(corridor.isEnabled()).toBe(true);
    }
    digital.update(145, { ...silentFeatures(), drop: 1 });
    expect(eric.isEnabled()).toBe(false);
    expect(mitsuru.isEnabled()).toBe(true);
    digital.update(175, silentFeatures());
    expect(eric.isEnabled()).toBe(false);
    expect(mitsuru.isEnabled()).toBe(false);
    expect(corridor.isEnabled()).toBe(false);
    digital.update(110, silentFeatures());
    expect(eric.isEnabled()).toBe(true);
    scene.dispose();
    engine.dispose();
  });
});
