export const DURATION = 180;
export const PHASES = [
  { name: "BOOT", time: 0 },
  { name: "COMPILE", time: 30 },
  { name: "BUILD", time: 60 },
  { name: "RUN", time: 90 },
  { name: "OVERCLOCK", time: 120 },
  { name: "REVEAL", time: 155 },
] as const;

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
export const smoothstep = (value: number): number => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
export const smootherstep = (value: number): number => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export class Timeline {
  time = 0;
  playing = false;
  speed = 1;
  private previousNow: number | undefined;

  get phase(): string {
    return [...PHASES].reverse().find((phase) => this.time >= phase.time)!.name;
  }

  play(): void {
    if (this.time >= DURATION) this.time = 0;
    this.playing = true;
    this.previousNow = undefined;
  }

  pause(): void {
    this.playing = false;
    this.previousNow = undefined;
  }

  seek(seconds: number): void {
    if (!Number.isFinite(seconds)) throw new RangeError("Timeline time must be finite.");
    this.time = clamp(seconds, 0, DURATION);
    if (this.time === DURATION) this.pause();
    this.previousNow = undefined;
  }

  restart(): void {
    this.seek(0);
    this.play();
  }

  tick(now: number): number {
    if (this.playing && this.previousNow !== undefined) {
      this.time = Math.min(DURATION, this.time + Math.max(0, now - this.previousNow) * this.speed / 1000);
      if (this.time >= DURATION) this.pause();
    }
    this.previousNow = now;
    return this.time;
  }
}
