import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { preview } from "vite";
import { chromium } from "playwright";

const manifest = JSON.parse(await readFile("public/assets/arcade/manifest.json", "utf8"));
for (const media of manifest.media) {
  for (const asset of [media.video, media.poster]) {
    const bytes = await readFile(`public${asset.url}`);
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  }
  assert.equal(media.video.codec, "h264");
  assert.equal(media.video.audioStreams, 0);
}
await mkdir("docs/arcade", { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  const address = server.httpServer.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ channel: "msedge", headless: true,
    args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: "block" });
  const errors = [], external = [], mediaRequests = new Set();
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) {
      external.push(url); return route.abort("blockedbyclient");
    }
    if (url.startsWith(`${origin}/assets/arcade/`)) mediaRequests.add(new URL(url).pathname);
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const began = Date.now();
  await page.goto(origin);
  await page.waitForFunction(() => window.devfest?.ready, null, { timeout: 90000 });
  const readyMs = Date.now() - began;
  const initial = await page.evaluate(() => {
    const app = window.devfest, e = app.world.arcadeEnhancements;
    return {
      size: [app.engine.getRenderWidth(), app.engine.getRenderHeight()],
      renderer: app.engine.getGlInfo().renderer, webgl: app.engine.webGLVersion,
      resources: e.media.resources.length,
      screens: e.screens.map((screen) => ({ cabinet: screen.cabinet, game: screen.media.game,
        offset: screen.media.offset, width: screen.media.video?.videoWidth ?? 320, height: screen.media.videoHeight,
        ready: screen.media.video?.readyState ?? (screen.media.texture?.isReady() ? 2 : 0),
        paused: screen.media.video?.paused ?? true, procedural: !screen.media.video,
        frame: screen.media.frame ?? null, textureReady: screen.media.texture?.isReady() ?? false })),
      pinballs: e.pinballs.map((machine) => ({ cabinet: machine.cabinet, featured: machine.featured })),
      initialRequestsDecoded: e.media.resources.every((media) => !media.video.seeking && media.video.readyState >= 2),
    };
  });
  assert.equal(initial.screens.length, 4);
  assert.equal(initial.pinballs.length, 2);
  assert.equal(initial.resources, 2);
  assert.ok(initial.initialRequestsDecoded);
  assert.ok(initial.screens.every((screen) => screen.paused && screen.textureReady));
  assert.deepEqual(initial.screens.filter((screen) => screen.procedural).map((screen) => [screen.cabinet, screen.game]),
    [[1, "devfest-10"], [4, "toulouse-fps"]]);
  assert.ok(mediaRequests.size >= 2, "The remaining assigned video and poster must load before SYSTEM READY.");
  const miniGameFrames = await page.evaluate(() => {
    const app = window.devfest, e = app.world.arcadeEnhancements;
    const frame = (cabinet) => e.screens.find((screen) => screen.cabinet === cabinet).media.frame;
    const before = [frame(1), frame(4)];
    app.seek(.6); app.world.scene.render();
    return { before, after: [frame(1), frame(4)],
      ready: [1, 4].every((cabinet) => e.screens.find((screen) => screen.cabinet === cabinet).media.texture.isReady()) };
  });
  assert.ok(miniGameFrames.after.every((frame, index) => frame > miniGameFrames.before[index]));
  assert.ok(miniGameFrames.ready);
  await page.addStyleTag({ content: "#pause-overlay{display:none!important}" });
  await page.evaluate(() => { document.querySelector("#fullscreen").checked = false; });
  await page.evaluate(() => { document.querySelector("#play").click(); });
  await page.waitForFunction(() => window.devfest.timeline.playing);
  await page.evaluate(() => {
    const app = window.devfest;
    window.arcadeProbe = { samples: [], seen: new Set(), frames: [] };
    const observer = app.world.scene.onAfterRenderObservable.add(() => {
      const { time, playing } = app.timeline, probe = window.arcadeProbe;
      if (time > 14.3) { app.world.scene.onAfterRenderObservable.remove(observer); return; }
      if (!playing) return;
      probe.frames.push(performance.now());
      for (const target of [5, 7.15, 9.2, 10.1, 11.3, 12.3, 13.4]) {
        if (time < target || probe.seen.has(target)) continue;
        probe.seen.add(target);
        probe.samples.push({ time, state: structuredClone(app.world.arcadeEnhancements.pinballs.map((machine) => machine.state)),
          camera: app.world.camera.position.asArray(),
          video: app.world.arcadeEnhancements.media.resources.map((media) => ({
            time: media.video.currentTime, desired: media.clock.desired, seeking: media.video.seeking,
            paused: media.video.paused, muted: media.video.muted, frames: media.video.getVideoPlaybackQuality().totalVideoFrames,
          })) });
      }
    });
  });
  await page.waitForFunction(() => window.devfest.timeline.time > 14.3, null, { timeout: 25000 });
  await page.evaluate(() => window.devfest.togglePlayback());
  const playback = await page.evaluate(() => ({
    samples: window.arcadeProbe.samples,
    frameIntervals: window.arcadeProbe.frames.slice(1).map((now, index) => now - window.arcadeProbe.frames[index]),
    seeks: window.devfest.world.arcadeEnhancements.media.resources.map((media) => media.clock.seeks),
    music: document.querySelector("#soundtrack-player").currentTime,
  }));
  assert.equal(playback.samples.length, 7);
  assert.ok(playback.samples.every((sample) => sample.video.every((media) => media.muted && !media.paused && media.frames > 0)));
  assert.ok(playback.seeks.every((count) => count < 20), "Normal playback must not seek videos every render frame.");
  assert.ok(playback.samples.find((sample) => sample.time >= 11.3).state[0].balls.every((ball) => ball.lift === 0));
  for (const sample of playback.samples) {
    const replay = await page.evaluate((time) => {
      const app = window.devfest; app.seek(time);
      return { state: app.world.arcadeEnhancements.pinballs.map((machine) => machine.state), camera: app.world.camera.position.asArray() };
    }, sample.time);
    assert.deepEqual(replay.state, sample.state, `Pinball replay must match music playback at ${sample.time}.`);
    assert.deepEqual(replay.camera, sample.camera);
  }
  const settle = async () => {
    await page.waitForFunction(() => window.devfest.world.arcadeEnhancements.media.resources.every((media) => {
      const delta = Math.abs(media.video.currentTime - media.clock.desired), duration = media.video.duration;
      return !media.video.seeking && Math.min(delta, duration - delta) <= .04;
    }));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const captures = [];
  for (const [label, time] of [["01-devfest-10", 9.5], ["02-launch", 4.3], ["03-flipper", 7.15],
    ["04-multiball", 11.3], ["05-ai4fun", 12.3], ["06-background", 18.3], ["07-toulouse-fps", 15.5]]) {
    await page.evaluate((time) => window.devfest.seek(time), time); await settle();
    const path = `docs/arcade/${label}.png`;
    await page.screenshot({ path }); captures.push({ time, path });
  }
  await page.evaluate(() => window.devfest.seek(11.3)); await settle();
  const visibleBalls = await page.evaluate(async () => {
    const app = window.devfest, scene = app.world.scene, engine = app.engine;
    const width = engine.getRenderWidth(), height = engine.getRenderHeight();
    scene.render();
    const baseline = await engine.readPixels(0, 0, width, height), samples = [];
    for (const ball of app.world.arcadeEnhancements.pinballs[0].balls) {
      try {
        ball.setEnabled(false); scene.render();
        const absent = await engine.readPixels(0, 0, width, height);
        let changedPixels = 0, peak = 0;
        for (let at = 0; at < baseline.length; at += 4) {
          const difference = Math.max(...[0, 1, 2].map((channel) => Math.abs(baseline[at + channel] - absent[at + channel])));
          if (difference > 8) changedPixels++;
          peak = Math.max(peak, difference);
        }
        samples.push({ name: ball.name, changedPixels, peak });
      } finally { ball.setEnabled(true); scene.render(); }
    }
    return samples;
  });
  assert.ok(visibleBalls.every((ball) => ball.changedPixels >= 6 && ball.peak >= 32),
    `All three balls must actually contribute visible pixels from the cinematic camera: ${JSON.stringify(visibleBalls)}`);
  const paused = await page.evaluate(() => ({
    time: window.devfest.timeline.time,
    states: window.devfest.world.arcadeEnhancements.pinballs.map((machine) => machine.state),
    video: window.devfest.world.arcadeEnhancements.media.resources.map((media) => media.video.currentTime),
  }));
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => ({
    time: window.devfest.timeline.time,
    states: window.devfest.world.arcadeEnhancements.pinballs.map((machine) => machine.state),
    video: window.devfest.world.arcadeEnhancements.media.resources.map((media) => media.video.currentTime),
  })), paused);
  for (const time of [0, 29.8, 2, 11.3, 180, 0]) {
    await page.evaluate((time) => window.devfest.seek(time), time);
    if (time < 49) await settle();
  }
  await page.evaluate(() => {
    const app = window.devfest;
    app.timeline.speed = .5; app.seek(8); app.togglePlayback();
  });
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => window.devfest.world.arcadeEnhancements.media.resources.every((media) =>
    media.video.playbackRate === .5 && !media.video.paused)));
  await page.evaluate(() => { window.devfest.togglePlayback(); window.devfest.timeline.speed = 1; });

  const performanceResults = [];
  for (const [width, height] of [[1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    for (const enabled of [false, true]) {
      await page.evaluate((enabled) => {
        const app = window.devfest, settings = app.world.arcadeEnhancements.settings;
        settings.enableArcadeVideoScreens = settings.enablePinballAttractMode = enabled;
        app.seek(8); if (!app.timeline.playing) app.togglePlayback();
      }, enabled);
      await page.waitForTimeout(200);
      const frameTimes = await page.evaluate(() => new Promise((resolve) => {
        const scene = window.devfest.world.scene, times = [];
        const observer = scene.onAfterRenderObservable.add(() => {
          times.push(performance.now());
          if (times.length < 121) return;
          scene.onAfterRenderObservable.remove(observer);
          resolve(times.slice(1).map((time, index) => time - times[index]));
        });
      }));
      const sorted = [...frameTimes].sort((a, b) => a - b);
      performanceResults.push({ width, height, enabled, frames: frameTimes.length,
        meanMs: frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length,
        p95Ms: sorted[Math.floor(sorted.length * .95)] });
      await page.evaluate(() => { if (window.devfest.timeline.playing) window.devfest.togglePlayback(); });
    }
  }
  const flagsAndCounts = await page.evaluate(() => {
    const app = window.devfest, e = app.world.arcadeEnhancements, scene = app.world.scene;
    const counts = () => [scene.meshes.length, scene.materials.length, scene.textures.length,
      scene.lights.length, scene.getPhysicsEngine().getBodies().length];
    const before = counts();
    for (let loop = 0; loop < 10; loop++) for (const time of [0, 11.3, 18, 49, 180]) app.seek(time);
    const after = counts();
    e.settings.enableArcadeVideoScreens = false; e.settings.enablePinballAttractMode = false; app.seek(11.3);
    const disabled = e.screens.every((screen) => !screen.mesh.isEnabled()) && e.pinballs.every((machine) => !machine.root.isEnabled())
      && e.media.resources.every((media) => media.video.paused);
    e.settings.enableArcadeVideoScreens = e.settings.enablePinballAttractMode = true;
    e.settings.enablePinballMultiball = false; e.settings.enableArcadeCrtEffect = false; app.seek(11.3);
    const noMultiball = e.pinballs.every((machine) => !machine.state.multiball && machine.state.balls.slice(1).every((ball) => ball.lift < 0));
    e.settings.enablePinballMultiball = e.settings.enableArcadeCrtEffect = true;
    app.seek(12.3);
    return { before, after, disabled, noMultiball, resources: e.media.resources.length };
  });
  assert.deepEqual(flagsAndCounts.before, flagsAndCounts.after);
  assert.ok(flagsAndCounts.disabled && flagsAndCounts.noMultiball);
  const reassignment = await page.evaluate(async () => {
    const app = window.devfest, e = app.world.arcadeEnhancements;
    const counts = () => [e.media.resources.length, app.world.scene.textures.length];
    const before = counts();
    await e.assign(0, "super-mario", 5.1); app.seek(11.3);
    const shared = e.screens.find((screen) => screen.cabinet === 0).media === e.screens.find((screen) => screen.cabinet === 3).media;
    await e.assign(0, "super-mario", 1.3); app.seek(1); await e.whenSettled();
    return { before, after: counts(), shared };
  });
  assert.deepEqual(reassignment.before, reassignment.after);
  assert.ok(reassignment.shared);
  await page.evaluate(() => window.devfest.debug.setVisible(true));
  await page.getByText("ARCADE / GAMES + PINBALL", { exact: true }).click();
  await page.getByLabel("trajectories", { exact: true }).check();
  await page.getByLabel("pivots", { exact: true }).check();
  await page.evaluate(() => window.devfest.debug.setVisible(false));
  assert.ok(await page.evaluate(() => {
    const e = window.devfest.world.arcadeEnhancements;
    return !e.settings.trajectories && !e.settings.pivots && !e.settings.screenBounds;
  }));
  const disposal = await page.evaluate(() => {
    const app = window.devfest, resources = app.world.arcadeEnhancements.media.resources;
    app.ready = false; app.timeline.pause(); app.world.scene.dispose();
    return resources.every((media) => media.video.paused && media.video.getAttribute("src") === null);
  });
  assert.ok(disposal);
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  await writeFile("docs/arcade-validation.json", `${JSON.stringify({
    checkedAt: new Date().toISOString(), browser: browser.version(), readyMs, initial,
    media: manifest.media.map((media) => ({ id: media.id, video: media.video, poster: media.poster })),
    playback, flagsAndCounts, visibleBalls, reassignment, disposal, performance: performanceResults, captures, external, errors,
    caveats: ["Headless measurements on this machine are rehearsal evidence, not a guarantee for the event GPU.",
      "HTML video seeks are approximate; ball/flipper/score animation is deterministic at arbitrary master timestamps."],
  }, null, 2)}\n`);
  console.log(JSON.stringify({ readyMs, resources: initial.resources, captures, flagsAndCounts, performance: performanceResults,
    visibleBalls, reassignment, disposal, externalRequests: external.length, errors }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
