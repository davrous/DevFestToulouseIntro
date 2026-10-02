import { clamp } from "./Timeline";

export interface AudioFeatures {
  kick: number;
  bass: number;
  mid: number;
  treble: number;
  energy: number;
  beat: number;
  violaEnergy: number;
  snare: number;
  drop: number;
}

export const silentFeatures = (): AudioFeatures => ({
  kick: 0, bass: 0, mid: 0, treble: 0, energy: 0, beat: 0, violaEnergy: 0, snare: 0, drop: 0,
});

export function frequencyBand(data: Uint8Array, sampleRate: number, fftSize: number, low: number, high: number): number {
  const start = Math.max(0, Math.ceil(low * fftSize / sampleRate));
  const end = Math.min(data.length, Math.ceil(high * fftSize / sampleRate));
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i] / 255;
  return sum / (end - start);
}

export function rmsLevel(samples: Float32Array): number {
  if (samples.length === 0) throw new RangeError("RMS analysis requires waveform samples.");
  let square = 0;
  for (const value of samples) square += value * value;
  return Math.sqrt(square / samples.length);
}

export class AudioAnalyzer {
  status = "OFF / no audio permission requested";
  readonly features = silentFeatures();
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private preamp?: GainNode;
  private inputGainDb = 12;
  private levelDb = -Infinity;
  private source?: MediaStreamAudioSourceNode;
  private stream?: MediaStream;
  private ownsTracks = false;
  private request = 0;
  private cleanupTracks: Array<() => void> = [];
  private frequency = new Uint8Array(1024);
  private waveform = new Float32Array(2048);
  private previousBass = 0;
  private previousMid = 0;
  private lastBeat = -Infinity;
  private lastSample = 0;

  constructor(private readonly notify: (message: string) => void) {}

  get gainDb(): number { return this.inputGainDb; }
  set gainDb(value: number) {
    if (!Number.isFinite(value) || value < -12 || value > 30) throw new RangeError("Input gain must be between -12 and +30 dB.");
    this.inputGainDb = value;
    if (this.preamp && this.context) this.preamp.gain.setTargetAtTime(10 ** (value / 20), this.context.currentTime, .02);
  }
  get inputDb(): number { return this.levelDb; }
  get inputLevel(): number { return clamp((this.levelDb + 60) / 60); }
  get connected(): boolean { return this.stream?.getAudioTracks().some((track) => track.readyState === "live") ?? false; }
  get deviceName(): string { return this.stream?.getAudioTracks()[0]?.label || "No active input"; }

  async activate(): Promise<void> {
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = .7;
      this.preamp = this.context.createGain();
      this.preamp.gain.value = 10 ** (this.inputGainDb / 20);
      this.preamp.connect(this.analyser);
      this.context.addEventListener("statechange", () => {
        if (this.stream && this.context?.state === "suspended") {
          this.status = "SUSPENDED / reconnect audio to resume analysis";
          this.notify("Audio analysis suspended. The show continues; reconnect audio when ready.");
        }
      });
    }
    if (this.context.state !== "running") await this.context.resume();
  }

  async connect(kind: "microphone" | "system"): Promise<void> {
    const request = ++this.request;
    await this.activate();
    this.status = "WAITING / choose an audio input";
    let acquired: MediaStream | undefined;
    try {
      const stream = acquired = kind === "microphone"
        ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
        : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (request !== this.request) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("No audio track was shared. Enable 'Share audio' in the browser picker.");
      }
      this.attachStream(stream, true);
      acquired = undefined;
      this.status = kind === "microphone" ? "MICROPHONE / live" : "SYSTEM OR TAB / live";
    } catch (error) {
      acquired?.getTracks().forEach((track) => track.stop());
      if (request !== this.request) return;
      this.status = this.stream ? "PREVIOUS INPUT / still connected" : "OFF / input unavailable";
      throw error;
    }
  }

  async connectStream(stream: MediaStream): Promise<void> {
    const request = ++this.request;
    if (!stream.getAudioTracks().some((track) => track.readyState === "live")) {
      throw new Error("The supplied stream has no live audio track.");
    }
    await this.activate();
    if (request !== this.request) return;
    this.attachStream(stream, false);
    this.status = "EXTERNAL STREAM / live";
  }

  disconnect(): void {
    ++this.request;
    this.releaseStream();
    this.status = "OFF / input disconnected";
  }

  private releaseStream(): void {
    this.source?.disconnect();
    this.source = undefined;
    this.cleanupTracks.forEach((cleanup) => cleanup());
    this.cleanupTracks = [];
    if (this.ownsTracks) this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    this.ownsTracks = false;
    Object.assign(this.features, silentFeatures());
    this.levelDb = -Infinity;
    this.lastSample = 0;
    this.previousBass = 0;
    this.previousMid = 0;
  }

  sample(now: number): AudioFeatures {
    const analyser = this.analyser;
    const context = this.context;
    const track = this.stream?.getAudioTracks()[0];
    if (!analyser || !context || context.state !== "running" || !track || track.muted || track.readyState !== "live") {
      Object.assign(this.features, silentFeatures());
      this.levelDb = -Infinity;
      return this.features;
    }
    if (now - this.lastSample < 1000 / 60) return this.features;
    const delta = Math.min(.1, Math.max(0, (now - this.lastSample) / 1000));
    this.lastSample = now;
    analyser.getByteFrequencyData(this.frequency);
    analyser.getFloatTimeDomainData(this.waveform);
    const bass = frequencyBand(this.frequency, context.sampleRate, analyser.fftSize, 40, 180);
    const mid = frequencyBand(this.frequency, context.sampleRate, analyser.fftSize, 180, 2200);
    const treble = frequencyBand(this.frequency, context.sampleRate, analyser.fftSize, 4000, 14000);
    const rms = rmsLevel(this.waveform);
    this.levelDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    const targetEnergy = clamp(rms * 4);
    const smoothing = 1 - Math.exp(-delta / (targetEnergy > this.features.energy ? .04 : .18));
    const energy = this.features.energy + (targetEnergy - this.features.energy) * smoothing;
    const transient = Math.max(0, bass - this.previousBass - .045);
    const kick = now - this.lastBeat > 180 ? clamp(transient * 7) : 0;
    if (kick > .15) this.lastBeat = now;
    this.features.kick = Math.max(kick, this.features.kick * .82);
    this.features.bass = bass;
    this.features.mid = mid;
    this.features.treble = treble;
    this.features.energy = energy;
    this.features.beat = this.features.kick;
    this.features.snare = Math.max(clamp((mid - this.previousMid - .06) * 6), this.features.snare * .8);
    // This is a sustained mid-band proxy, not instrument separation.
    this.features.violaEnergy += (Math.min(energy, mid) - this.features.violaEnergy) * .07;
    this.previousBass = bass;
    this.previousMid = mid;
    return this.features;
  }

  private attachStream(stream: MediaStream, ownsTracks: boolean): void {
    if (!this.context || !this.preamp) throw new Error("Activate the audio context before attaching a stream.");
    const source = this.context.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
    source.connect(this.preamp);
    this.releaseStream();
    this.stream = stream;
    this.ownsTracks = ownsTracks;
    this.source = source;
    const track = stream.getAudioTracks()[0];
    const muted = () => {
      this.status = "INPUT MUTED / timeline continues";
      this.notify("Audio input is temporarily muted. The deterministic show continues.");
    };
    const unmuted = () => { this.status = "AUDIO / recovered"; };
    const ended = () => {
      this.releaseStream();
      this.status = "INPUT LOST / timeline continues";
      this.notify("Audio input ended. The show continues; reconnect from flight control.");
    };
    track.addEventListener("mute", muted);
    track.addEventListener("unmute", unmuted);
    track.addEventListener("ended", ended);
    this.cleanupTracks.push(() => {
      track.removeEventListener("mute", muted);
      track.removeEventListener("unmute", unmuted);
      track.removeEventListener("ended", ended);
    });
  }
}
