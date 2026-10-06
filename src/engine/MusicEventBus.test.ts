import { describe, expect, it, vi } from "vitest";
import { CUE_WINDOWS, parseSyncMessage, type AVEvent } from "./avProtocol";
import { MusicEventBus } from "./MusicEventBus";
import { ShowController } from "./ShowController";
import { Timeline } from "./Timeline";
import { silentFeatures } from "./AudioAnalyzer";
import { cameraPose } from "../camera/CameraPath";

const message = (overrides: Partial<AVEvent> = {}): AVEvent => ({
  version: 1, type: "musical-event", event: "kick", source: "strudel", senderId: "test",
  id: "test:1:kick:0", velocity: .9, scheduledTime: 1100, sentAt: 1000, cycle: 0, cps: .625, ...overrides,
});

describe("MusicEventBus", () => {
  it("queues early events, dispatches at onset and immediately handles slightly late input", () => {
    let now = 1000;
    const bus = new MusicEventBus(() => now);
    const listener = vi.fn();
    bus.subscribe(listener);
    bus.receive(message());
    bus.flush();
    expect(listener).not.toHaveBeenCalled();
    now = 1099.9;
    bus.flush();
    expect(listener).not.toHaveBeenCalled();
    now = 1100;
    bus.flush();
    expect(listener).toHaveBeenCalledOnce();
    expect(bus.records[0].lateness).toBe(0);
    bus.receive(message({ id: "late", scheduledTime: 1090 }));
    bus.flush();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(bus.records[0].lateness).toBe(10);
  });

  it("protects duplicate onsets, bounded queues and stale messages with visible outcomes", () => {
    const bus = new MusicEventBus(() => 1000);
    expect(bus.receive(message())).toBe(true);
    expect(bus.receive(message())).toBe(false);
    expect(bus.records[0].outcome).toBe("duplicate");
    expect(bus.receive(message({ id: "far", scheduledTime: 6001 }))).toBe(false);
    expect(bus.records[0].outcome).toBe("stale");
    for (let index = 0; index < 255; index++) bus.receive(message({ id: `extra:${index}` }));
    expect(bus.receive(message({ id: "overflow" }))).toBe(false);
    expect(bus.records[0].outcome).toBe("overload");
    expect(bus.records).toHaveLength(40);
    bus.cancelSource("test");
    expect(bus.records[1].outcome).toBe("cancelled");
  });

  it("uses the same subscription for manual events and supports unsubscribe", () => {
    const bus = new MusicEventBus(() => 1000);
    const listener = vi.fn();
    const stop = bus.subscribe(listener);
    bus.manual("impact", .5);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ event: "impact", source: "manual", velocity: .5 }));
    stop();
    bus.manual("kick");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("keeps accurate rates and the last cue beyond the bounded monitor", () => {
    let now = 1000;
    const bus = new MusicEventBus(() => now);
    bus.manual("cinema-cut");
    for (let index = 0; index < 80; index++) bus.receive(message({ id: `rhythm:${index}` }));
    expect(bus.records).toHaveLength(40);
    expect(bus.eventsPerSecond).toBe(81);
    expect(bus.lastCue?.event.event).toBe("cinema-cut");
    expect(bus.lastCue?.outcome).toBe("applied");
    now = 2001;
    expect(bus.eventsPerSecond).toBe(0);
  });

  it.each([
    null, [], { ...message(), version: 2 }, { ...message(), event: "fft-kick" },
    { ...message(), velocity: NaN }, { ...message(), cps: 0 },
    { ...message(), scheduledTime: 1e100 },
    { ...message(), scheduledTime: Infinity }, { ...message(), id: "x".repeat(201) },
  ])("rejects invalid protocol data: %j", (input) => {
    expect(() => parseSyncMessage(input)).toThrow();
  });
});

describe("event accents alongside continuous FFT", () => {
  it("combines real FFT bands and event pulses without moving the camera or changing the clock", () => {
    let now = 1000;
    const timeline = new Timeline();
    timeline.seek(74);
    timeline.play();
    const controller = new ShowController(timeline, vi.fn(), () => now);
    const pose = cameraPose(timeline.time);
    vi.spyOn(controller.audio, "sample").mockReturnValue({ ...silentFeatures(), bass: .4, mid: .5, energy: .6 });
    controller.triggerEvent("kick", .9);
    const features = controller.sample();
    expect(features).toMatchObject({ kick: .9, bass: .4, mid: .5, energy: .6 });
    controller.triggerEvent("hat", .7);
    controller.triggerEvent("impact", .8);
    expect(controller.sample()).toMatchObject({ treble: .7, drop: .8 });
    expect(cameraPose(timeline.time)).toEqual(pose);
    expect(timeline.time).toBe(74);
    now += 5000;
    expect(controller.sample().kick).toBeLessThan(.001);
  });

  it("windows one-shot cues, never waits for one, and rearms on rehearsal seeks", () => {
    const timeline = new Timeline();
    const controller = new ShowController(timeline, vi.fn(), () => 1000);
    controller.triggerEvent("cinema-cut");
    expect(controller.musicEvents.records[0].outcome).toBe("paused");
    timeline.play();
    controller.triggerEvent("cinema-cut");
    expect(controller.musicEvents.records[0].outcome).toBe("outside-window");
    timeline.seek(CUE_WINDOWS["cinema-cut"].time + CUE_WINDOWS["cinema-cut"].tolerance);
    controller.triggerEvent("cinema-cut");
    expect(controller.musicEvents.records[0].outcome).toBe("applied");
    controller.triggerEvent("cinema-cut");
    expect(controller.musicEvents.records[0].outcome).toBe("already-accented");
    expect(timeline.playing).toBe(true);
    controller.resetTransient();
    controller.triggerEvent("cinema-cut");
    expect(controller.musicEvents.records[0].outcome).toBe("applied");
    timeline.seek(173);
    controller.triggerEvent("reveal");
    expect(controller.sample().drop).toBe(.65);
    expect(controller.revealAccent).toBe(1);
    expect(timeline.time).toBe(173);
  });

  it("clears queued accents on reset and supports audio absent/events disabled", () => {
    const controller = new ShowController(new Timeline(), vi.fn(), () => 1000);
    controller.musicEvents.receive(message({ scheduledTime: performance.timeOrigin + 1100, sentAt: performance.timeOrigin + 1000 }));
    controller.resetTransient();
    controller.sample(1100);
    expect(controller.features.kick).toBe(0);
    controller.triggerEvent("snare");
    expect(controller.sample().snare).toBe(1);
    controller.enabled = false;
    expect(Object.values(controller.sample()).every((value) => value === 0)).toBe(true);
  });
});
