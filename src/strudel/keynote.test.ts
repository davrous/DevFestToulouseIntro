import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import * as core from "@strudel/core";
import { getTrigger, type Hap } from "@strudel/core";
import * as mini from "@strudel/mini";
import { transpiler } from "@strudel/transpiler";
import { StrudelEventTransport } from "../engine/StrudelEventTransport";
import { createVisualHelpers } from "./helpers";

const source = readFileSync(new URL("../../examples/devfest-keynote.strudel", import.meta.url), "utf8");
const controls = (hap: Hap): Record<string, unknown> => {
  if (!hap.value || typeof hap.value !== "object" || Array.isArray(hap.value)) throw new TypeError("Expected sound controls.");
  return hap.value as Record<string, unknown>;
};

async function score() {
  mini.miniAllStrings();
  const transport = new StrudelEventTransport("strudel", vi.fn(), vi.fn());
  const send = vi.spyOn(transport, "send").mockImplementation(() => {});
  const helpers = createVisualHelpers(transport, () => ({ currentTime: 0, baseLatency: 0 }));
  await core.evalScope(core, mini, helpers);
  const repl = core.repl({ getTime: () => 0, defaultOutput: vi.fn(), transpiler,
    onEvalError: (error) => { throw error; } });
  const pattern = await repl.evaluate(source, false);
  if (!pattern) throw new Error("The real REPL did not produce a pattern.");
  return { pattern, send, cps: repl.scheduler.cps };
}

describe("original three-minute keynote score", () => {
  it("evaluates the complete real REPL source at 150 BPM and never loops", async () => {
    const { pattern, cps } = await score();
    expect(cps).toBe(.625);
    const haps = pattern.queryArc(0, 112.5);
    expect(haps.length).toBeGreaterThan(1000);
    expect(haps.every((hap) => hap.whole && Number(hap.whole.begin) >= 0 && Number(hap.whole.begin) < 112.5)).toBe(true);
    expect(pattern.queryArc(112.5, 225).map((hap) => ({
      from: Number(hap.whole?.begin), to: Number(hap.whole?.end), value: hap.value,
    }))).toEqual([]);
    expect(pattern.queryArc(-112.5, 0)).toHaveLength(0);
    expect(source).not.toMatch(/https?:|initHydra|gm_synth|RolandTR909|setTimeout|setInterval/);
  });

  it("stays in Bb minor, allowing A natural only as the harmonic-minor dominant", async () => {
    const { pattern } = await score();
    const notes = pattern.queryArc(0, 112.5).map(controls).filter((value) => value.note !== undefined);
    expect(notes.length).toBeGreaterThan(200);
    const natural: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
    for (const value of notes) {
      const match = /^([a-g])([b#]?)(-?\d+)$/.exec(String(value.note));
      expect(match, `Unrecognized pitch ${String(value.note)}`).not.toBeNull();
      const [, letter, accidental] = match!;
      const pitch = (natural[letter] + (accidental === "b" ? -1 : accidental === "#" ? 1 : 0) + 12) % 12;
      expect([10, 0, 1, 3, 5, 6, 8, 9]).toContain(pitch);
    }
    const finalNotes = pattern.queryArc(108, 110).map(controls).filter((value) => value.note !== undefined);
    expect(finalNotes.map((value) => value.note)).toEqual(expect.arrayContaining(["bb2", "bb3", "db4", "f4"]));
  });

  it("builds the string crescendo and leaves room for releases before 180 seconds", async () => {
    const { pattern } = await score();
    const levels = (from: number, to: number) => pattern.queryArc(from, to).map(controls)
      .filter((value) => value.s === "supersaw").map((value) => Number(value.gain));
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average(levels(92, 100))).toBeGreaterThan(average(levels(0, 20)) * 1.8);
    const cutoff = (from: number, to: number) => pattern.queryArc(from, to).map(controls)
      .filter((value) => value.s === "supersaw").map((value) => Number(value.cutoff));
    expect(average(cutoff(92, 100))).toBeGreaterThan(average(cutoff(0, 20)) * 2);
    const sounds = pattern.queryArc(0, 112.5).filter((hap) => controls(hap).s !== undefined);
    for (const hap of sounds) {
      const value = controls(hap);
      expect(Number(hap.whole!.end) / .625 + Number(value.release ?? 0) + Number(value.roomsize ?? 0))
        .toBeLessThanOrEqual(180);
    }
    expect(pattern.queryArc(110, 112.5).map(controls).some((value) => value.s !== undefined)).toBe(false);
  });

  it("emits genuine rhythm haps and all one-shot cues without doubling sound", async () => {
    const { pattern, send } = await score();
    const audio = vi.fn();
    const output = getTrigger({ getTime: () => 0, defaultOutput: audio });
    const haps = pattern.queryArc(0, 112.5).sort((a, b) => Number(a.whole!.begin) - Number(b.whole!.begin));
    const base = performance.now();
    const clock = vi.spyOn(performance, "now");
    try {
      for (const hap of haps) {
        const onset = Number(hap.whole!.begin) / .625;
        clock.mockReturnValue(base + onset * 1000);
        await output(hap, .1, Number(hap.duration) / .625, .625, onset);
      }
    } finally { clock.mockRestore(); }
    const events = send.mock.calls.map(([event]) => event);
    expect(events.filter((event) => event.event === "kick").length).toBeGreaterThan(200);
    expect(events.filter((event) => event.event === "hat").length).toBeGreaterThan(500);
    const cues = events.filter((event) => !["kick", "snare", "hat", "impact"].includes(event.event));
    expect(cues).toHaveLength(15);
    for (const [name, seconds] of [["cinema-cut", 54.55], ["popcorn", 78.2], ["warp", 93], ["reveal", 173]] as const) {
      expect(cues.filter((event) => event.event === name)).toHaveLength(1);
      expect(cues.find((event) => event.event === name)!.cycle).toBeCloseTo(seconds * .625, 7);
    }
    expect(audio).toHaveBeenCalledTimes(haps.filter((hap) => controls(hap).s !== undefined).length);
  });
});
