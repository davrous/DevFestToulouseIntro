import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { StrudelEventTransport } from "./StrudelEventTransport";

let renderLoop: (() => void) | undefined;

vi.mock("@babylonjs/core/Engines/engine", () => ({
  Engine: class {
    setHardwareScalingLevel() {}
    runRenderLoop(callback: () => void) { renderLoop = callback; }
  },
}));
vi.mock("../scene/DevFestScene", () => ({
  DevFestScene: class {
    scene = { render() {}, whenReadyAsync: async () => {}, getPhysicsEngine: () => undefined, physicsEnabled: false };
    async prepare() {}
    update() {}
  },
}));
vi.mock("../debug/DebugPanel", () => ({
  DebugPanel: class { update() {} setVisible() {} },
}));

class TestElement extends EventTarget {
  hidden = false;
  disabled = false;
  textContent = "";
  style = { width: "" };
  classList = { add() {}, remove() {} };
  focus() {}
}

class TestDocument extends EventTarget {
  hidden = false;
  body = new TestElement();
  private readonly elements = new Map<string, TestElement>();
  createElement() { return new TestElement(); }
  getElementById(id: string) {
    if (!this.elements.has(id)) this.elements.set(id, new TestElement());
    return this.elements.get(id);
  }
}

let doc: TestDocument;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  doc = new TestDocument();
  vi.stubGlobal("document", doc);
  const win = Object.assign(new EventTarget(), {
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal("window", win);
  vi.spyOn(StrudelEventTransport.prototype, "connect").mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  renderLoop = undefined;
});

async function setup() {
  const app = new App(document.createElement("canvas"));
  await app.initialize();
  const launch = app.showController.strudelEvents.onShowStart;
  if (!launch) throw new Error("The explicit Strudel launch handler must be installed.");
  return { app, launch };
}

describe("synchronized launch from the other tab", () => {
  it("starts a hidden show with no render frames, keeps time on return, and stays synchronized across tab switches", async () => {
    const { app, launch } = await setup();
    doc.hidden = true;
    launch(performance.timeOrigin + performance.now() + 100, "music");
    vi.advanceTimersByTime(99);
    expect(app.timeline.playing).toBe(false);
    vi.advanceTimersByTime(1);
    expect(app.inLobby).toBe(false);
    expect(app.timeline.playing).toBe(true);
    expect(app.timeline.time).toBe(0);
    vi.advanceTimersByTime(1000);
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(renderLoop).toBeDefined();
    renderLoop!();
    expect(app.timeline.time).toBeCloseTo(1);
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(app.timeline.playing).toBe(true);
    vi.advanceTimersByTime(1000);
    renderLoop!();
    expect(app.timeline.time).toBeCloseTo(2);
  });

  it("preserves auto-pause for ordinary playback and after manual synchronized controls", async () => {
    const { app, launch } = await setup();
    app.start();
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(app.timeline.playing).toBe(false);
    launch(performance.timeOrigin + performance.now() + 100, "music");
    vi.advanceTimersByTime(100);
    expect(app.timeline.playing).toBe(true);
    app.togglePlayback();
    app.togglePlayback();
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(app.timeline.playing).toBe(false);
  });

  it("cancels the launch timer on peer stop or local navigation without a delayed restart", async () => {
    const { app, launch } = await setup();
    launch(performance.timeOrigin + performance.now() + 100, "music");
    app.showController.strudelEvents.onShowStartCancelled?.("music");
    vi.advanceTimersByTime(200);
    expect(app.inLobby).toBe(true);
    expect(app.timeline.playing).toBe(false);
    launch(performance.timeOrigin + performance.now() + 100, "music");
    app.returnToLobby();
    vi.advanceTimersByTime(200);
    expect(app.inLobby).toBe(true);
    expect(app.timeline.playing).toBe(false);
  });

  it("still refuses an unready or already-playing show", async () => {
    const { app, launch } = await setup();
    app.ready = false;
    expect(() => launch(performance.timeOrigin, "music")).toThrow("SYSTEM READY");
    app.ready = true;
    app.start();
    expect(() => launch(performance.timeOrigin, "music")).toThrow("Pause the show");
  });
});
