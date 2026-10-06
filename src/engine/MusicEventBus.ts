import { epochNow, isShowCue, parseSyncMessage, type AVEvent } from "./avProtocol";

export type EventOutcome = "queued" | "applied" | "outside-window" | "already-accented"
  | "paused" | "duplicate" | "stale" | "overload" | "cancelled";
export interface EventRecord {
  event: AVEvent;
  receivedAt: number;
  latency: number;
  lateness: number;
  outcome: EventOutcome;
}
type Listener = (event: AVEvent) => EventOutcome | void;

export class MusicEventBus {
  readonly records: EventRecord[] = [];
  lastCue?: EventRecord;
  private pending: EventRecord[] = [];
  private readonly arrivals: number[] = [];
  private readonly recent = new Map<string, number>();
  private readonly listeners = new Set<Listener>();
  private manualSequence = 0;

  constructor(private readonly clock: () => number = epochNow) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  receive(input: unknown): boolean {
    const event = parseSyncMessage(input);
    if (event.type !== "musical-event") throw new TypeError("The music bus accepts AV events only.");
    const now = this.clock();
    for (const [id, at] of this.recent) if (now - at > 10000) this.recent.delete(id);
    const record: EventRecord = { event, receivedAt: now, latency: Math.max(0, now - event.sentAt),
      lateness: Math.max(0, now - event.scheduledTime), outcome: "queued" };
    if (this.recent.has(event.id)) record.outcome = "duplicate";
    else if (now - event.scheduledTime > 2000 || event.scheduledTime - now > 5000) record.outcome = "stale";
    else if (this.pending.length >= 256) record.outcome = "overload";
    this.records.unshift(record);
    this.records.length = Math.min(this.records.length, 40);
    if (isShowCue(event.event)) this.lastCue = record;
    if (record.outcome !== "queued") return false;
    this.recent.set(event.id, now);
    this.arrivals.push(now);
    if (this.arrivals.length > 256) this.arrivals.shift();
    if (this.recent.size > 512) this.recent.delete(this.recent.keys().next().value!);
    this.pending.push(record);
    this.pending.sort((a, b) => a.event.scheduledTime - b.event.scheduledTime);
    return true;
  }

  manual(event: AVEvent["event"], velocity = 1): void {
    const now = this.clock();
    this.receive({ version: 1, type: "musical-event", event, source: "manual", senderId: "manual",
      id: `manual:${++this.manualSequence}`, velocity, sentAt: now, scheduledTime: now });
    this.flush(now);
  }

  flush(now = this.clock()): void {
    while (this.pending[0]?.event.scheduledTime <= now) {
      const record = this.pending.shift()!;
      record.lateness = Math.max(0, now - record.event.scheduledTime);
      if (record.lateness > 2000) { record.outcome = "stale"; continue; }
      record.outcome = "applied";
      for (const listener of this.listeners) {
        const outcome = listener(record.event);
        if (outcome) record.outcome = outcome;
      }
    }
  }

  cancelSource(senderId?: string): void {
    this.pending = this.pending.filter((record) => {
      if (senderId && record.event.senderId !== senderId) return true;
      record.outcome = "cancelled";
      return false;
    });
  }

  get eventsPerSecond(): number {
    const now = this.clock();
    while (this.arrivals.length && now - this.arrivals[0] > 1000) this.arrivals.shift();
    return this.arrivals.length;
  }
}
