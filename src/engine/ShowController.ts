import { AudioAnalyzer, silentFeatures, type AudioFeatures } from "./AudioAnalyzer";
import { CHANNELS, parseMessage, unitValue, type Section, type ShowMessage, type Trigger } from "./protocol";
import { Timeline } from "./Timeline";

export class ShowController {
  readonly audio: AudioAnalyzer;
  readonly features = silentFeatures();
  enabled = true;
  private reactiveIntensity = 1;
  section: Section | null = null;
  bridgeStatus = "OFF / standalone";
  recentEvents: string[] = [];
  private readonly pulses = new Map<Trigger, { value: number; time: number }>();
  private energy: number | null = null;
  private levels: Partial<AudioFeatures> = {};
  private levelsAt = -Infinity;
  private socket?: WebSocket;
  private retry = 0;
  private connection?: string;
  private retryTimer = 0;

  constructor(
    readonly timeline: Timeline,
    private readonly notify: (message: string) => void,
    private readonly clock: () => number = () => performance.now(),
  ) {
    this.audio = new AudioAnalyzer(notify);
  }

  get intensity(): number { return this.reactiveIntensity; }
  set intensity(value: number) { this.reactiveIntensity = unitValue(value / 2, "half intensity") * 2; }

  trigger(event: Trigger, velocity = 1): void { this.dispatch({ type: "trigger", event, velocity }); }
  setEnergy(value: number | null): void { this.dispatch({ type: "energy", value }); }
  setSection(section: Section | null): void { this.dispatch({ type: "section", section }); }
  setLevels(values: Partial<AudioFeatures>): void { this.dispatch({ type: "levels", values }); }

  dispatch(input: unknown): void {
    const message = parseMessage(input);
    if (message.type === "trigger") this.pulses.set(message.event, { value: message.velocity ?? 1, time: this.clock() });
    else if (message.type === "energy") this.energy = message.value;
    else if (message.type === "section") this.section = message.section;
    else { this.levels = message.values; this.levelsAt = this.clock(); }
    if (message.type !== "levels") {
      this.recentEvents.unshift(message.type === "trigger" ? message.event : message.type);
      this.recentEvents.length = Math.min(5, this.recentEvents.length);
    }
  }

  receive(input: unknown): boolean {
    try {
      this.dispatch(typeof input === "string" ? JSON.parse(input) : input);
      return true;
    } catch (error) {
      console.warn("Rejected show event", error);
      this.notify(`Rejected show event: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  sample(now = this.clock()): AudioFeatures {
    Object.assign(this.features, silentFeatures());
    if (!this.enabled) return this.features;
    const audio = this.audio.sample(now);
    const decay = Math.exp(-Math.max(0, now - this.levelsAt - 250) / 500);
    for (const key of CHANNELS) this.features[key] = Math.max(audio[key], (this.levels[key] ?? 0) * decay);
    for (const [event, pulse] of this.pulses) {
      const lifetime = event === "viola" ? 1800 : event === "drop" ? 1000 : event === "snare" ? 200 : 130;
      const value = pulse.value * Math.exp(-Math.max(0, now - pulse.time) / lifetime);
      const channel = event === "hat" ? "treble" : event === "viola" ? "violaEnergy" : event;
      this.features[channel] = Math.max(this.features[channel], value);
    }
    if (this.energy !== null) this.features.energy = this.energy;
    this.features.beat = Math.max(this.features.beat, this.features.kick);
    for (const key of CHANNELS) this.features[key] = Math.min(1, this.features[key] * this.reactiveIntensity);
    return this.features;
  }

  resetTransient(): void {
    this.pulses.clear();
    this.levels = {};
    this.levelsAt = -Infinity;
    this.recentEvents = [];
    Object.assign(this.features, silentFeatures());
  }

  connect(url = "ws://127.0.0.1:8787"): void {
    const parsed = new URL(url);
    if (!["ws:", "wss:"].includes(parsed.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)) {
      throw new Error("The show bridge must use a localhost ws:// or wss:// URL.");
    }
    this.disconnect();
    this.connection = url;
    this.openSocket();
  }

  disconnect(): void {
    this.connection = undefined;
    window.clearTimeout(this.retryTimer);
    this.socket?.close();
    this.socket = undefined;
    this.retry = 0;
    this.bridgeStatus = "OFF / standalone";
  }

  private openSocket(): void {
    const connection = this.connection;
    if (!connection) return;
    this.bridgeStatus = "CONNECTING / localhost";
    const socket = this.socket = new WebSocket(connection);
    socket.onopen = () => {
      if (socket !== this.socket) return;
      this.retry = 0;
      this.bridgeStatus = "CONNECTED / Strudel event bridge";
    };
    socket.onmessage = (event: MessageEvent<unknown>) => {
      if (socket === this.socket) this.receive(event.data);
    };
    socket.onerror = () => {
      if (socket === this.socket) this.notify("The local Strudel bridge is unavailable. The standalone show continues.");
    };
    socket.onclose = () => {
      if (socket !== this.socket || !this.connection) return;
      this.bridgeStatus = "DISCONNECTED / retrying";
      this.retryTimer = window.setTimeout(() => this.openSocket(), Math.min(15000, 1500 * 2 ** this.retry++));
    };
  }
}

export type { ShowMessage };
