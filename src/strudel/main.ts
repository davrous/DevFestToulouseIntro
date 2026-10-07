import { StrudelMirror } from "@strudel/codemirror";
import * as core from "@strudel/core";
import * as mini from "@strudel/mini";
import * as tonal from "@strudel/tonal";
import * as audio from "@strudel/webaudio";
import { transpiler } from "@strudel/transpiler";
import demo from "../../examples/devfest-av-sync.strudel?raw";
import keynote from "../../examples/devfest-keynote.strudel?raw";
import guide from "../../STRUDEL_SYNC.md?url";
import { StrudelEventTransport } from "../engine/StrudelEventTransport";
import { audioTimeToEpoch, createVisualHelpers, withSynchronizedStart } from "./helpers";
import { CINEMA, CLAP_CRT } from "../content/showBeats";
import { SPEAKERS } from "../content/speakers";
import "./style.css";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing Strudel UI: ${id}`);
  return found as T;
}

const status = element("performance-status");
const sync = element("sync-status");
const evaluate = element<HTMLButtonElement>("evaluate");
const startTogether = element<HTMLButtonElement>("start-together");
element<HTMLAnchorElement>("sync-guide").href = guide;
const report = (message: string) => { status.textContent = message.slice(0, 400); status.dataset.error = "true"; };
const transport = new StrudelEventTransport("strudel", () => {}, report);
const helpers = createVisualHelpers(transport, audio.getAudioContext);
const sampleBase = new URL("../assets/strudel/", location.href);
let audioReady = false;
let initialized = false;
let synchronized = false;
let evaluating = false;
let playing = false;

function updateStartButton(): void {
  startTogether.disabled = !initialized || evaluating || playing || transport.getStatus() !== "CONNECTED";
}

const ready = (async () => {
  mini.miniAllStrings();
  audio.registerSynthSounds();
  await audio.samples({ bd: ["bd.wav"], sd: ["sd.wav"], hh: ["hh.wav"] }, sampleBase.href);
  await core.evalScope(core, mini, tonal, audio, {
    visual: helpers.visual, cue: helpers.cue, cueAt: helpers.cueAt, audioAndVisual: helpers.audioAndVisual,
    clapTiming: CLAP_CRT, cinemaTiming: CINEMA,
    speakerTimings: SPEAKERS.map((speaker) => speaker.startTime),
  });
})();

function savedCode(): string {
  try { return localStorage.getItem("devfest-strudel-code-v1") ?? demo; }
  catch (error) { console.warn("Strudel draft storage unavailable", error); report("Draft storage unavailable; export your code before closing."); return demo; }
}

const editor = new StrudelMirror({
  root: element("editor"),
  initialCode: savedCode(),
  prebake: () => ready,
  getTime: () => audio.getAudioContext().currentTime,
  defaultOutput: audio.webaudioOutput,
  transpiler,
  editPattern: (pattern) => synchronized ? withSynchronizedStart(pattern, async (targetTime) => {
    try {
      await transport.requestShowStart(audioTimeToEpoch(targetTime, audio.getAudioContext()));
      status.textContent = "PLAYING / show synchronized / Switch to the Babylon tab";
    }
    catch (error) {
      console.error("Synchronized launch failed", error);
      await editor.stop();
      report(`Synchronized launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }) : pattern,
  beforeStart: async () => {
    if (!audioReady) {
      await audio.initAudio();
      await audio.loadWorklets();
      await Promise.all(["bd", "sd", "hh"].map((sound) =>
        audio.loadBuffer(new URL(`${sound}.wav`, sampleBase).href, audio.getAudioContext(), sound)));
      audioReady = true;
    }
    await audio.getAudioContext().resume();
    // Cyclist emits its first hap before onToggle; establish the session first.
    transport.setPlayback(true);
  },
  onToggle: (playing) => transport.setPlayback(playing),
  onUpdateState: (state) => {
    evaluating = state.pending;
    playing = state.started;
    updateStartButton();
    status.dataset.error = String(!!state.error);
    status.textContent = state.error ? `Strudel: ${state.error.message.slice(0, 350)}`
      : state.pending ? "Evaluating..." : state.started ? "PLAYING / scheduler events + local audio" : "STOPPED / audio starts on Evaluate";
  },
  afterEval: ({ code }) => {
    synchronized = false;
    try { localStorage.setItem("devfest-strudel-code-v1", code); }
    catch (error) { console.warn("Strudel draft could not be saved", error); report("Draft not saved; export your code before closing."); }
  },
});

async function run(): Promise<void> {
  try { await editor.evaluate(); }
  catch (error) { console.error("Strudel evaluation failed", error); report(String(error)); }
}

evaluate.addEventListener("click", () => void run());
startTogether.addEventListener("click", () => {
  if (editor.repl.scheduler.started || transport.getStatus() !== "CONNECTED") {
    report("Stop Strudel and open the ready Babylon show before synchronized playback.");
    return;
  }
  synchronized = true;
  void run().finally(() => { synchronized = false; });
});
element("stop").addEventListener("click", () => void editor.stop());
function loadScore(source: string): void {
  if (editor.repl.scheduler.started) { report("Stop playback before loading a score. Your current code was not changed."); return; }
  if (editor.code !== source && !window.confirm("Replace the editor's current code? Copy/export your work first. The saved draft changes only after Evaluate.")) return;
  editor.setCode(source);
}
element("load-demo").addEventListener("click", () => loadScore(demo));
element("load-keynote").addEventListener("click", () => loadScore(keynote));
const health = setInterval(() => {
  const connected = transport.getStatus() === "CONNECTED";
  sync.textContent = `BABYLON SYNC / ${transport.getStatus()}`;
  sync.dataset.connected = String(connected);
  updateStartButton();
  // The scheduler briefly reports negative cycles during its cycle-zero audio preroll.
  if (editor.repl.scheduler.started) transport.setTiming(Math.max(0, editor.repl.scheduler.now()), editor.repl.scheduler.cps);
}, 1000);
window.addEventListener("pagehide", () => { transport.disconnect(); clearInterval(health); void editor.stop(); });

declare global {
  interface Window {
    strudelAV: { editor: StrudelMirror; transport: StrudelEventTransport; helpers: typeof helpers };
  }
}
window.strudelAV = { editor, transport, helpers };
void ready.then(() => {
  transport.connect();
  initialized = true;
  updateStartButton();
  evaluate.disabled = false;
  status.textContent = "READY / local demo samples / Evaluate to start";
}).catch((error: unknown) => {
  console.error("Local Strudel initialization failed", error);
  report(`Unable to initialize local Strudel: ${String(error)}`);
});
