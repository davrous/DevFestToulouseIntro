import { describe, expect, it } from "vitest";
import { SPEAKERS, activeSpeaker } from "./speakers";
import { activeCues, chocolatineStage, cueEnvelope, fridayChoice } from "./cues";

describe("show content", () => {
  it("introduces the four speakers at the prescribed timestamps with editable titles", () => {
    expect(SPEAKERS.map((speaker) => speaker.name)).toEqual(["Anne-Flore Bernard", "David Rousset", "Eric Mittelette", "Mitsuru Furuta"]);
    expect(SPEAKERS.map((speaker) => speaker.startTime)).toEqual([30, 60, 90, 120]);
    for (const speaker of SPEAKERS) {
      expect(speaker.demoTitle.trim().length).toBeGreaterThan(0);
      expect(activeSpeaker(speaker.startTime)).toBe(speaker);
      expect(speaker.gateTime).toBeGreaterThan(speaker.startTime);
      expect(speaker.gateTime).toBeLessThan(speaker.endTime);
    }
  });

  it("keeps speaker portals and jokes out of the final reveal", () => {
    for (let time = 163; time <= 180; time++) {
      expect(activeSpeaker(time)).toBeUndefined();
      expect(activeCues(time)).toEqual([]);
    }
  });

  it("replays joke states exactly when seeking backward", () => {
    expect(chocolatineStage(52)).toBe(2);
    expect(chocolatineStage(47)).toBe(0);
    expect(chocolatineStage(49)).toBe(1);
    expect(fridayChoice(85)).toBe("NO");
    expect(fridayChoice(79)).toBe("PENDING");
    expect(fridayChoice(100)).toBe("NO");
  });

  it("fades cues without leaving visible objects before or after their windows", () => {
    expect(cueEnvelope(29, 30, 55)).toBe(0);
    expect(cueEnvelope(30, 30, 55)).toBe(0);
    expect(cueEnvelope(40, 30, 55)).toBe(1);
    expect(cueEnvelope(55, 30, 55)).toBe(0);
    expect(cueEnvelope(180, 30, 55)).toBe(0);
  });
});
