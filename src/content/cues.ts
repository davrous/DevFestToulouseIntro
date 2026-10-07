import { smoothstep } from "../engine/Timeline";

export const EASTER_EGGS = [
  { id: "arcade", start: 0, end: 48, label: "LEVEL T / 8-BIT BUILD" },
  { id: "chocolatine", start: 5, end: 14, label: "HTTP 301 / CHOCOLATINE" },
  { id: "npm", start: 117, end: 125, label: "npm install cassoulet" },
  { id: "legacy", start: 33, end: 41, label: "LEGACY CODE / BUILD FAILED" },
  { id: "orbit", start: 143, end: 166, label: "TOULOUSE / ORBITAL LINK" },
] as const;

export function cueEnvelope(time: number, start: number, end: number, fade = 1, fadeOut = fade): number {
  return smoothstep((time - start) / fade) * (1 - smoothstep((time - end + fadeOut) / fadeOut));
}

export function activeCues(time: number): string[] {
  return EASTER_EGGS.filter((cue) => time >= cue.start && time < cue.end).map((cue) => cue.label);
}

export function chocolatineStage(time: number): number {
  return time < 9.5 ? 0 : 1;
}
