import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import * as core from "@strudel/core";
import { getTrigger, type Hap } from "@strudel/core";
import * as mini from "@strudel/mini";
import { transpiler } from "@strudel/transpiler";
import { StrudelEventTransport } from "../engine/StrudelEventTransport";
import { createVisualHelpers } from "./helpers";
import { CINEMA, CLAP_CRT } from "../content/showBeats";
import { SPEAKERS } from "../content/speakers";

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
  await core.evalScope(core, mini, helpers, { clapTiming: CLAP_CRT, cinemaTiming: CINEMA,
    speakerTimings: SPEAKERS.map((speaker) => speaker.startTime) });
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
    const levels = (from: number, to: number) => pattern.queryArc(from * .625, to * .625).map(controls)
      .filter((value) => value.scoreVoice === 1 && !value.scoreAccent).map((value) => Number(value.gain));
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average(levels(147.2, 159))).toBeGreaterThan(average(levels(0, 6.4)) * 3);
    const cutoff = (from: number, to: number) => pattern.queryArc(from * .625, to * .625).map(controls)
      .filter((value) => value.scoreVoice === 1).map((value) => Number(value.cutoff));
    expect(average(cutoff(147.2, 159))).toBeGreaterThan(average(cutoff(0, 6.4)) * 2);
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
    for (const [name, seconds] of [["cinema-cut", CINEMA.clap], ["cinema", CINEMA.start],
      ["popcorn", CINEMA.popcorn], ["warp", 93], ["reveal", 173]] as const) {
      expect(cues.filter((event) => event.event === name)).toHaveLength(1);
      expect(cues.find((event) => event.event === name)!.cycle).toBeCloseTo(seconds * .625, 7);
    }
    expect(audio).toHaveBeenCalledTimes(haps.filter((hap) => controls(hap).s !== undefined).length);
  });

  it("schedules one descending tape-stop, decelerates pulses and leaves the phosphor hold silent", async () => {
    const { pattern, cps } = await score();
    const sounds = pattern.queryArc(0, 112.5).filter((hap) => controls(hap).s !== undefined);
    const stops = sounds.filter((hap) => controls(hap).penv === -36);
    expect(stops).toHaveLength(1);
    const stop = stops[0];
    expect(Number(stop.whole!.begin) / cps).toBeCloseTo(CLAP_CRT.start, 7);
    expect(Number(stop.duration) / cps + Number(controls(stop).release)).toBeCloseTo(
      CLAP_CRT.collapsed - CLAP_CRT.start, 7);
    expect(controls(stop)).toMatchObject({ panchor: 0, pcurve: 0, psustain: 1, room: 0 });
    expect(controls(stop).note).toBe("f4");
    expect(Number(controls(stop).pattack)).toBeCloseTo(Number(stop.duration) / cps, 7);
    const pulses = sounds.filter((hap) => controls(hap).s === "bd" && controls(hap).speed !== undefined);
    expect(pulses).toHaveLength(5);
    const onsets = pulses.map((hap) => Number(hap.whole!.begin) / cps).sort((a, b) => a - b);
    for (let i = 2; i < onsets.length; i++) {
      expect(onsets[i] - onsets[i - 1]).toBeGreaterThan(onsets[i - 1] - onsets[i - 2]);
    }
    expect(pulses.map((hap) => Number(controls(hap).speed))).toEqual(
      [...pulses.map((hap) => Number(controls(hap).speed))].sort((a, b) => b - a));
    for (const hap of sounds.filter((hap) => Number(hap.whole!.begin) / cps < CLAP_CRT.reopen - 1e-7)) {
      const value = controls(hap);
      const end = Number(hap.whole!.begin) / cps + Number(hap.duration) / cps
        + Number(value.release ?? 0) + (value.room ? Number(value.roomsize ?? 0) : 0);
      expect(end).toBeLessThanOrEqual(CLAP_CRT.collapsed + 1e-7);
    }
    const resumed = sounds.filter((hap) => Number(hap.whole!.begin) / cps >= CLAP_CRT.reopen - 1e-7);
    expect(Math.min(...resumed.map((hap) => Number(hap.whole!.begin) / cps))).toBeCloseTo(CLAP_CRT.reopen, 7);
    const stabs = sounds.filter((hap) => controls(hap).scoreVoice === 5
      && Number(hap.whole!.begin) / cps >= CINEMA.clapperStart - 1e-7
      && Number(hap.whole!.begin) / cps < CLAP_CRT.start);
    const stabTimes = [...new Set(stabs.map((hap) => Number(hap.whole!.begin) / cps))];
    expect(stabTimes).toHaveLength(4);
    for (const [i, time] of stabTimes.entries()) {
      expect(time).toBeCloseTo(CLAP_CRT.start - [1.85, 1.05, .65, .25][i], 7);
    }
    expect(stabs.every((hap) => ["f3", "a3", "c4", "eb4"].includes(String(controls(hap).note)))).toBe(true);
  });

  it("builds earlier while introducing orchestral colors without a synthetic viola solo", async () => {
    const { pattern, cps } = await score();
    const sounds = pattern.queryArc(0, 112.5).filter((hap) => controls(hap).s !== undefined);
    const during = (from: number, to: number) => sounds.filter((hap) => {
      const t = Number(hap.whole!.begin) / cps;
      return t >= from - 1e-7 && t < to - 1e-7;
    });
    const voices = (from: number, to: number) =>
      new Set(during(from, to).map(controls).map((value) => value.scoreVoice));
    expect([...voices(0, 6.4)].sort()).toEqual([1, 2, 8]);
    expect(voices(12.8, 16).size).toBeGreaterThanOrEqual(4);
    expect(voices(38.4, 48.8).size).toBeGreaterThanOrEqual(7);
    const kickDensity = (from: number, to: number) =>
      during(from, to).filter((hap) => controls(hap).s === "bd").length / (to - from);
    expect(kickDensity(12.8, 16)).toBeGreaterThan(kickDensity(0, 6.4) * 3);
    expect(during(0, 16).some((hap) => [3, 5, 6, 9].includes(Number(controls(hap).scoreVoice)))).toBe(false);
  });

  it("alternates plucked questions and wind answers rather than layering every melody continuously", async () => {
    const { pattern, cps } = await score();
    const dialogue = pattern.queryArc(25.6 * cps, 38.4 * cps).filter((hap) => controls(hap).s !== undefined);
    const questions = dialogue.filter((hap) => controls(hap).scoreVoice === 4);
    const answers = dialogue.filter((hap) => controls(hap).scoreVoice === 3);
    expect(questions.length).toBeGreaterThan(10);
    expect(answers.length).toBeGreaterThanOrEqual(4);
    const cycle = (hap: Hap) => Math.floor((Number(hap.whole!.begin) / cps - 25.6) / 1.6 + 1e-7) % 4;
    expect(questions.every((hap) => cycle(hap) < 2)).toBe(true);
    expect(answers.every((hap) => cycle(hap) >= 2)).toBe(true);
    expect(questions.map(controls).every((value) => Number(value.pan) < .4)).toBe(true);
    expect(answers.map(controls).every((value) => Number(value.pan) > .6)).toBe(true);
  });

  it("resolves a swell exactly on each portrait with harmony that fits the underlying chord", async () => {
    const { pattern, cps } = await score();
    const sounds = pattern.queryArc(0, 112.5).filter((hap) => controls(hap).s !== undefined);
    const onset = (hap: Hap) => Number(hap.whole!.begin) / cps;
    const pitchClass = (note: unknown) => String(note).replace(/\d+$/, "");
    const chords = [["bb", "f", "db"], ["bb", "db", "f", "c"], ["bb", "f", "db", "f"], ["bb", "f", "bb", "db", "f"]];
    for (const [index, speaker] of SPEAKERS.entries()) {
      const time = speaker.startTime;
      const accents = sounds.filter((hap) => controls(hap).scoreAccent === index + 1);
      const at = (seconds: number) => accents.filter((hap) => Math.abs(onset(hap) - seconds) < 1e-7);
      const swell = at(time - 1.6).map(controls);
      expect(swell.map((value) => value.note).sort()).toEqual(["bb3", "bb4", "eb4", "f4"]);
      expect(swell.every((value) => value.attack === 1.35)).toBe(true);
      const arrival = at(time).map(controls);
      expect(arrival.length).toBeGreaterThanOrEqual(3);
      expect(arrival.every((value) => value.attack === .05)).toBe(true);
      expect(new Set(arrival.map((value) => pitchClass(value.note)))).toEqual(new Set(chords[index]));
      const replies = accents.filter((hap) => controls(hap).scoreVoice === 6);
      expect(replies).toHaveLength(2);
      for (const hap of replies) {
        expect(onset(hap)).toBeGreaterThan(time + .3);
        expect(Math.abs(onset(hap) / .4 - Math.round(onset(hap) / .4))).toBeLessThan(1e-6);
      }
      expect(accents.some((hap) => [3, 4].includes(Number(controls(hap).scoreVoice)))).toBe(false);
      const decorative = sounds.filter((hap) => !controls(hap).scoreAccent
        && [3, 4, 9].includes(Number(controls(hap).scoreVoice))
        && onset(hap) > time - 1.8 + 1e-7 && onset(hap) < time + 2.6 - 1e-7);
      expect(decorative).toHaveLength(0);
      expect(sounds.some((hap) => controls(hap).s === "bd" && onset(hap) > time && onset(hap) < time + 1))
        .toBe(true);
    }
  });

  it("descends into the lens calm and builds into the exit without abruptly cutting the ensemble", async () => {
    const { pattern, cps } = await score();
    const sounds = pattern.queryArc(0, 112.5).filter((hap) => controls(hap).s !== undefined);
    const during = (from: number, to: number) => sounds.filter((hap) => {
      const t = Number(hap.whole!.begin) / cps;
      return t >= from - 1e-7 && t < to - 1e-7;
    });
    const level = (from: number, to: number, voice: number) => {
      const values = during(from, to).map(controls).filter((value) => value.scoreVoice === voice && !value.scoreAccent);
      return values.reduce((sum, value) => sum + Number(value.gain), 0) / values.length;
    };
    const count = (from: number, to: number, sound: string) =>
      during(from, to).filter((hap) => controls(hap).s === sound).length;
    expect(level(66, 76.8, 1)).toBeGreaterThan(level(76.8, 80, 1));
    expect(level(76.8, 80, 1)).toBeGreaterThan(level(80, 83.2, 1));
    expect(level(80, 83.2, 1)).toBeGreaterThan(level(83.2, 96, 1) * 1.9);
    expect(count(66, 76.8, "bd") / 10.8).toBeGreaterThan(count(76.8, 80, "bd") / 3.2 - 1e-7);
    expect(count(76.8, 80, "bd")).toBeGreaterThan(count(80, 83.2, "bd"));
    expect(count(80, 83.2, "bd")).toBeGreaterThan(0);
    expect(count(80, 96, "hh")).toBe(0);
    expect(count(83.2, 96, "bd")).toBe(0);
    const cutoffs = during(76.8, 83.2).map(controls).filter((value) => value.scoreVoice === 1)
      .map((value) => Number(value.cutoff));
    expect(cutoffs[0]).toBeGreaterThan(cutoffs[cutoffs.length - 1]);
    for (const value of during(76, 96).map(controls).filter((entry) => [1, 2].includes(Number(entry.scoreVoice)))) {
      expect(Number(value.release)).toBeGreaterThanOrEqual(.5);
      expect(Number(value.room)).toBeGreaterThan(0);
    }
    const roll = during(155.8, 159).map(controls).filter((value) => value.s === "sd");
    expect(roll).toHaveLength(32);
    const gains = roll.map((value) => Number(value.gain));
    expect(gains[gains.length - 1]).toBeGreaterThan(gains[0] * 4);
    expect(gains).toEqual([...gains].sort((a, b) => a - b));
    const bloom = during(159, 159.05).map(controls);
    expect(bloom.some((value) => value.scoreVoice === 1 && Number(value.release) > 2)).toBe(true);
    expect(bloom.some((value) => value.scoreVoice === 7)).toBe(true);
    expect(level(155.8, 159, 1)).toBeGreaterThan(level(159, 163, 1));
    expect(level(159, 163, 1)).toBeGreaterThan(level(163, 173, 1));
    expect(level(163, 173, 1)).toBeGreaterThan(level(173, 176, 1) - 1e-7);
  });

  it("keeps the lens passage sparse, returns more dynamically, and leaves space for viola in the epic reveal", async () => {
    const { pattern, cps } = await score();
    const sounds = pattern.queryArc(0, 112.5).filter((hap) => controls(hap).s !== undefined);
    const during = (from: number, to: number) => sounds.filter((hap) => {
      const t = Number(hap.whole!.begin) / cps;
      return t >= from - 1e-7 && t < to - 1e-7;
    });
    const quiet = during(84, 96);
    expect(quiet.length).toBeGreaterThan(0);
    expect(quiet.every((hap) => [1, 2].includes(Number(controls(hap).scoreVoice)))).toBe(true);
    expect(quiet.map(controls).every((value) => Number(value.gain) <= .05)).toBe(true);
    expect(during(112, 128).length / 16).toBeGreaterThan(quiet.length / 12 * 5);
    const exit = during(159, 159.05);
    expect(exit.map(controls).some((value) => value.scoreVoice === 5 && value.note === "bb1")).toBe(true);
    expect(exit.map(controls).some((value) => value.s === "bd")).toBe(true);
    expect(during(159.25, 180).map(controls).some((value) => ["bd", "sd", "hh"].includes(String(value.s)))).toBe(false);
    expect(during(159.25, 173).map(controls).filter((value) => [3, 4, 6, 9].includes(Number(value.scoreVoice))))
      .toHaveLength(2);
    expect(during(173, 173.05).map(controls).some((value) => value.scoreVoice === 6)).toBe(true);
  });
});
