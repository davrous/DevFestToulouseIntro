import { AV_CHANNEL, epochNow, parseSyncMessage, type AVEvent, type Heartbeat, type SyncMessage, type SyncRole } from "./avProtocol";

export interface SyncChannel {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: SyncMessage): void;
  close(): void;
}
interface Peer { seenAt: number; session?: number; heartbeat?: Heartbeat }

export class StrudelEventTransport {
  readonly senderId = crypto.randomUUID();
  private channel?: SyncChannel;
  private timer?: ReturnType<typeof setInterval>;
  private readonly peers = new Map<string, Peer>();
  private session = 0;
  private playing = false;
  private cycle?: number;
  private cps?: number;
  private lastWarning = -Infinity;
  private error?: string;
  onShowStart?: (scheduledTime: number, senderId: string) => void;
  onShowStartCancelled?: (senderId: string) => void;
  private readonly starts = new Map<string, {
    resolve(): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout>;
  }>();

  constructor(
    readonly role: SyncRole,
    private readonly onEvent: (event: AVEvent) => void,
    private readonly notify: (message: string) => void,
    private readonly onPeerLost: (senderId: string) => void = () => {},
    private readonly clock: () => number = epochNow,
    private readonly factory: (name: string) => SyncChannel = (name) => new BroadcastChannel(name),
  ) {}

  connect(): void {
    if (this.channel) return;
    try {
      this.channel = this.factory(AV_CHANNEL);
      this.error = undefined;
      this.channel.onmessage = (message) => this.receive(message.data);
      this.channel.onmessageerror = () => this.report(new Error("BroadcastChannel could not decode an AV sync message."));
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
    } catch (error) {
      this.disconnect();
      this.error = "UNAVAILABLE";
      this.report(error);
    }
  }

  disconnect(): void {
    for (const start of this.starts.values()) {
      clearTimeout(start.timer);
      start.reject(new Error("Show launch cancelled: Strudel sync disconnected."));
    }
    this.starts.clear();
    if (this.channel) this.post({ version: 1, type: "bye", senderId: this.senderId });
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.channel?.close();
    this.channel = undefined;
    for (const id of this.peers.keys()) this.onPeerLost(id);
    for (const id of this.peers.keys()) this.onShowStartCancelled?.(id);
    this.peers.clear();
  }

  send(event: Omit<AVEvent, "version" | "type" | "source" | "senderId" | "sentAt">): void {
    if (this.role !== "strudel") throw new Error("Only the Strudel transport sends musical events.");
    this.post({ ...event, version: 1, type: "musical-event", source: "strudel",
      senderId: this.senderId, sentAt: this.clock() });
  }

  requestShowStart(scheduledTime: number): Promise<void> {
    if (this.role !== "strudel" || this.getStatus() !== "CONNECTED") {
      return Promise.reject(new Error("Open the ready Babylon show on the same origin before synchronized playback."));
    }
    if (!Number.isFinite(scheduledTime) || scheduledTime < 0) {
      return Promise.reject(new RangeError("Synchronized launch requires a finite non-negative onset."));
    }
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.starts.delete(id);
        reject(new Error("Babylon did not confirm the synchronized launch."));
      }, 2000);
      this.starts.set(id, { resolve, reject, timer });
      this.post({ version: 1, type: "show-start", senderId: this.senderId, id, scheduledTime, sentAt: this.clock() });
    });
  }

  setPlayback(playing: boolean): void {
    if (playing && !this.playing) this.session++;
    this.playing = playing;
    if (!playing) { this.cycle = undefined; this.cps = undefined; }
    this.tick();
  }

  setTiming(cycle: number, cps: number): void { this.cycle = cycle; this.cps = cps; }
  get playbackSession(): number { return this.session; }

  getStatus(): string {
    if (!this.channel) return this.error ?? "DISCONNECTED";
    return [...this.peers.values()].some((peer) => this.clock() - peer.seenAt <= 3500) ? "CONNECTED" : "DISCONNECTED";
  }

  get timing(): { cycle?: number; cps?: number } {
    const peer = [...this.peers.values()].find((value) => value.heartbeat && this.clock() - value.seenAt <= 3500);
    return { cycle: peer?.heartbeat?.cycle, cps: peer?.heartbeat?.cps };
  }

  private tick(): void {
    const now = this.clock();
    for (const [id, peer] of this.peers) {
      if (now - peer.seenAt > 3500) {
        this.peers.delete(id);
        this.onPeerLost(id);
        this.onShowStartCancelled?.(id);
      }
    }
    this.post({ version: 1, type: "heartbeat", role: this.role, senderId: this.senderId, sentAt: now,
      session: this.session, playing: this.playing, cycle: this.cycle, cps: this.cps });
  }

  private post(message: SyncMessage): void {
    if (!this.channel) return;
    try { this.channel.postMessage(message); }
    catch (error) { this.report(error); }
  }

  private receive(input: unknown): void {
    try {
      const message = parseSyncMessage(input);
      if (message.senderId === this.senderId) return;
      if (message.type === "heartbeat" && message.role !== this.role) {
        const previous = this.peers.get(message.senderId);
        if (!message.playing || (previous?.session !== undefined && previous.session !== message.session)) {
          this.onPeerLost(message.senderId);
          this.onShowStartCancelled?.(message.senderId);
        }
        this.peers.set(message.senderId, { seenAt: this.clock(), heartbeat: message, session: message.session });
        this.post({ version: 1, type: "ack", senderId: this.senderId, targetId: message.senderId, sentAt: this.clock() });
      } else if (message.type === "ack" && message.targetId === this.senderId) {
        const peer = this.peers.get(message.senderId);
        this.peers.set(message.senderId, { ...peer, seenAt: this.clock() });
      } else if (message.type === "bye") {
        this.peers.delete(message.senderId);
        this.onPeerLost(message.senderId);
        this.onShowStartCancelled?.(message.senderId);
      } else if (message.type === "show-start" && this.role === "babylon") {
        let error: string | undefined;
        try {
          if (this.peers.get(message.senderId)?.heartbeat?.role !== "strudel") {
            throw new Error("Show launch requires a connected Strudel peer.");
          }
          if (Math.abs(message.scheduledTime - this.clock()) > 2000 || this.clock() - message.sentAt > 2000) {
            throw new Error("The synchronized launch request is stale.");
          }
          if (!this.onShowStart) throw new Error("The Babylon renderer is not ready to launch.");
          this.onShowStart(message.scheduledTime, message.senderId);
        } catch (cause) {
          error = cause instanceof Error ? cause.message : String(cause);
          console.warn("Synchronized show launch rejected", cause);
        }
        this.post({ version: 1, type: "show-start-result", senderId: this.senderId,
          targetId: message.senderId, id: message.id, sentAt: this.clock(), error });
      } else if (message.type === "show-start-result" && this.role === "strudel"
        && message.targetId === this.senderId) {
        const start = this.starts.get(message.id);
        if (!start) return;
        clearTimeout(start.timer);
        this.starts.delete(message.id);
        if (message.error) start.reject(new Error(message.error));
        else start.resolve();
      } else if (message.type === "musical-event" && this.role === "babylon") {
        this.onEvent(message);
      }
    } catch (error) { this.report(error); }
  }

  private report(error: unknown): void {
    const now = this.clock();
    if (now - this.lastWarning < 3000) return;
    this.lastWarning = now;
    console.warn("Strudel event sync error", error);
    this.notify(`Strudel event sync: ${error instanceof Error ? error.message : String(error)}. The show continues independently.`);
  }
}
