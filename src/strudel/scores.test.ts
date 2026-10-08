import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as core from "@strudel/core";
import type { Hap, Pattern } from "@strudel/core";
import * as mini from "@strudel/mini";
import * as tonal from "@strudel/tonal";
import { transpiler } from "@strudel/transpiler";
import { CINEMA, CLAP_CRT } from "../content/showBeats";
import { SPEAKERS } from "../content/speakers";
import { StrudelEventTransport } from "../engine/StrudelEventTransport";
import { createVisualHelpers } from "./helpers";
import { DEFAULT_SCORE, getScore, orchestraBuffers, orchestraSampleMap, SCORES, scoreSource } from "./scores";

const cps = .625;
const value = (hap: Hap): Record<string, unknown> => {
  if (!hap.value || typeof hap.value !== "object" || Array.isArray(hap.value)) throw new TypeError("Expected score controls");
  return hap.value as Record<string, unknown>;
};
const onset = (hap: Hap) => Number(hap.whole!.begin) / cps;
const pitchClass = (note: unknown): number => {
  const match = /^([a-g])([#b]*)(-?\d+)$/i.exec(String(note));
  if (!match) throw new Error(`Invalid score pitch ${String(note)}`);
  const naturals: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  return (naturals[match[1].toLowerCase()] + [...match[2]].reduce((sum, accidental) => sum + (accidental === "#" ? 1 : -1), 0) + 12) % 12;
};
const rendered = new Map<string, { pattern: Pattern; haps: Hap[] }>();
beforeAll(async () => {
  mini.miniAllStrings();
  const transport = new StrudelEventTransport("strudel", vi.fn(), vi.fn());
  const helpers = createVisualHelpers(transport, () => ({ currentTime: 0, baseLatency: 0 }));
  await core.evalScope(core, mini, tonal, helpers, {
    clapTiming: CLAP_CRT, cinemaTiming: CINEMA, speakerTimings: SPEAKERS.map((speaker) => speaker.startTime),
  });
  for (const score of SCORES.filter((entry) => entry.id !== "legacy")) {
    const repl = core.repl({ getTime: () => 0, defaultOutput: vi.fn(), transpiler,
      onEvalError: (error) => { throw error; } });
    const pattern = await repl.evaluate(scoreSource(score.id), false);
    if (!pattern) throw new Error(`No pattern for ${score.id}`);
    expect(repl.scheduler.cps).toBe(cps);
    rendered.set(score.id, { pattern, haps: pattern.queryArc(0, 112.5) });
  }
});

describe("selectable original viola scores", () => {
  it("preserves the old score and rejects unknown selections", () => {
    expect(DEFAULT_SCORE).toBe("arcade");
    expect(scoreSource("legacy")).toBe(readFileSync(new URL("../../examples/devfest-keynote.strudel", import.meta.url), "utf8"));
    expect(() => getScore("missing")).toThrow("Unknown performance score");
    expect(new Set(SCORES.map((score) => scoreSource(score.id))).size).toBe(4);
  });

  it("offers substantially different trance densities, not three copies", () => {
    const count = (id: string) => rendered.get(id)!.haps.filter((hap) =>
      value(hap).scoreVoice === 11 && onset(hap) >= 112 && onset(hap) < 124).length;
    expect(count("trance")).toBeGreaterThan(count("arcade") * 1.8);
    expect(count("arcade")).toBeGreaterThan(count("cinema") * 1.5);
  });

  it("stages correctly mapped, audible local CC0 WAVs for seven acoustic families", () => {
    expect(Object.keys(orchestraSampleMap)).toHaveLength(7);
    expect(orchestraBuffers).toHaveLength(18);
    for (const sample of orchestraBuffers) {
      const wav = readFileSync(new URL(`../../public/assets/strudel/${sample.file}`, import.meta.url));
      expect(wav.subarray(0, 4).toString()).toBe("RIFF");
      expect(wav.subarray(8, 12).toString()).toBe("WAVE");
      expect(wav.length).toBeGreaterThan(10000);
    }
    expect(orchestraSampleMap.orchestra_flute.c5).toEqual(["orchestra/flute-c5.wav"]);
    expect(orchestraSampleMap.orchestra_harp.d4).toEqual(["orchestra/harp-d4.wav"]);
    expect(orchestraSampleMap.orchestra_piano["c#6"]).toEqual(["orchestra/piano-cs6.wav"]);
  });

  describe.each(["arcade", "cinema", "trance"])("%s", (id) => {
    const sounds = () => rendered.get(id)!.haps.filter((hap) => value(hap).s !== undefined);
    const during = (from: number, to: number) => sounds().filter((hap) => onset(hap) >= from - 1e-7 && onset(hap) < to - 1e-7);

    it("is exactly 180 seconds, one-shot, with settled final tails and no external assets", () => {
      const { pattern, haps } = rendered.get(id)!;
      expect(haps.length).toBeGreaterThan(1500);
      expect(pattern.queryArc(-112.5, 0)).toHaveLength(0);
      expect(pattern.queryArc(112.5, 225)).toHaveLength(0);
      expect(during(176, 180)).toHaveLength(0);
      for (const hap of sounds()) {
        const v = value(hap);
        expect(onset(hap) + Number(hap.duration) / cps + Number(v.release ?? 0)
          + (v.room ? Number(v.roomsize ?? 0) : 0)).toBeLessThanOrEqual(180 + 1e-7);
      }
      expect(scoreSource(id)).not.toMatch(/https?:|setTimeout|setInterval|gm_synth/);
    });

    it("keeps fresh controls and stable note durations after Web Audio mutates a previous query", () => {
      const { pattern } = rendered.get(id)!;
      const query = () => pattern.queryArc(84 * cps, 84.08 * cps).filter((hap) => value(hap).s !== undefined);
      const first = query();
      expect(first.length).toBeGreaterThan(0);
      const durations = first.map((hap) => Number(hap.duration));
      for (const hap of first) value(hap).duration = .001;
      const next = query();
      expect(next.map((hap) => Number(hap.duration))).toEqual(durations);
      expect(value(next[0])).not.toBe(value(first[0]));
    });

    it("supports viola-friendly minor harmony and only the planned final major turn", () => {
      const transpose = id === "cinema" ? 5 : 0;
      const allowed = [2, 4, 5, 7, 9, 10, 0, 1].map((pc) => (pc + transpose) % 12);
      for (const hap of sounds().filter((entry) => value(entry).note !== undefined)) {
        const pc = pitchClass(value(hap).note);
        if (id === "trance" && onset(hap) >= 173 - 1e-7 && pc === 6) continue;
        expect(allowed, String(value(hap).note)).toContain(pc);
      }
      const final = during(173, 176).filter((hap) => value(hap).scoreVoice === 1).map((hap) => pitchClass(value(hap).note));
      expect(final).toContain((2 + transpose) % 12);
      expect(final).toContain((id === "trance" ? 6 : 5) + transpose);
    });

    it("starts gently, mixes retro and classical colors, and builds a much larger second act", () => {
      const opening = during(0, 6.4);
      expect(opening.some((hap) => value(hap).scoreVoice === 8)).toBe(false);
      const lift = during(12.8, 25.6);
      expect(new Set(lift.map((hap) => value(hap).scoreVoice)).has(10)).toBe(true);
      expect(lift.some((hap) => value(hap).s === "orchestra_strings")).toBe(true);
      const palette = new Set(sounds().map((hap) => value(hap).scoreVoice).filter((entry) => entry !== undefined));
      expect(palette.size).toBeGreaterThanOrEqual(16);
      expect(during(112, 128).length / 16).toBeGreaterThan(opening.length / 6.4 * 5);
      const level = (from: number, to: number) => during(from, to).map(value).filter((v) => v.scoreVoice === 1);
      expect(Number(level(147.2, 159)[0].gain)).toBeGreaterThan(Number(level(0, 6.4)[0].gain) * 2.5);
    });

    it("prepares the dominant, descends at the clap and leaves the green line completely clear", () => {
      const stops = sounds().filter((hap) => value(hap).penv === -36);
      expect(stops).toHaveLength(1);
      expect(onset(stops[0])).toBeCloseTo(CLAP_CRT.start, 7);
      expect(Number(stops[0].duration) / cps + Number(value(stops[0]).release)).toBeCloseTo(
        CLAP_CRT.collapsed - CLAP_CRT.start, 7);
      const transpose = id === "cinema" ? 5 : 0;
      expect(pitchClass(value(stops[0]).note)).toBe((9 + transpose) % 12);
      for (const hap of sounds().filter((entry) => onset(entry) < CLAP_CRT.start - 1e-7)) {
        const v = value(hap);
        expect(onset(hap) + Number(hap.duration) / cps + Number(v.release ?? 0)
          + (v.room ? Number(v.roomsize ?? 0) : 0)).toBeLessThanOrEqual(CLAP_CRT.start + 1e-7);
      }
      expect(during(CLAP_CRT.collapsed, CLAP_CRT.reopen)).toHaveLength(0);
      expect(during(CLAP_CRT.reopen, CLAP_CRT.reopen + .01).length).toBeGreaterThan(5);
    });

    it("integrates the four portraits into the current harmony and keeps David's beat continuous", () => {
      const harmony = ["bb", "f", "dm", "bb"];
      for (const [index, speaker] of SPEAKERS.entries()) {
        const arrivals = during(speaker.startTime, speaker.startTime + .001)
          .filter((hap) => value(hap).scoreAccent === index + 1 && value(hap).scoreVoice === 9);
        expect(arrivals).toHaveLength(3);
        const phaseNotes = sounds().filter((hap) => value(hap).scoreVoice === 9
          && value(hap).scoreHarmony === harmony[index] && !value(hap).scoreAccent);
        const compatible = new Set(phaseNotes.map((hap) => pitchClass(value(hap).note)));
        expect(arrivals.every((hap) => compatible.has(pitchClass(value(hap).note)))).toBe(true);
        expect(during(speaker.startTime - 1.2, speaker.startTime + 2.4).filter((hap) => !value(hap).scoreAccent
          && [3, 4, 10, 11, 14].includes(Number(value(hap).scoreVoice)))).toHaveLength(0);
      }
      const david = during(62.4, 70.4);
      expect(david.filter((hap) => value(hap).scoreAccent === 2 && value(hap).scoreVoice === 3).length).toBeGreaterThan(4);
      const kicks = david.filter((hap) => value(hap).s === "bd").map(onset).sort((a, b) => a - b);
      for (let i = 1; i < kicks.length; i++) expect(kicks[i] - kicks[i - 1]).toBeCloseTo(.4, 7);
      expect(david.filter((hap) => value(hap).scoreVoice === 1).every((hap) => value(hap).scoreHarmony === "f")).toBe(true);
    });

    it("reopens with an orchestral pickup, then keeps the same beat across every section up to David and the reels", () => {
      expect(during(CLAP_CRT.reopen, 52.8).some((hap) => [8, 11, 13].includes(Number(value(hap).scoreVoice)))).toBe(false);
      const passage = during(52.8, 78.4);
      const kicks = passage.filter((hap) => value(hap).s === "bd").map(onset).sort((a, b) => a - b);
      expect(kicks).toHaveLength(64);
      expect(kicks[0]).toBeCloseTo(52.8, 7);
      for (let i = 1; i < kicks.length; i++) expect(kicks[i] - kicks[i - 1]).toBeCloseTo(.4, 7);
      const rhythmic = passage.filter((hap) => !value(hap).scoreAccent
        && [3, 4, 10, 11, 12, 13, 14].includes(Number(value(hap).scoreVoice)));
      for (const hap of rhythmic) expect(onset(hap) / .2).toBeCloseTo(Math.round(onset(hap) / .2), 7);
      const progression = sounds().filter((hap) => value(hap).scoreVoice === 1
        && onset(hap) >= 52.8 && onset(hap) < 70.4).map((hap) => value(hap).scoreHarmony);
      expect([...new Set(progression)]).toEqual(["dm", "bb", "c", "f"]);
    });

    it("anticipates the exit over eleven seconds without an off-grid snare rush or a sudden noise blast", () => {
      const preparation = during(147.2, 159);
      const sections = new Set(preparation.map((hap) => value(hap).scoreSection).filter(Boolean));
      expect([...sections]).toEqual(["exit-lift", "exit-open", "exit-cadence", "exit-breath"]);
      expect(preparation.some((hap) => value(hap).s === "white")).toBe(false);
      const snares = preparation.filter((hap) => value(hap).s === "sd").map(onset).sort((a, b) => a - b);
      for (let i = 1; i < snares.length; i++) expect(snares[i] - snares[i - 1]).toBeCloseTo(.8, 7);
      expect(during(153.6, 159).some((hap) => ["sd", "supersaw"].includes(String(value(hap).s)))).toBe(false);
      const lastKicks = during(156.8, 159).filter((hap) => value(hap).s === "bd").map(onset).sort((a, b) => a - b);
      expect(lastKicks).toHaveLength(3);
      for (let i = 1; i < lastKicks.length; i++) expect(lastKicks[i] - lastKicks[i - 1]).toBeCloseTo(.8, 7);
      const pads = preparation.filter((hap) => value(hap).scoreVoice === 1).sort((a, b) => onset(a) - onset(b));
      expect(Number(value(pads.at(-1)!).gain)).toBeLessThan(Number(value(pads[0]).gain) * .7);
    });

    it("keeps actual accompaniment through the suspended lens and the epic reveal", () => {
      const calm = during(83.2, 95.9);
      expect(calm.some((hap) => value(hap).scoreVoice === 1)).toBe(true);
      expect(calm.some((hap) => value(hap).scoreVoice === 2)).toBe(true);
      expect(calm.some((hap) => value(hap).s === "orchestra_piano")).toBe(true);
      expect(calm.some((hap) => [8, 10, 11, 13].includes(Number(value(hap).scoreVoice)))).toBe(false);
      expect(during(159, 173).some((hap) => value(hap).scoreVoice === 15)).toBe(true);
      expect(during(163, 173).some((hap) => value(hap).scoreVoice === 9)).toBe(true);
      expect(during(159, 180).some((hap) => value(hap).s === "bd")).toBe(false);
      expect(during(173, 173.01).some((hap) => value(hap).scoreVoice === 6)).toBe(true);
    });
  });
});
