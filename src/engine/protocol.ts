import { PHASES } from "./Timeline";
import type { AudioFeatures } from "./AudioAnalyzer";

export const TRIGGERS = ["kick", "snare", "hat", "drop", "viola", "beat"] as const;
export type Trigger = typeof TRIGGERS[number];
export type Section = typeof PHASES[number]["name"];
export const CHANNELS = ["kick", "bass", "mid", "treble", "energy", "beat", "violaEnergy", "snare", "drop"] as const;

export type ShowMessage =
  | { type: "trigger"; event: Trigger; velocity?: number }
  | { type: "energy"; value: number | null }
  | { type: "section"; section: Section | null }
  | { type: "levels"; values: Partial<AudioFeatures> };

export function unitValue(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite number between 0 and 1.`);
  }
  return value;
}

export function parseMessage(input: unknown): ShowMessage {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("A show event must be an object.");
  if (!("type" in input)) throw new TypeError("A show event requires a type.");
  switch (input.type) {
    case "trigger": {
      if (!("event" in input) || !TRIGGERS.some((event) => event === input.event)) throw new TypeError("Unknown trigger.");
      const event = TRIGGERS.find((event) => event === input.event)!;
      return { type: "trigger", event, velocity: "velocity" in input ? unitValue(input.velocity, "velocity") : 1 };
    }
    case "energy":
      if (!("value" in input)) throw new TypeError("An energy event requires a value.");
      return { type: "energy", value: input.value === null ? null : unitValue(input.value, "energy") };
    case "section": {
      if (!("section" in input)) throw new TypeError("A section event requires a section.");
      if (input.section === null) return { type: "section", section: null };
      const section = PHASES.find((phase) => phase.name === input.section)?.name;
      if (!section) throw new TypeError("Unknown section.");
      return { type: "section", section };
    }
    case "levels": {
      if (!("values" in input) || !input.values || typeof input.values !== "object" || Array.isArray(input.values)) {
        throw new TypeError("A levels event requires a values object.");
      }
      const values: Partial<AudioFeatures> = {};
      for (const [key, value] of Object.entries(input.values)) {
        const channel = CHANNELS.find((channel) => channel === key);
        if (!channel) throw new TypeError(`Unknown audio channel: ${key}`);
        values[channel] = unitValue(value, key);
      }
      return { type: "levels", values };
    }
    default:
      throw new TypeError("Unknown show event type.");
  }
}
