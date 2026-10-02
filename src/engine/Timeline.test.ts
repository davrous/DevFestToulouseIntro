import { describe, expect, it } from "vitest";
import { Timeline } from "./Timeline";

describe("deterministic show clock", () => {
  it("starts paused and advances by wall time, independent of frame rate", () => {
    const timeline = new Timeline();
    timeline.tick(0);
    timeline.tick(1000);
    expect(timeline.time).toBe(0);
    timeline.play();
    timeline.tick(1000);
    timeline.tick(16000);
    expect(timeline.time).toBe(15);
  });

  it("does not include paused time when resuming", () => {
    const timeline = new Timeline();
    timeline.play();
    timeline.tick(0);
    timeline.tick(10000);
    timeline.pause();
    timeline.tick(40000);
    timeline.play();
    timeline.tick(50000);
    timeline.tick(51000);
    expect(timeline.time).toBe(11);
  });

  it("seeks backward, resolves phases, changes speed, and holds the final frame", () => {
    const timeline = new Timeline();
    timeline.seek(155);
    expect(timeline.phase).toBe("REVEAL");
    timeline.seek(60);
    expect(timeline.phase).toBe("BUILD");
    timeline.speed = 2;
    timeline.play();
    timeline.tick(0);
    timeline.tick(60000);
    expect(timeline.time).toBe(180);
    expect(timeline.playing).toBe(false);
    timeline.restart();
    expect(timeline.time).toBe(0);
    expect(timeline.playing).toBe(true);
  });

  it("rejects invalid seek values", () => {
    expect(() => new Timeline().seek(Number.NaN)).toThrow(RangeError);
  });
});
