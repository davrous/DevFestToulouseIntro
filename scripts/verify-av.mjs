import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { chromium } from "playwright";

const origin = new URL(process.env.AV_URL ?? "http://127.0.0.1:4173").origin;
const code = (await readFile(process.argv[2] ? resolve(process.argv[2])
  : new URL("../examples/devfest-av-sync.strudel", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const keynote = process.argv[2] && basename(process.argv[2]) === "devfest-keynote.strudel";
const capture = process.env.AV_CAPTURE === "1";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.AV_BROWSER ?? "msedge",
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
    "--autoplay-policy=no-user-gesture-required"],
});
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const errors = [], external = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) {
      external.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const watch = (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type())) errors.push(message.text().slice(0, 500));
    });
  };
  const show = await context.newPage();
  watch(show);
  await show.goto(`${origin}/`);
  await show.waitForFunction(() => window.devfest?.ready, null, { timeout: 90000 });
  assert.equal(await show.evaluate(() => window.showController.audio.connected), false);
  const music = await context.newPage();
  watch(music);
  if (keynote) {
    await music.addInitScript(() => {
      window.avTapeProbe = [];
      const create = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function (...args) {
        const oscillator = Reflect.apply(create, this, args);
        const ramp = oscillator.detune.linearRampToValueAtTime;
        const set = oscillator.detune.setValueAtTime;
        let begin;
        oscillator.detune.setValueAtTime = function (value, at) {
          begin ??= at;
          return Reflect.apply(set, this, [value, at]);
        };
        oscillator.detune.linearRampToValueAtTime = function (value, at) {
          if (value <= -3500) window.avTapeProbe.push({ begin, at, cents: value,
            frequency: oscillator.frequency.value, type: oscillator.type });
          return Reflect.apply(ramp, this, [value, at]);
        };
        return oscillator;
      };
    });
  }
  if (capture) {
    // Test-only tap of the real final Web Audio mix; no production audio routing changes.
    await music.addInitScript(() => {
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (destination, ...args) {
        const result = Reflect.apply(connect, this, [destination, ...args]);
        if (destination === this.context.destination) {
          const probe = window.avAudioProbe ??= {
            context: this.context, mix: this.context.createGain(),
            destination: this.context.createMediaStreamDestination(), connect, samples: [],
          };
          Reflect.apply(connect, this, [probe.mix]);
          Reflect.apply(connect, probe.mix, [probe.destination]);
        }
        return result;
      };
    });
  }
  await music.goto(`${origin}/strudel/`);
  await music.waitForFunction(() => !!window.strudelAV);
  if (keynote) {
    const draft = await music.evaluate(() => window.strudelAV.editor.code);
    music.once("dialog", (dialog) => dialog.dismiss());
    await music.getByRole("button", { name: "Load keynote / Bb minor / 3:00" }).click();
    assert.equal(await music.evaluate(() => window.strudelAV.editor.code), draft, "Cancel replaced the existing editor code");
    music.once("dialog", (dialog) => dialog.accept());
    await music.getByRole("button", { name: "Load keynote / Bb minor / 3:00" }).click();
    assert.equal(await music.evaluate(() => window.strudelAV.editor.code), code, "Bundled keynote differs from the tested score");
  } else {
    await music.evaluate((source) => window.strudelAV.editor.setCode(source), code);
  }
  await music.getByRole("button", { name: "Evaluate / Ctrl+Enter" }).click();
  await music.waitForFunction(() => window.strudelAV.editor.repl.scheduler.started
    && window.strudelAV.helpers.sent > 0, null, { timeout: 30000 });
  if (capture) {
    await music.evaluate(async () => {
      const probe = window.avAudioProbe;
      const module = new Blob([`
        class AVMeter extends AudioWorkletProcessor {
          peak = 0; sum = 0; count = 0;
          process(inputs) {
            for (const channel of inputs[0] ?? []) {
              for (const value of channel) {
                this.peak = Math.max(this.peak, Math.abs(value));
                this.sum += value * value;
                this.count++;
              }
            }
            if (this.count >= sampleRate / 5) {
              this.port.postMessage({ at: currentTime, peak: this.peak,
                rms: Math.sqrt(this.sum / this.count) });
              this.peak = this.sum = this.count = 0;
            }
            return true;
          }
        }
        registerProcessor("av-meter", AVMeter);
      `], { type: "text/javascript" });
      const url = URL.createObjectURL(module);
      try { await probe.context.audioWorklet.addModule(url); }
      finally { URL.revokeObjectURL(url); }
      const meter = new AudioWorkletNode(probe.context, "av-meter");
      meter.port.onmessage = ({ data }) => {
        if (probe.startedAt !== undefined) probe.samples.push({ ...data, seconds: data.at - probe.startedAt });
      };
      Reflect.apply(probe.connect, probe.mix, [meter]);
      Reflect.apply(probe.connect, meter, [probe.context.destination]);
      probe.startedAt = probe.context.currentTime;
      const peer = window.avPeer = new RTCPeerConnection({ iceServers: [] });
      for (const track of probe.destination.stream.getTracks()) peer.addTrack(track, probe.destination.stream);
      await peer.setLocalDescription(await peer.createOffer());
    });
    await music.waitForFunction(() => window.avPeer.iceGatheringState === "complete");
    const offer = await music.evaluate(() => window.avPeer.localDescription.toJSON());
    await show.evaluate(async (offer) => {
      const peer = window.avPeer = new RTCPeerConnection({ iceServers: [] });
      peer.ontrack = (event) => {
        window.avCaptureReady = (async () => {
          // Chromium needs a media sink to drive the remote WebRTC audio decoder.
          const sink = window.avRelaySink = document.createElement("audio");
          sink.muted = true;
          sink.srcObject = event.streams[0];
          await sink.play();
          await window.showController.audio.connectStream(event.streams[0]);
        })();
      };
      await peer.setRemoteDescription(offer);
      await peer.setLocalDescription(await peer.createAnswer());
    }, offer);
    await show.waitForFunction(() => window.avPeer.iceGatheringState === "complete");
    const answer = await show.evaluate(() => window.avPeer.localDescription.toJSON());
    await music.evaluate((answer) => window.avPeer.setRemoteDescription(answer), answer);
    await show.waitForFunction(() => !!window.avCaptureReady);
    await show.evaluate(() => window.avCaptureReady);
    assert.equal(await show.evaluate(() => window.showController.audio.connected), true);
    await show.bringToFront();
    await music.waitForFunction(() => window.avAudioProbe.samples.some((sample) => sample.rms > .005),
      null, { timeout: 10000 });
    await show.waitForFunction(() => window.showController.audio.sample(performance.now()).energy > .02,
      null, { timeout: 10000 });
    console.log("Local audio relay:", JSON.stringify(await show.evaluate(async () => ({
      state: window.avPeer.connectionState, status: window.showController.audio.status,
      muted: window.avPeer.getReceivers()[0]?.track?.muted,
      received: [...(await window.avPeer.getStats()).values()]
        .filter((stat) => stat.type === "inbound-rtp")
        .map((stat) => ({ packets: stat.packetsReceived, audioEnergy: stat.totalAudioEnergy })),
    }))));
    console.log("Audio preflight passed: real full-mix PCM and received FFT energy.");
    await music.evaluate(() => window.strudelAV.editor.stop());
  }
  if (keynote && !capture) await music.evaluate(() => window.strudelAV.editor.stop());
  await show.bringToFront();
  await show.evaluate((synchronized) => {
    const app = window.devfest;
    const probe = window.avVerification = { events: [], peakBodies: 0, fftFrames: 0,
      fftWindows: { opening: 0, digital: 0, climax: 0 }, fftPeak: 0, done: null, started: performance.now(),
      crt: { first: null, last: null, heldFrames: 0, detachedAtEnd: false } };
    app.showController.musicEvents.subscribe((event) => {
      if (probe.done) return;
      const record = app.showController.musicEvents.records.find((entry) =>
        entry.event.id === event.id && entry.outcome !== "duplicate");
      probe.events.push({ name: event.event, time: app.timeline.time,
        latency: record?.latency, late: record?.lateness, outcome: record?.outcome });
    });
    app.world.scene.onAfterRenderObservable.add(() => {
      if (probe.done) return;
      const energy = app.showController.audio.features.energy;
      if (app.showController.audio.connected && energy > .02) {
        probe.fftFrames++;
        const time = app.timeline.time;
        if (time < 25) probe.fftWindows.opening++;
        if (time >= 96 && time < 128) probe.fftWindows.digital++;
        if (time >= 147 && time < 160) probe.fftWindows.climax++;
      }
      probe.fftPeak = Math.max(probe.fftPeak, energy);
      const transition = app.world.clapTransition;
      if (transition.state.active) {
        probe.crt.first ??= app.timeline.time;
        probe.crt.last = app.timeline.time;
        if (transition.state.signalHeight <= .00401) probe.crt.heldFrames++;
        if (!transition.postProcess.isReady()) throw new Error("CRT shader was not precompiled.");
      }
      probe.peakBodies = Math.max(probe.peakBodies, app.world.scene.meshes
        .filter((mesh) => mesh.name.startsWith("Cinema / popcorn kernel") && mesh.physicsBody).length);
      if (app.timeline.time === 180) {
        probe.crt.detachedAtEnd = !app.world.camera._postProcesses.includes(transition.postProcess);
        probe.done = { elapsed: (performance.now() - probe.started) / 1000,
          camera: app.world.camera.position.asArray(), playing: app.timeline.playing };
      }
    });
    if (!synchronized) app.start(0);
  }, Boolean(keynote));
  if (keynote) {
    if (capture) await music.evaluate(() => {
      window.avAudioProbe.startedAt = window.avAudioProbe.context.currentTime;
      window.avAudioProbe.samples = [];
    });
    await music.getByRole("button", { name: "Start show + music", exact: true }).click();
    await show.waitForFunction(() => window.devfest.timeline.playing);
  } else if (capture) {
    await music.evaluate(() => {
      const probe = window.avAudioProbe;
      probe.startedAt = probe.context.currentTime;
      probe.samples = [];
      return window.strudelAV.editor.evaluate();
    });
  }
  assert.equal(await show.evaluate(() => document.hidden), false);
  await show.waitForFunction(() => window.showController.strudelEvents.getStatus() === "CONNECTED");
  await context.setOffline(true);
  console.log("Both production tabs running; network disabled after local audio preload.");
  await show.waitForTimeout(20000);
  const session = await music.evaluate(() => window.strudelAV.transport.playbackSession);
  await music.evaluate(() => window.strudelAV.editor.evaluate());
  assert.equal(await music.evaluate(() => window.strudelAV.transport.playbackSession), session);
  await show.waitForFunction(() => window.avVerification.done, null, { timeout: 180000 });
  const result = await show.evaluate(() => {
    const probe = window.avVerification;
    const quantile = (key, fraction) => probe.events.map((event) => event[key])
      .sort((a, b) => a - b)[Math.floor(probe.events.length * fraction)];
    return { ...probe.done, crt: probe.crt, eventCount: probe.events.length, peakBodies: probe.peakBodies,
      finalBodies: window.devfest.world.scene.meshes
        .filter((mesh) => mesh.name.startsWith("Cinema / popcorn kernel") && mesh.physicsBody).length,
      transportMedianMs: quantile("latency", .5), transportP95Ms: quantile("latency", .95),
      dispatchP95Ms: quantile("late", .95), fftFrames: probe.fftFrames,
      fftWindows: probe.fftWindows, fftPeak: probe.fftPeak,
      cues: probe.events.filter((event) => !["kick", "snare", "hat", "impact"].includes(event.name)) };
  });
  assert.equal(result.playing, false);
  assert.ok(Math.abs(result.elapsed - 180) < 1, `Unexpected duration: ${result.elapsed}`);
  assert.deepEqual(result.camera, [0, 1110, -755]);
  assert.ok(result.eventCount > 500, `Too few genuine scheduled events: ${result.eventCount}`);
  assert.equal(result.peakBodies, 72);
  assert.equal(result.finalBodies, 0);
  assert.ok(Math.abs(result.crt.first - 50.65) < .1, "CRT started late");
  assert.ok(Math.abs(result.crt.last - 52.18) < .1, "CRT ended late");
  assert.ok(result.crt.heldFrames >= 3, "No visible phosphor-line hold");
  assert.equal(result.crt.detachedAtEnd, true);
  if (keynote) {
    result.tapeStop = await music.evaluate(() => window.avTapeProbe);
    assert.ok(result.tapeStop.some((ramp) => ramp.type === "sawtooth" && ramp.cents === -3600
      && Math.abs(ramp.at - ramp.begin - .475) < .001), "Missing real descending Web Audio pitch ramp");
    const cut = result.cues.find((event) => event.name === "cinema-cut");
    assert.ok(Math.abs(cut.time - 51.03) < .1, "Synchronized cinema cue drifted");
  }
  for (const cue of ["cinema-cut", "popcorn", "warp", "reveal"]) {
    assert.ok(result.cues.some((event) => event.name === cue && event.outcome === "applied"), `${cue} was not accented`);
  }
  if (capture) {
    await music.waitForTimeout(500);
    result.audio = await music.evaluate(() => {
      const samples = window.avAudioProbe.samples;
      const rms = (from, to) => {
        const section = samples.filter((sample) => sample.seconds >= from && sample.seconds < to);
        return Math.sqrt(section.reduce((sum, sample) => sum + sample.rms ** 2, 0) / section.length);
      };
      return { peak: Math.max(...samples.map((sample) => sample.peak)), samples: samples.length,
        openingRms: rms(2, 25), climaxRms: rms(148, 159), finalRms: rms(179.8, 180.4) };
    });
    console.log(JSON.stringify({ phase: "audio measurements", fftFrames: result.fftFrames,
      fftWindows: result.fftWindows, fftPeak: result.fftPeak, ...result.audio }));
    assert.ok(result.fftFrames > 500, `FFT did not follow real Strudel audio: ${result.fftFrames} frames`);
    for (const [section, frames] of Object.entries(result.fftWindows)) {
      assert.ok(frames > 50, `FFT absent during ${section}: ${frames} active frames`);
    }
    assert.ok(result.audio.samples > 1000, "Missing continuous full-mix audio measurements");
    assert.ok(result.audio.peak < .95, `Insufficient headroom: peak ${result.audio.peak}`);
    assert.ok(result.audio.openingRms > .005, `Opening is inaudible: RMS ${result.audio.openingRms}`);
    assert.ok(result.audio.climaxRms > result.audio.openingRms * 1.4, "No measured musical crescendo");
    assert.ok(result.audio.finalRms < .0001, `Music did not finish at 180s: RMS ${result.audio.finalRms}`);
  }
  await music.close();
  await show.waitForFunction(() => window.showController.strudelEvents.getStatus() === "DISCONNECTED");
  assert.equal(await show.evaluate(() => window.devfest.timeline.time), 180);
  await context.setOffline(false);
  const reopened = await context.newPage();
  watch(reopened);
  await reopened.goto(`${origin}/strudel/`);
  await reopened.waitForFunction(() => window.strudelAV?.transport.getStatus() === "CONNECTED");
  assert.equal(await show.evaluate(() => window.showController.strudelEvents.getStatus()), "CONNECTED");
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...result, externalRequests: external.length, browserErrors: errors.length,
    reevaluation: "same session", reconnect: "passed",
    offline: "browser networking disabled" }, null, 2));
} finally {
  await browser.close();
}
