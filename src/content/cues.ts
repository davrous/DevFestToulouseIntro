import { smoothstep } from "../engine/Timeline";

export const CHOCOLATINE = { start: 27, redirect: 30, end: 34.5, anchor: 33.5, height: 14, width: 16 } as const;

export const EASTER_EGGS = [
  { id: "arcade", start: 0, end: 48, label: "LEVEL T / 8-BIT BUILD" },
  { id: "chocolatine", start: CHOCOLATINE.start, end: CHOCOLATINE.end, label: "HTTP 301 / CHOCOLATINE" },
  { id: "npm", start: 117, end: 125, label: "npm install cassoulet" },
  { id: "legacy", start: CHOCOLATINE.end, end: 41, label: "LEGACY CODE / BUILD FAILED" },
  { id: "orbit", start: 143, end: 166, label: "TOULOUSE / ORBITAL LINK" },
] as const;

export function cueEnvelope(time: number, start: number, end: number, fade = 1, fadeOut = fade): number {
  return smoothstep((time - start) / fade) * (1 - smoothstep((time - end + fadeOut) / fadeOut));
}

export function activeCues(time: number): string[] {
  return EASTER_EGGS.filter((cue) => time >= cue.start && time < cue.end).map((cue) => cue.label);
}

export function chocolatineStage(time: number): number {
  return time < CHOCOLATINE.redirect ? 0 : 1;
}
