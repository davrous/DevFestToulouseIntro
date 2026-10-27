import { describe, expect, it } from "vitest";
import { SOUNDTRACK_FADE_SECONDS, soundtrackEndGain } from "./soundtracks";

describe("quick soundtrack ending", () => {
  it("uses a short smooth fade with exact full-volume and silent endpoints", () => {
    expect(SOUNDTRACK_FADE_SECONDS).toBe(1.25);
    expect(soundtrackEndGain(5)).toBe(1);
    expect(soundtrackEndGain(1.25)).toBe(1);
    expect(soundtrackEndGain(.625)).toBeCloseTo(.5);
    expect(soundtrackEndGain(.1)).toBeLessThan(.02);
    expect(soundtrackEndGain(0)).toBe(0);
    expect(soundtrackEndGain(-1)).toBe(0);
  });

  it("keeps normal volume while file duration is not known and rejects invalid time", () => {
    expect(soundtrackEndGain(Infinity)).toBe(1);
    expect(() => soundtrackEndGain(NaN)).toThrow();
    expect(() => soundtrackEndGain(-Infinity)).toThrow();
  });
});
