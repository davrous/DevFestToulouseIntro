import "@babylonjs/core/Engines/Extensions/engine.videoTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { VideoTexture } from "@babylonjs/core/Materials/Textures/videoTexture";
import type { Scene } from "@babylonjs/core/scene";
import type { ArcadeVideoGame } from "./config";
import type { ArcadeScreenMedia } from "./ArcadeScreenMedia";

export const mediaPosition = (time: number, offset: number, duration: number): number =>
  ((time + offset) % duration + duration) % duration;
export const mediaDrift = (actual: number, target: number, duration: number): number =>
  Math.abs(((actual - target + duration * 1.5) % duration) - duration / 2);

type ClockVideo = Pick<HTMLVideoElement, "currentTime" | "duration" | "seeking" | "paused"
  | "playbackRate" | "play" | "pause">;

export class ArcadeVideoClock {
  desired = 0;
  seeks = 0;
  private lastTime = 0;
  private playing = false;
  private playPending = false;
  private failed = false;

  constructor(readonly video: ClockVideo, private readonly report: (error: unknown) => void) {}

  synchronize(time: number, offset: number, playing: boolean, speed: number, force = false): void {
    const changed = playing !== this.playing;
    if (changed || force) this.failed = false;
    this.playing = playing;
    this.desired = mediaPosition(time, offset, this.video.duration);
    this.video.playbackRate = speed;
    if (!playing) this.video.pause();
    const tolerance = playing && !force && !changed ? .22 : .035;
    if (!this.video.seeking && mediaDrift(this.video.currentTime, this.desired, this.video.duration) > tolerance) {
      this.video.currentTime = this.desired;
      this.seeks++;
    }
    if (playing && this.video.paused && !this.video.seeking && !this.playPending && !this.failed) {
      this.playPending = true;
      void this.video.play().then(() => {
        this.playPending = false;
        if (!this.playing) this.video.pause();
      }, (error: unknown) => {
        this.playPending = false;
        this.failed = true;
        this.report(error);
      });
    }
    this.lastTime = time;
  }

  settle(): void {
    // A rapid rewind can supersede an in-flight browser seek.
    this.synchronize(this.lastTime, this.desired - this.lastTime, this.playing, this.video.playbackRate);
  }

  pause(): void { this.playing = false; this.video.pause(); }
}

class ClockedVideoTexture extends VideoTexture {
  uploadFrame(): void { this._updateInternalTexture(); }
}

function loadPoster(scene: Scene, game: ArcadeVideoGame): { texture: Texture; ready: Promise<void> } {
  let loaded!: () => void;
  let failed!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => { loaded = resolve; failed = reject; });
  const timer = setTimeout(() => failed(new Error(`Arcade poster timeout: ${game}`)), 20000);
  const texture = new Texture(`/assets/arcade/${game}-poster.png`, scene, false, true, Texture.NEAREST_SAMPLINGMODE,
    () => { clearTimeout(timer); loaded(); },
    (message) => { clearTimeout(timer); failed(new Error(`Arcade poster failed: ${game}: ${message}`)); });
  return { texture, ready };
}

function mediaEvent(video: HTMLVideoElement, event: string, action: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, complete);
      video.removeEventListener("error", failure);
    };
    const complete = () => { cleanup(); resolve(); };
    const failure = () => { cleanup(); reject(new Error(`Arcade ${event}: ${video.currentSrc || video.src} (${video.error?.message ?? "media timeout"})`)); };
    const timer = setTimeout(failure, 20000);
    video.addEventListener(event, complete, { once: true });
    video.addEventListener("error", failure, { once: true });
    action();
  });
}

export class ArcadeMedia implements ArcadeScreenMedia {
  readonly video = document.createElement("video");
  readonly poster: Texture;
  readonly clock: ArcadeVideoClock;
  texture?: ClockedVideoTexture;
  error?: string;
  private preparation?: Promise<void>;
  private readonly posterReady: Promise<void>;
  private disposed = false;
  private frameCallback?: number;
  private dirty = true;
  private uploadedTime = -1;
  private wasPlaying = false;
  private readonly onFrame = () => {
    this.dirty = true;
    this.frameCallback = this.video.requestVideoFrameCallback(this.onFrame);
  };
  private readonly onSeek = () => {
    this.clock.settle();
    if (!this.video.seeking) { this.texture?.uploadFrame(); this.uploadedTime = this.video.currentTime; }
  };
  private readonly onError = () => this.fail(this.video.error?.message ?? "Video decoding failed.");

  constructor(private readonly scene: Scene, readonly game: ArcadeVideoGame, readonly offset: number,
    private readonly report: (message: string) => void) {
    this.video.muted = this.video.defaultMuted = true;
    this.video.loop = true;
    this.video.playsInline = true;
    this.video.preload = "auto";
    const poster = loadPoster(scene, game);
    this.poster = poster.texture;
    this.posterReady = poster.ready;
    this.poster.wrapU = this.poster.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.clock = new ArcadeVideoClock(this.video, (error) => this.fail(String(error)));
  }

  get aspectRatio(): number { return (this.video.videoWidth || 4) / (this.video.videoHeight || 3); }
  get videoHeight(): number { return this.video.videoHeight || 240; }

  private fail(reason: string): void {
    if (this.disposed || this.error) return;
    this.error = `${this.game}: ${reason}`;
    this.clock.pause();
    console.error("Arcade media unavailable; retaining the game poster.", this.error);
    this.report(this.error);
  }

  prepare(): Promise<void> { return this.preparation ??= this.prepareMedia(); }

  private async prepareMedia(): Promise<void> {
    await Promise.all([
      this.posterReady,
      mediaEvent(this.video, "loadeddata", () => { this.video.src = `/assets/arcade/${this.game}.mp4`; this.video.load(); }),
    ]);
    if (!Number.isFinite(this.video.duration) || this.video.duration <= 0) throw new Error(`Invalid arcade video duration: ${this.game}`);
    const target = mediaPosition(0, this.offset, this.video.duration);
    if (target > .001) await mediaEvent(this.video, "seeked", () => { this.video.currentTime = target; });
    this.texture = new ClockedVideoTexture(`Arcade / ${this.game} / offset ${this.offset}`, this.video, this.scene,
      false, false, Texture.NEAREST_SAMPLINGMODE,
      { autoPlay: false, autoUpdateTexture: false, independentVideoSource: true },
      (message) => this.fail(message ?? "Video texture upload failed."));
    this.texture.wrapU = this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.texture.uploadFrame();
    this.uploadedTime = this.video.currentTime;
    this.dirty = false;
    if (typeof this.video.requestVideoFrameCallback === "function") this.frameCallback = this.video.requestVideoFrameCallback(this.onFrame);
    this.video.addEventListener("seeked", this.onSeek);
    this.video.addEventListener("error", this.onError);
  }

  update(time: number, playing: boolean, speed: number, force = false): void {
    if (!this.texture || this.disposed) return;
    if (force || (playing && !this.wasPlaying)) this.error = undefined;
    this.wasPlaying = playing;
    if (this.error) return;
    this.clock.synchronize(time, this.offset, playing, speed, force);
    const changed = typeof this.video.requestVideoFrameCallback === "function" ? this.dirty : this.uploadedTime !== this.video.currentTime;
    if (changed && !this.video.seeking && this.video.readyState >= 2) {
      this.texture.uploadFrame(); this.dirty = false; this.uploadedTime = this.video.currentTime;
    }
  }

  async whenSettled(): Promise<void> {
    while (this.video.seeking) await mediaEvent(this.video, "seeked", () => {});
    this.texture?.uploadFrame();
  }

  pause(): void { this.wasPlaying = false; this.clock.pause(); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.frameCallback !== undefined) this.video.cancelVideoFrameCallback(this.frameCallback);
    this.clock.pause();
    this.video.removeEventListener("seeked", this.onSeek);
    this.video.removeEventListener("error", this.onError);
    this.texture?.dispose();
    this.poster.dispose();
    this.video.removeAttribute("src");
    this.video.load();
  }
}

export class ArcadeMediaManager {
  readonly resources: ArcadeMedia[] = [];
  readonly errors: string[] = [];
  private readonly onPageHide = () => this.pause();

  constructor(private readonly scene: Scene) {
    window.addEventListener("pagehide", this.onPageHide);
    scene.onDisposeObservable.addOnce(() => {
      window.removeEventListener("pagehide", this.onPageHide);
      this.resources.forEach((media) => media.dispose());
    });
  }

  get(game: ArcadeVideoGame, offset: number): ArcadeMedia {
    const existing = this.resources.find((media) => media.game === game && media.offset === offset);
    if (existing) return existing;
    const media = new ArcadeMedia(this.scene, game, offset, (message) => this.errors.push(message));
    this.resources.push(media);
    return media;
  }

  async prepare(): Promise<void> { await Promise.all(this.resources.map((media) => media.prepare())); }

  pause(): void { this.resources.forEach((media) => media.pause()); }

  releaseUnused(used: readonly ArcadeMedia[]): void {
    for (let at = this.resources.length - 1; at >= 0; at--) {
      if (!used.includes(this.resources[at])) {
        this.resources[at].dispose();
        this.resources.splice(at, 1);
      }
    }
  }
}
