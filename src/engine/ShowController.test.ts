import { describe, expect, it, vi } from "vitest";
import { ShowController } from "./ShowController";
import { Timeline } from "./Timeline";
import { parseMessage } from "./protocol";
import { frequencyBand } from "./AudioAnalyzer";
import { cameraPose } from "../camera/CameraPath";

describe("Strudel protocol", () => {
  it("accepts supported triggers, energy, section and explicit viola levels", () => {
    expect(parseMessage({ type: "trigger", event: "kick" })).toEqual({ type: "trigger", event: "kick", velocity: 1 });
    expect(parseMessage({ type: "energy", value: .6 })).toEqual({ type: "energy", value: .6 });
    expect(parseMessage({ type: "section", section: "OVERCLOCK" })).toEqual({ type: "section", section: "OVERCLOCK" });
    expect(parseMessage({ type: "levels", values: { violaEnergy: .4 } })).toEqual({ type: "levels", values: { violaEnergy: .4 } });
  });

  it.each([
    null, [], "kick", {}, { type: "trigger", event: "unknown" },
    { type: "trigger", event: "kick", velocity: -1 },
    { type: "energy", value: Infinity }, { type: "energy", value: 1.1 },
    { type: "section", section: "UNKNOWN" },
    { type: "levels", values: { unexpected: .5 } },
  ])("rejects malformed input: %j", (input) => {
    expect(() => parseMessage(input)).toThrow();
  });

  it("reports malformed JSON instead of swallowing it", () => {
    const notify = vi.fn();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const controller = new ShowController(new Timeline(), notify);
    expect(controller.receive("{broken")).toBe(false);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Rejected show event"));
    warning.mockRestore();
  });
});

describe("independent music-reactive layer", () => {
  it("changes levels but never changes camera time, phase, or pose", () => {
    const timeline = new Timeline();
    timeline.seek(74);
    const controller = new ShowController(timeline, vi.fn(), () => 100);
    const pose = cameraPose(timeline.time);
    controller.trigger("kick");
    controller.trigger("snare", .5);
    controller.trigger("viola", .7);
    controller.setEnergy(.8);
    controller.setSection("OVERCLOCK");
    const sample = controller.sample(100);
    expect(sample.kick).toBe(1);
    expect(sample.snare).toBe(.5);
    expect(sample.violaEnergy).toBe(.7);
    expect(sample.energy).toBe(.8);
    expect(timeline.time).toBe(74);
    expect(timeline.phase).toBe("BUILD");
    expect(cameraPose(timeline.time)).toEqual(pose);
  });

  it("decays transients and dropped level streams, and can disable reactivity", () => {
    let now = 0;
    const controller = new ShowController(new Timeline(), vi.fn(), () => now);
    controller.trigger("kick");
    controller.setLevels({ bass: 1 });
    expect(controller.sample().bass).toBe(1);
    now = 5000;
    expect(controller.sample().kick).toBeLessThan(.001);
    expect(controller.sample().bass).toBeLessThan(.001);
    controller.trigger("drop");
    controller.enabled = false;
    expect(Object.values(controller.sample()).every((value) => value === 0)).toBe(true);
  });

  it("clears impulses on seek and bounds intensity-amplified effects", () => {
    const controller = new ShowController(new Timeline(), vi.fn(), () => 0);
    controller.intensity = 2;
    controller.trigger("kick", .9);
    expect(controller.sample().kick).toBe(1);
    controller.resetTransient();
    expect(controller.sample().kick).toBe(0);
    controller.setEnergy(.5);
    controller.setEnergy(null);
    expect(controller.sample().energy).toBe(0);
    expect(() => { controller.intensity = Number.NaN; }).toThrow();
    expect(() => { controller.intensity = 2.1; }).toThrow();
  });

  it("rejects non-local or non-WebSocket bridge URLs before opening a connection", () => {
    const controller = new ShowController(new Timeline(), vi.fn());
    expect(() => controller.connect("ws://example.com:8787")).toThrow("localhost");
    expect(() => controller.connect("https://localhost:8787")).toThrow("localhost");
  });

  it("isolates frequency bands at different sample rates", () => {
    for (const rate of [44100, 48000]) {
      const spectrum = new Uint8Array(1024);
      for (let i = 0; i < spectrum.length; i++) {
        if (i * rate / 2048 >= 40 && i * rate / 2048 < 180) spectrum[i] = 255;
      }
      expect(frequencyBand(spectrum, rate, 2048, 40, 180)).toBe(1);
      expect(frequencyBand(spectrum, rate, 2048, 4000, 14000)).toBe(0);
    }
  });
});
