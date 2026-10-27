import { describe, expect, it } from "vitest";
import { SPEAKERS, activeSpeaker } from "./speakers";
import { CHOCOLATINE, activeCues, chocolatineStage, chocolatineOpacity, cueEnvelope } from "./cues";
import { arcadeDoorOpen } from "../scene/ArcadeT";

describe("show content", () => {
  it("keeps the pastry joke readable, then fades completely before the camera crosses its black panel", () => {
    expect(chocolatineOpacity(29)).toBe(1);
    expect(chocolatineOpacity(CHOCOLATINE.fadeStart)).toBe(1);
    expect(chocolatineOpacity((CHOCOLATINE.fadeStart + CHOCOLATINE.fadeEnd) / 2)).toBeCloseTo(.5);
    expect(chocolatineOpacity(CHOCOLATINE.fadeEnd)).toBe(0);
    expect(chocolatineOpacity(CHOCOLATINE.anchor)).toBe(0);
    expect(CHOCOLATINE.fadeEnd).toBeLessThan(CHOCOLATINE.anchor - .15);
    expect(() => chocolatineOpacity(NaN)).toThrow();
  });
  it("introduces speakers in the game, cinema and two digital chapters with editable titles", () => {
    expect(SPEAKERS.map((speaker) => speaker.name)).toEqual(["Anne-Flore Bernard", "David Rousset", "Eric Mittelette", "Mitsuru Furuta"]);
    expect(SPEAKERS.map((speaker) => speaker.world)).toEqual(["game", "cinema", "digital", "digital"]);
    expect(SPEAKERS.map((speaker) => speaker.startTime)).toEqual([17, 66, 99, 128]);
    expect(SPEAKERS.map((speaker) => speaker.gateTime)).toEqual([29, 76, 107, 136]);
    for (const speaker of SPEAKERS) {
      expect(speaker.demoTitle.trim().length).toBeGreaterThan(0);
      expect(activeSpeaker(speaker.startTime)).toBe(speaker);
      expect(speaker.gateTime).toBeGreaterThan(speaker.startTime);
      expect(speaker.gateTime).toBeLessThan(speaker.endTime);
    }
  });

  it("keeps speaker portals and jokes out of the final reveal", () => {
    for (let time = 166; time <= 180; time++) {
      expect(activeSpeaker(time)).toBeUndefined();
      expect(activeCues(time)).toEqual([]);
    }
    expect(activeCues(163)).toContain("TOULOUSE / ORBITAL LINK");
  });

  it("replays joke states exactly when seeking backward", () => {
    expect(chocolatineStage(28)).toBe(0);
    expect(chocolatineStage(31)).toBe(1);
    expect(chocolatineStage(28)).toBe(0);
    expect(activeCues(11)).not.toContain("HTTP 301 / CHOCOLATINE");
    expect(activeCues(16)).not.toContain("HTTP 301 / CHOCOLATINE");
    expect(activeCues(31)).toContain("HTTP 301 / CHOCOLATINE");
    expect(activeCues(33)).toContain("HTTP 301 / CHOCOLATINE");
    expect(activeCues(35)).not.toContain("HTTP 301 / CHOCOLATINE");
    expect(activeCues(33)).not.toContain("LEGACY CODE / BUILD FAILED");
    expect(activeCues(35)).toContain("LEGACY CODE / BUILD FAILED");
    expect(activeCues(20)).not.toContain("CANAL DU MIDI");
    expect(activeCues(31)).not.toContain("npm install cassoulet");
    expect(activeCues(93)).not.toContain("npm install cassoulet");
    expect(activeCues(119)).toContain("npm install cassoulet");
    expect(activeCues(124)).toContain("npm install cassoulet");
    expect(activeCues(125)).not.toContain("npm install cassoulet");
    expect(arcadeDoorOpen(41.2)).toBe(0);
    expect(arcadeDoorOpen(43)).toBeGreaterThan(0);
    expect(arcadeDoorOpen(40)).toBe(0);
    expect(arcadeDoorOpen(44)).toBeGreaterThan(0);
    expect(arcadeDoorOpen(47)).toBe(1);
  });

  it("starts the HTTP request at 27 seconds and switches to chocolatine exactly at 28.5 seconds", () => {
    expect(CHOCOLATINE.start).toBe(27);
    expect(CHOCOLATINE.redirect).toBe(28.5);
    expect(CHOCOLATINE.redirect - CHOCOLATINE.start).toBe(1.5);
    expect(activeCues(26.999)).not.toContain("HTTP 301 / CHOCOLATINE");
    expect(activeCues(27)).toContain("HTTP 301 / CHOCOLATINE");
    expect(chocolatineStage(27)).toBe(0);
    expect(chocolatineStage(28.499)).toBe(0);
    expect(chocolatineStage(28.5)).toBe(1);
    expect(CHOCOLATINE.end - CHOCOLATINE.redirect).toBeGreaterThanOrEqual(1.5);
  });

  it("fades cues without leaving visible objects before or after their windows", () => {
    expect(cueEnvelope(29, 30, 55)).toBe(0);
    expect(cueEnvelope(30, 30, 55)).toBe(0);
    expect(cueEnvelope(40, 30, 55)).toBe(1);
    expect(cueEnvelope(55, 30, 55)).toBe(0);
    expect(cueEnvelope(180, 30, 55)).toBe(0);
  });

  it("allows a slower look-away without changing the default symmetric fade", () => {
    expect(cueEnvelope(30.5, 30, 40, 1, 4)).toBeCloseTo(.5);
    expect(cueEnvelope(35, 30, 40, 1, 4)).toBe(1);
    expect(cueEnvelope(38, 30, 40, 1, 4)).toBeCloseTo(.5);
    expect(cueEnvelope(39, 30, 40, 1, 4)).toBeCloseTo(.15625);
    expect(cueEnvelope(40, 30, 40, 1, 4)).toBe(0);
    expect(cueEnvelope(39, 30, 40)).toBe(cueEnvelope(39, 30, 40, 1, 1));
  });
});
