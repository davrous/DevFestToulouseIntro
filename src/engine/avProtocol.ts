import { CINEMA } from "../content/showBeats";
import { SPEAKERS } from "../content/speakers";
import { unitValue } from "./protocol";

export const AV_CHANNEL = "devfest-av-sync-v1";
export const MUSICAL_EVENTS = ["kick", "snare", "hat", "impact"] as const;
export const SHOW_CUES = [
  "game", "level-complete", "cinema-cut", "cinema", "speaker-david",
  "film-reels", "popcorn", "lens", "projector", "warp", "d-entry",
  "speaker-eric", "speaker-mitsuru", "climax", "reveal",
] as const;
export type MusicalEvent = typeof MUSICAL_EVENTS[number];
export type ShowCue = typeof SHOW_CUES[number];
export type AVEventName = MusicalEvent | ShowCue;
export type SyncRole = "strudel" | "babylon";

export const epochNow = (): number => performance.timeOrigin + performance.now();
export const isShowCue = (name: AVEventName): name is ShowCue => SHOW_CUES.some((cue) => cue === name);

export function eventName(value: unknown): AVEventName {
  const name = [...MUSICAL_EVENTS, ...SHOW_CUES].find((event) => event === value);
  if (!name) throw new TypeError(`Unknown AV event: ${String(value)}`);
  return name;
}

export interface AVEvent {
  version: 1;
  type: "musical-event";
  event: AVEventName;
  source: "strudel" | "manual";
  senderId: string;
  id: string;
  velocity: number;
  scheduledTime: number;
  sentAt: number;
  cycle?: number;
  cps?: number;
}

export interface Heartbeat {
  version: 1;
  type: "heartbeat";
  role: SyncRole;
  senderId: string;
  sentAt: number;
  session: number;
  playing: boolean;
  cycle?: number;
  cps?: number;
}

export type SyncMessage = AVEvent | Heartbeat
  | { version: 1; type: "ack"; senderId: string; targetId: string; sentAt: number }
  | { version: 1; type: "bye"; senderId: string };

function object(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === "object" && !Array.isArray(input);
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) throw new TypeError(`Invalid ${field}.`);
  return value;
}

function finite(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 8640000000000000) {
    throw new TypeError(`Invalid ${field}.`);
  }
  return value;
}

export function parseSyncMessage(input: unknown): SyncMessage {
  if (!object(input) || input.version !== 1) throw new TypeError("AV sync requires a version 1 message.");
  const senderId = text(input.senderId, "senderId");
  if (input.type === "bye") return { version: 1, type: "bye", senderId };
  const sentAt = finite(input.sentAt, "sentAt");
  if (input.type === "ack") {
    return { version: 1, type: "ack", senderId, targetId: text(input.targetId, "targetId"), sentAt };
  }
  const timing = {
    cycle: input.cycle === undefined ? undefined : finite(input.cycle, "cycle"),
    cps: input.cps === undefined ? undefined : finite(input.cps, "cps"),
  };
  if (timing.cps !== undefined && (timing.cps <= 0 || timing.cps > 100)) throw new RangeError("Invalid cycle rate.");
  if (input.type === "heartbeat") {
    if (input.role !== "strudel" && input.role !== "babylon") throw new TypeError("Invalid sync role.");
    if (typeof input.playing !== "boolean") throw new TypeError("Invalid playback state.");
    return { version: 1, type: "heartbeat", senderId, sentAt, ...timing,
      role: input.role, playing: input.playing, session: finite(input.session, "session") };
  }
  if (input.type !== "musical-event" || (input.source !== "strudel" && input.source !== "manual")) {
    throw new TypeError("Invalid AV event type or source.");
  }
  return { version: 1, type: "musical-event", senderId, sentAt, ...timing,
    event: eventName(input.event), source: input.source, id: text(input.id, "event ID"),
    velocity: unitValue(input.velocity, "velocity"), scheduledTime: finite(input.scheduledTime, "scheduledTime") };
}

export interface CueWindow { time: number; tolerance: number }
const speakerTime = (world: "cinema" | "digital", index = 0) =>
  SPEAKERS.filter((speaker) => speaker.world === world)[index].startTime;

export const CUE_WINDOWS: Record<ShowCue, CueWindow> = {
  game: { time: 0, tolerance: 2 },
  "level-complete": { time: 46.3, tolerance: 1.2 },
  "cinema-cut": { time: CINEMA.clap, tolerance: 1.25 },
  cinema: { time: CINEMA.start, tolerance: 2 },
  "speaker-david": { time: speakerTime("cinema"), tolerance: 2 },
  "film-reels": { time: CINEMA.reels, tolerance: 2 },
  popcorn: { time: CINEMA.popcorn, tolerance: 1 },
  lens: { time: CINEMA.lens, tolerance: 1.25 },
  projector: { time: CINEMA.projector, tolerance: 1.25 },
  warp: { time: CINEMA.space, tolerance: 3 },
  "d-entry": { time: CINEMA.digital, tolerance: 2 },
  "speaker-eric": { time: speakerTime("digital"), tolerance: 2 },
  "speaker-mitsuru": { time: speakerTime("digital", 1), tolerance: 2 },
  climax: { time: 147, tolerance: 4 },
  reveal: { time: 173, tolerance: 3 },
};
