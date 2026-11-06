import { describe, expect, it, vi } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { arcadeSettings, validateArcadeSettings } from "./config";
import { ArcadeVideoClock, mediaDrift, mediaPosition } from "./ArcadeMediaManager";
import { proceduralFrame } from "./ArcadeProceduralMedia";
import { CABINET_SCREENS, createDisplayQuad, screenAspect } from "./ArcadeScreenController";
import { BALL_RADIUS, BUMPER_RADIUS, BUMPERS, PINBALL_ROUTE, PINBALL_SLOPE, PLAYFIELD_HEIGHT, pinballState, samplePinball } from "./pinballState";
import { PinballAttractController } from "./PinballAttractController";

vi.mock("@babylonjs/core/Materials/Textures/dynamicTexture", () => ({
  DynamicTexture: class {
    getContext() {
      return { fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        fillText() {}, measureText: (text: string) => ({ width: text.length * 20 }) };
    }
    update() {}
  },
}));

class FakeVideo {
  private position = 0;
  duration = 10;
  seeking = false;
  paused = true;
  playbackRate = 1;
  assignments = 0;
  get currentTime() { return this.position; }
  set currentTime(value: number) { this.position = value; this.seeking = true; this.assignments++; }
  advance(value: number) { this.position = value; }
  pause() { this.paused = true; }
  async play() { this.paused = false; }
}

describe("arcade master-clock video transport", () => {
  it("places the original games on the visible arcade and wide monitors", () => {
    expect(arcadeSettings().assignments).toEqual([
      { cabinet: 0, game: "super-mario", offset: 1.3 },
      { cabinet: 1, game: "devfest-10", offset: 0 },
      { cabinet: 3, game: "super-mario", offset: 5.1 },
      { cabinet: 4, game: "toulouse-fps", offset: 0 },
    ]);
  });

  it("uses a deterministic 12 fps animation clock for procedural arcade games", () => {
    expect(proceduralFrame(0)).toBe(0);
    expect(proceduralFrame(1 / 12)).toBe(1);
    expect(proceduralFrame(2)).toBe(24);
    expect(proceduralFrame(12)).toBe(144);
  });

  it("wraps negative offsets and measures drift across a loop seam", () => {
    expect(mediaPosition(0, -2, 10)).toBe(8);
    expect(mediaDrift(9.98, .02, 10)).toBeCloseTo(.04);
  });
  it("does not seek every frame and follows pause, rewind, restart and speed changes", async () => {
    const video = new FakeVideo(), report = vi.fn(), clock = new ArcadeVideoClock(video, report);
    for (let frame = 0; frame < 600; frame++) {
      const time = frame / 60;
      video.advance(time);
      clock.synchronize(time, 0, true, 1);
    }
    await Promise.resolve();
    expect(video.assignments).toBe(0);
    clock.synchronize(3, 0, false, 1, true);
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(3);
    video.seeking = false; clock.settle();
    for (let frame = 0; frame < 60; frame++) clock.synchronize(3, 0, false, 1);
    expect(video.assignments).toBe(1);
    clock.synchronize(0, 0, true, .5, true);
    expect(video.currentTime).toBe(0);
    expect(video.playbackRate).toBe(.5);
    video.seeking = false; clock.settle();
    await Promise.resolve();
    expect(video.paused).toBe(false);
    expect(report).not.toHaveBeenCalled();
  });
  it("coalesces rapid seek requests and surfaces autoplay failure without retrying every frame", async () => {
    const video = new FakeVideo(), report = vi.fn(), clock = new ArcadeVideoClock(video, report);
    clock.synchronize(5, 0, false, 1, true);
    clock.synchronize(2, 0, false, 1, true);
    expect(video.assignments).toBe(1);
    video.seeking = false; clock.settle();
    expect(video.currentTime).toBe(2);
    video.seeking = false;
    vi.spyOn(video, "play").mockRejectedValue(new Error("NotAllowedError"));
    clock.synchronize(2, 0, true, 1);
    await Promise.resolve();
    for (let frame = 0; frame < 30; frame++) clock.synchronize(2, 0, true, 1);
    expect(report).toHaveBeenCalledOnce();
    expect(video.play).toHaveBeenCalledOnce();
  });
  it("does not resume a stale play promise after pausing", async () => {
    const video = new FakeVideo();
    let resolve!: () => void;
    vi.spyOn(video, "play").mockImplementation(() => new Promise<void>((done) => { resolve = () => { video.paused = false; done(); }; }));
    const clock = new ArcadeVideoClock(video, vi.fn());
    clock.synchronize(0, 0, true, 1);
    clock.synchronize(0, 0, false, 1);
    resolve(); await Promise.resolve();
    expect(video.paused).toBe(true);
  });
});

describe("fitted cabinet surfaces", () => {
  it("rotates only the printed pinball boards by 180 degrees, preserving the inclined ball mechanics", () => {
    const engine = new NullEngine(), scene = new Scene(engine), parent = new TransformNode("Original cabinet", scene);
    for (const [index, cabinet] of [2, 5].entries()) {
      const pinball = new PinballAttractController(scene, cabinet, parent, index, cabinet === 2);
      const board = scene.getMeshByName(`Pinball fitted board / ${cabinet}`)!;
      expect(board.rotation.y).toBe(Math.PI);
      expect(board.parent).toBe(pinball.playfield);
      expect(pinball.playfield.rotation.x).toBe(PINBALL_SLOPE);
      expect(pinball.playfield.rotation.y).toBe(0);
      expect(pinball.balls.every((ball) => ball.parent === pinball.playfield)).toBe(true);
    }
    scene.dispose(); engine.dispose();
  });

  it("uses the distinct measured landscape screens without stretching the portrait game", () => {
    expect(screenAspect("arcade")).toBeCloseTo(1.603, 2);
    expect(screenAspect("dance")).toBeCloseTo(2.393, 2);
    const portrait = 440 / 498;
    const fit = Math.min(1, portrait / screenAspect("arcade"));
    expect(fit).toBeLessThan(.56);
    const engine = new NullEngine(), scene = new Scene(engine), parent = new TransformNode("Original cabinet", scene);
    const screen = CABINET_SCREENS.arcade;
    const quad = createDisplayQuad(scene, "test screen", parent, screen.width, screen.bottom, screen.top, screen.bottomZ, screen.topZ);
    expect(quad.getVerticesData("uv")).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
    expect(quad.parent).toBe(parent);
    scene.dispose(); engine.dispose();
  });
});

describe("deterministic pinball attract choreography", () => {
  it("reproduces balls, flippers, lamps, score and multiball after arbitrary seeks", () => {
    const settings = arcadeSettings(), state = pinballState();
    const before = structuredClone(samplePinball(11.3, 0, true, settings, state));
    for (const time of [180, 0, 22, 7, 90, 1]) samplePinball(time, 0, true, settings, state);
    expect(samplePinball(11.3, 0, true, settings, state)).toEqual(before);
    expect(before.multiball).toBe(true);
    expect(before.balls.every((ball) => ball.lift === 0)).toBe(true);
    expect(samplePinball(12.3, 0, true, settings).label).toBe("HIGH SCORE / AI4FUN");
    expect(samplePinball(10.8, 0, false, settings).multiball).toBe(false);
    settings.enablePinballMultiball = false;
    expect(samplePinball(10.8, 0, true, settings).balls.slice(1).every((ball) => ball.lift < 0)).toBe(true);
  });
  it("flashes only a contacted bumper and strokes the appropriate pivot at ball arrival", () => {
    const settings = arcadeSettings();
    for (const point of PINBALL_ROUTE) {
      if (point.bumper !== undefined) {
        const state = samplePinball(settings.pinballStart + point.t, 0, false, settings);
        const ball = state.balls[0], bumper = BUMPERS[point.bumper];
        expect(Math.hypot(ball.x - bumper[0], ball.z - bumper[1])).toBeCloseTo(BUMPER_RADIUS + BALL_RADIUS, 2);
        expect(state.bumpers[point.bumper]).toBeCloseTo(1);
        expect(state.bumpers.filter((value) => value > 0)).toHaveLength(1);
      }
      if (point.flipper !== undefined) {
        const state = samplePinball(settings.pinballStart + point.t, 0, false, settings);
        expect(state.flippers[point.flipper]).toBeCloseTo(1);
        expect(samplePinball(settings.pinballStart + point.t + .2, 0, false, settings).flippers[point.flipper]).toBe(0);
      }
    }
  });
  it("keeps all visible balls above the sloped board, under the glass and clear of bumper interiors", () => {
    const settings = arcadeSettings();
    let score = 0;
    for (let time = 0; time < 32; time += 1 / 120) {
      const state = samplePinball(time, 0, true, settings);
      expect(state.score).toBeGreaterThanOrEqual(score);
      score = state.score;
      for (let first = 0; first < 3; first++) for (let second = first + 1; second < 3; second++) {
        const a = state.balls[first], b = state.balls[second];
        if (a.lift < -.001 || b.lift < -.001) continue;
        expect(Math.hypot(a.x - b.x, a.z - b.z), `ball overlap at ${time.toFixed(3)}`).toBeGreaterThan(BALL_RADIUS * 2);
      }
      for (const ball of state.balls) {
        expect(Math.abs(ball.x)).toBeLessThanOrEqual(.16);
        if (ball.lift < -.001) continue;
        const local = new Vector3(ball.x, BALL_RADIUS, ball.z);
        const y = PLAYFIELD_HEIGHT - .025 / 6 + local.y * Math.cos(PINBALL_SLOPE) - local.z * Math.sin(PINBALL_SLOPE);
        const z = .025 + local.y * Math.sin(PINBALL_SLOPE) + local.z * Math.cos(PINBALL_SLOPE);
        const glassY = .3541667 - z / 6;
        expect(y + BALL_RADIUS).toBeLessThan(glassY + .0005);
        for (const [x, z] of BUMPERS) {
          expect(Math.hypot(ball.x - x, ball.z - z), `bumper penetration at ${time.toFixed(3)}`).toBeGreaterThanOrEqual(BUMPER_RADIUS + BALL_RADIUS - .0015);
        }
      }
    }
  });
  it("validates tuning and independent flags", () => {
    const settings = arcadeSettings();
    expect(() => validateArcadeSettings(settings)).not.toThrow();
    settings.pinballSpeed = NaN;
    expect(() => validateArcadeSettings(settings)).toThrow();
    settings.pinballSpeed = 1; settings.assignments[0].offset = Infinity;
    expect(() => validateArcadeSettings(settings)).toThrow();
  });
});
