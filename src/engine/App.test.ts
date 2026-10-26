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
  checked = false;
  paused = true;
  currentTime = 0;
  src = "";
  value = "";
  textContent = "";
  dataset: Record<string, string> = {};
  contentWindow = new EventTarget();
  style = { width: "" };
  classList = { add() {}, remove() {} };
  focus() {}
  getAttribute(name: string) { return name === "src" ? this.src || null : null; }
  load() {}
  pause() { this.paused = true; }
  async play() { this.paused = false; }
  replaceChildren() {}
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
  vi.stubGlobal("location", { origin: "http://127.0.0.1:5173" });
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
  it.each(["violas-journey", "viola-trance"])("plays the selected %s MP3 and keeps it aligned across transport controls", async (soundtrack) => {
    const { app } = await setup();
    doc.getElementById("music-source")!.value = "mp3";
    doc.getElementById("music-source")!.dispatchEvent(new Event("change"));
    expect(doc.getElementById("soundtrack-choice")!.hidden).toBe(false);
    expect(doc.getElementById("strudel-score-choice")!.hidden).toBe(true);
    doc.getElementById("soundtrack")!.value = soundtrack;
    vi.spyOn(app.showController.soundtrack, "connectMediaElement").mockResolvedValue();
    await app.startFromGesture();
    const player = doc.getElementById("soundtrack-player")!;
    expect(player.src).toBe(`./assets/music/${soundtrack}.mp3`);
    expect(player.paused).toBe(false);
    app.togglePlayback();
    expect(player.paused).toBe(true);
    app.togglePlayback();
    expect(player.paused).toBe(false);
    app.seek(42);
    expect(player.currentTime).toBe(42);
    app.returnToLobby();
    expect(player.paused).toBe(true);
    expect(player.currentTime).toBe(0);
  });

  it("loads the bundled keynote in the hidden performance frame without starting visuals early", async () => {
    const { app } = await setup();
    doc.getElementById("music-source")!.value = "strudel";
    doc.getElementById("play")!.dispatchEvent(new Event("click"));
    expect((doc.getElementById("strudel-performance") as TestElement).src)
      .toMatch(/^\.\/strudel\/\?performance=keynote&score=arcade&launch=[\w-]+$/);
    expect(app.inLobby).toBe(true);
    expect(app.timeline.playing).toBe(false);
  });

  it("reloads the performance frame for a fresh synchronized run", async () => {
    await setup();
    doc.getElementById("music-source")!.value = "strudel";
    doc.getElementById("play")!.dispatchEvent(new Event("click"));
    const first = (doc.getElementById("strudel-performance") as TestElement).src;
    doc.getElementById("play")!.dispatchEvent(new Event("click"));
    expect((doc.getElementById("strudel-performance") as TestElement).src).not.toBe(first);
  });

  it.each(["cinema", "trance", "legacy"])("launches the selected %s score from the main lobby", async (score) => {
    const { app } = await setup();
    doc.getElementById("music-source")!.value = "strudel";
    doc.getElementById("strudel-score")!.value = score;
    app.togglePlayback();
    const url = new URL(doc.getElementById("strudel-performance")!.src, location.origin);
    expect(url.searchParams.get("score")).toBe(score);
    expect(app.inLobby).toBe(true);
    expect(app.timeline.playing).toBe(false);
  });

  it("shows current performance errors persistently and ignores stale or unrelated messages", async () => {
    await setup();
    doc.getElementById("music-source")!.value = "strudel";
    doc.getElementById("play")!.dispatchEvent(new Event("click"));
    const frame = doc.getElementById("strudel-performance")!;
    const launch = new URL(frame.src, location.origin).searchParams.get("launch");
    const loading = doc.getElementById("notice")!.textContent;
    const message = (origin: string, source: EventTarget, id: string | null) => window.dispatchEvent(Object.assign(new Event("message"), {
      origin, source, data: { type: "devfest-strudel-performance-error", message: "Invalid score syntax", launch: id },
    }));
    message("https://unrelated.example", frame.contentWindow, launch);
    message(location.origin, new EventTarget(), launch);
    message(location.origin, frame.contentWindow, "previous-launch");
    expect(doc.getElementById("notice")!.textContent).toBe(loading);
    message(location.origin, frame.contentWindow, launch);
    expect(doc.getElementById("notice")!.textContent).toContain("Invalid score syntax");
    vi.advanceTimersByTime(10000);
    expect(doc.getElementById("notice")!.hidden).toBe(false);
  });

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
