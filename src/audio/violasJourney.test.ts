import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import map from "./violasJourney.json";
import { JOURNEY_REVEAL, JOURNEY_TRANSITIONS, journeyAccents, journeyEffectTime, journeyRevealAccent } from "./violasJourney";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { VIOLIN_FALL } from "../scene/DemosceneTransition";
import { WALL_TIME } from "../scene/ArcadePhysics";
import { BUFFER_OVERFLOW } from "../scene/DigitalOverflow";

describe("measured Viola's Journey score", () => {
  it("matches the exact bundled MP3 and stores chronological, bounded measured attacks", () => {
    const source = readFileSync(new URL("../../public/assets/music/violas-journey.mp3", import.meta.url));
    expect(createHash("sha256").update(source).digest("hex")).toBe(map.sha256);
    expect(map.duration).toBeCloseTo(177.6, 2);
    expect(map.analysis.sampleRate).toBe(22050);
    for (const events of [map.beats, map.kicks, map.snares]) {
      expect(events.length).toBeGreaterThan(100);
      for (const [index, [time, velocity]] of events.entries()) {
        expect(time).toBeGreaterThan(index ? events[index - 1][0] : 0);
        expect(time).toBeLessThan(map.duration);
        expect(velocity).toBeGreaterThan(0);
        expect(velocity).toBeLessThanOrEqual(.85);
      }
    }
  });

  it("samples exact onsets without scheduling, early hits or stale pulses after rewind", () => {
    const features = silentFeatures();
    const [time, velocity] = map.kicks[0];
    journeyAccents(time - .001, features);
    expect(features.kick).toBe(0);
    journeyAccents(time, features);
    expect(features.kick).toBe(velocity);
    journeyAccents(time + .09, features);
    expect(features.kick).toBeCloseTo(velocity / Math.E);
    journeyAccents(time, features);
    expect(features.kick).toBe(velocity);
    journeyAccents(180, features);
    expect(features).toEqual(silentFeatures());
    expect(() => journeyAccents(NaN, features)).toThrow();
  });

  it("re-times only local effect windows, continuously and monotonically, with a fixed final reveal", () => {
    expect(JOURNEY_TRANSITIONS.find((cue) => cue.event === "violin")!.time).toBe(VIOLIN_FALL.start);
    expect(JOURNEY_TRANSITIONS.find((cue) => cue.event === "legacy")!.time).toBe(WALL_TIME);
    expect(JOURNEY_TRANSITIONS.find((cue) => cue.event === "overflow")!.time).toBe(BUFFER_OVERFLOW.spill);
    for (const cue of JOURNEY_TRANSITIONS) {
      expect(Math.abs(cue.time - cue.onset)).toBeLessThan(.2);
      expect(journeyEffectTime(cue.onset)).toBeCloseTo(cue.time, 8);
      expect(journeyEffectTime(cue.onset - .75)).toBeCloseTo(cue.onset - .75, 8);
      expect(journeyEffectTime(cue.onset + .75)).toBeCloseTo(cue.onset + .75, 8);
    }
    let previous = -1;
    for (let index = 0; index <= 18000; index++) {
      const time = index / 100;
      const effect = journeyEffectTime(time);
      expect(effect).toBeGreaterThan(previous);
      expect(Math.abs(effect - time)).toBeLessThan(.2);
      if (time >= 160) expect(effect).toBe(time);
      previous = effect;
    }
    expect(() => journeyEffectTime(Infinity)).toThrow();
  });

  it("adds only a restrained, reproducible light accent near the settled title", () => {
    expect(journeyRevealAccent(JOURNEY_REVEAL - .001)).toBe(0);
    expect(journeyRevealAccent(JOURNEY_REVEAL)).toBe(.65);
    expect(journeyRevealAccent(JOURNEY_REVEAL + .3)).toBeCloseTo(.65 / Math.E);
    expect(journeyRevealAccent(180)).toBe(0);
  });
});
