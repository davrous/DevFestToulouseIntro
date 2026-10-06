import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { DIGITAL_PROGRESSION, DigitalMoments } from "./DigitalMoments";

describe("two digital speaker chapters", () => {
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
