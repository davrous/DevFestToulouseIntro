import { describe, expect, it } from "vitest";
import { DEFAULT_SOUNDTRACK_ID, getSoundtrack, isJourneySoundtrack, SOUNDTRACKS, SOUNDTRACK_FADE_SECONDS, soundtrackEndGain } from "./soundtracks";

describe("Journey format selection", () => {
  it("offers only the MP3 and original WAV, with MP3 as the default", () => {
    expect(SOUNDTRACKS.map(({ id, url }) => ({ id, url }))).toEqual([
      { id: "violas-journey", url: "./assets/music/violas-journey.mp3" },
      { id: "violas-journey-wav", url: "./assets/music/violas-journey.wav" },
    ]);
    expect(DEFAULT_SOUNDTRACK_ID).toBe("violas-journey");
    for (const soundtrack of SOUNDTRACKS) {
      expect(getSoundtrack(soundtrack.id)).toBe(soundtrack);
      expect(isJourneySoundtrack(soundtrack.id)).toBe(true);
    }
    expect(isJourneySoundtrack(null)).toBe(false);
    expect(isJourneySoundtrack("viola-trance")).toBe(false);
    expect(() => getSoundtrack("viola-trance")).toThrow("Unknown soundtrack");
  });
});

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
