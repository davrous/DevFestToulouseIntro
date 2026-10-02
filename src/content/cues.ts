import { smoothstep } from "../engine/Timeline";

export const EASTER_EGGS = [
  { id: "canal", start: 10, end: 29, label: "CANAL DU MIDI" },
  { id: "chocolatine", start: 44, end: 58, label: "CHOCOLATINE / ReferenceError" },
  { id: "friday", start: 77, end: 90, label: "DEPLOY ON FRIDAY / NO" },
  { id: "npm", start: 105, end: 120, label: "npm install cassoulet" },
  { id: "stack", start: 137, end: 154, label: "STACK OVERFLOW" },
  { id: "orbit", start: 137, end: 157, label: "TOULOUSE / ORBITAL LINK" },
] as const;

export function cueEnvelope(time: number, start: number, end: number, fade = 1): number {
  return smoothstep((time - start) / fade) * (1 - smoothstep((time - end + fade) / fade));
}

export function activeCues(time: number): string[] {
  return EASTER_EGGS.filter((cue) => time >= cue.start && time < cue.end).map((cue) => cue.label);
}

export function chocolatineStage(time: number): number {
  return time < 48 ? 0 : time < 51 ? 1 : 2;
}

export function fridayChoice(time: number): "PENDING" | "NO" {
  return time < 84 ? "PENDING" : "NO";
}
