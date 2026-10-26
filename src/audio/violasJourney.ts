import map from "./violasJourney.json";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { CINEMA, DEPLOY_ROCKET } from "../content/showBeats";

export const JOURNEY_TRANSITIONS = [
  { event: "violin", time: 22, onset: 22.141 },
  { event: "legacy", time: 38.2, onset: 38.105 },
  { event: "clap", time: CINEMA.clap, onset: 50.876 },
  { event: "crt", time: CINEMA.crtSync, onset: 59.346 },
  { event: "popcorn", time: CINEMA.popcorn, onset: 78.154 },
  { event: "lens", time: CINEMA.lens, onset: 90.017 },
  { event: "digital", time: CINEMA.digital, onset: 94.985 },
  { event: "overflow", time: 113.2, onset: 113.344 },
  { event: "launch", time: DEPLOY_ROCKET.launch, onset: 144.643 },
  { event: "impact", time: DEPLOY_ROCKET.impact, onset: 146.618 },
  { event: "exit", time: 159, onset: 158.85 },
] as const;

export const JOURNEY_REVEAL = 172.569;
const WINDOW = .75;

export function journeyEffectTime(time: number): number {
  if (!Number.isFinite(time)) throw new RangeError("Journey effect time must be finite.");
  for (const cue of JOURNEY_TRANSITIONS) {
    const weight = 1 - Math.abs(time - cue.onset) / WINDOW;
    if (weight > 0) return time + (cue.time - cue.onset) * weight;
  }
  return time;
}

function onsetPulse(events: readonly (readonly number[])[], time: number, decay: number): number {
  let low = 0, high = events.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (events[mid][0] <= time) low = mid + 1;
    else high = mid;
  }
  let value = 0;
  for (let index = low - 1; index >= 0 && time - events[index][0] < decay * 6; index--) {
    value = Math.max(value, events[index][1] * Math.exp(-(time - events[index][0]) / decay));
  }
  return value;
}

export function journeyAccents(time: number, target: AudioFeatures): void {
  if (!Number.isFinite(time)) throw new RangeError("Journey playback time must be finite.");
  const audible = time >= 0 && time < map.duration;
  target.kick = audible ? onsetPulse(map.kicks, time, .09) : 0;
  target.snare = audible ? onsetPulse(map.snares, time, .075) : 0;
  target.beat = audible ? Math.max(target.kick, onsetPulse(map.beats, time, .12)) : 0;
  target.drop = 0;
  if (!audible) return;
  for (const cue of JOURNEY_TRANSITIONS) {
    const elapsed = time - cue.onset;
    if (elapsed >= 0 && elapsed < .8) target.drop = Math.max(target.drop, .65 * Math.exp(-elapsed / .18));
  }
}

export function journeyRevealAccent(time: number): number {
  const elapsed = time - JOURNEY_REVEAL;
  return elapsed >= 0 && elapsed < .9 ? .65 * Math.exp(-elapsed / .3) : 0;
}
