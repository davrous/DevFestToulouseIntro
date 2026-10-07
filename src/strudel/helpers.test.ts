import { describe, expect, it, vi } from "vitest";
import * as core from "@strudel/core";
import { getTrigger, pure } from "@strudel/core";
import * as miniModule from "@strudel/mini";
import { mini, miniAllStrings } from "@strudel/mini";
import { evaluate } from "@strudel/transpiler";
import { StrudelEventTransport } from "../engine/StrudelEventTransport";
import { createVisualHelpers, audioTimeToEpoch, withSynchronizedStart } from "./helpers";

miniAllStrings();

describe("real pinned Strudel event outputs", () => {
  it("adds exactly one silent launch at the scheduled cycle-zero onset without changing audio", async () => {
    const launch = vi.fn().mockResolvedValue(undefined);
    const audio = vi.fn();
    const output = getTrigger({ getTime: () => 1, defaultOutput: audio });
    const original = mini("bd*4").s("bd");
    const combined = withSynchronizedStart(original, launch);
    const haps = combined.queryArc(0, 2);
    for (const hap of haps) await output(hap, .1, Number(hap.duration) / .625, .625,
      2 + Number(hap.whole!.begin) / .625);
    expect(audio).toHaveBeenCalledTimes(8);
    expect(launch).toHaveBeenCalledExactlyOnceWith(2);
    expect(combined.queryArc(2, 180)).toHaveLength(original.queryArc(2, 180).length);
  });
  const setup = () => {
    const transport = new StrudelEventTransport("strudel", vi.fn(), vi.fn());
    const send = vi.spyOn(transport, "send").mockImplementation(() => {});
    const context = { currentTime: 1, baseLatency: 0, getOutputTimestamp: () => ({ contextTime: 1, performanceTime: 100 }) };
    return { helpers: createVisualHelpers(transport, () => context), send };
  };

  it("shares kick haps and preserves exactly one default audio output per onset", async () => {
    const { helpers, send } = setup();
    const audio = vi.fn();
    const output = getTrigger({ getTime: () => 1, defaultOutput: audio });
    const pattern = helpers.audioAndVisual(mini("bd ~ bd bd").s("bd").gain(.9), "kick");
    const haps = pattern.queryArc(0, 1);
    expect(haps).toHaveLength(3);
    for (const hap of haps) await output(hap, .1, Number(hap.duration) / .625, .625, 2 + hap.whole!.begin.valueOf() / .625);
    expect(audio).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls.map(([event]) => event.cycle)).toEqual([0, .5, .75]);
    expect(send.mock.calls[0][0].scheduledTime).toBe(performance.timeOrigin + 1100);
    expect(send.mock.calls[0][0].id).toMatch(/:kick:0$/);
  });

  it("produces no audio for visual/cue tracks and only one fractional cueAt hap", async () => {
    const { helpers, send } = setup();
    const audio = vi.fn();
    const output = getTrigger({ getTime: () => 1, defaultOutput: audio });
    const patterns = [helpers.visual("impact", pure({})), helpers.cueAt("cinema-cut", 34.09375)];
    for (const pattern of patterns) {
      const haps = pattern.queryArc(0, pattern === patterns[0] ? 1 : 40);
      expect(haps).toHaveLength(1);
      await output(haps[0], .1, 1, .625, 2);
    }
    expect(send.mock.calls.map(([event]) => event.event)).toEqual(["impact", "cinema-cut"]);
    expect(audio).not.toHaveBeenCalled();
  });

  it("registers a genuine .visual method, preserves IDs on reevaluation, and selects dense hats", async () => {
    const { helpers, send } = setup();
    const output = getTrigger({ getTime: () => 1, defaultOutput: vi.fn() });
    const kick = mini("bd").s("bd").visual("kick").queryArc(0, 1)[0];
    await output(kick, .1, 1, .625, 2);
    await output(kick, .1, 1, .625, 2);
    expect(send.mock.calls[0][0].id).toBe(send.mock.calls[1][0].id);
    send.mockClear();
    const hats = helpers.audioAndVisual(mini("hh*128"), "hat").queryArc(0, 1);
    for (const hap of hats) await output(hap, .1, .01, .625, 3 + hap.whole!.begin.valueOf() / .625);
    expect(send.mock.calls.length).toBeGreaterThan(0);
    expect(send.mock.calls.length).toBeLessThanOrEqual(36);
    expect(() => helpers.cueAt("warp", -1)).toThrow();
  });

  it("maps output clock timestamps rather than evaluation time", () => {
    expect(audioTimeToEpoch(3, {
      currentTime: 2.8, baseLatency: .01, outputLatency: .03,
      getOutputTimestamp: () => ({ contextTime: 2, performanceTime: 500 }),
    })).toBe(performance.timeOrigin + 1500);
  });

  it("runs the documented helper syntax through the real REPL transpiler", async () => {
    const { helpers, send } = setup();
    await core.evalScope(core, miniModule, helpers);
    const { pattern } = await evaluate(`stack(
      audioAndVisual(s("bd*4"), "kick"),
      s("~ sd ~ sd").visual("snare"),
      visual("impact"),
      cueAt("cinema-cut", .5)
    )`);
    const audio = vi.fn();
    const output = getTrigger({ getTime: () => 1, defaultOutput: audio });
    for (const hap of pattern.queryArc(0, 1)) await output(hap, .1, 1, .625, 2);
    expect(send.mock.calls.map(([event]) => event.event)).toEqual([
      "kick", "kick", "kick", "kick", "snare", "snare", "impact", "cinema-cut",
    ]);
    expect(audio).toHaveBeenCalledTimes(6);
  });
});
