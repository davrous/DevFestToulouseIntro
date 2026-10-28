import assert from "node:assert/strict";
import { access, open, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preview } from "vite";
import { chromium } from "playwright";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const versions = {};
for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
  assert.equal(version, lock.packages[`node_modules/${name}`]?.version, `Pin ${name} to the exact tested lockfile version.`);
  versions[name] = version;
}

const models = { count: 0, extensions: {}, externalResources: [], relativeResources: 0 };
const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));
async function auditModels(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { await auditModels(path); continue; }
    if (!entry.name.endsWith(".glb")) continue;
    const handle = await open(path, "r");
    try {
      const header = Buffer.alloc(20); await handle.read(header, 0, 20, 0);
      assert.equal(header.toString("ascii", 0, 4), "glTF");
      assert.equal(header.readUInt32LE(4), 2);
      assert.equal(header.readUInt32LE(16), 0x4e4f534a);
      const json = Buffer.alloc(header.readUInt32LE(12));
      await handle.read(json, 0, json.length, 20);
      const model = JSON.parse(json.toString("utf8")); models.count++;
      for (const extension of model.extensionsUsed ?? []) models.extensions[extension] = (models.extensions[extension] ?? 0) + 1;
      for (const resource of [...(model.buffers ?? []), ...(model.images ?? [])]) {
        if (!resource.uri || resource.uri.startsWith("data:")) continue;
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(resource.uri)) {
          models.externalResources.push({ path, uri: resource.uri });
        } else {
          const local = resolve(dirname(path), decodeURIComponent(resource.uri)), withinPublic = relative(publicRoot, local);
          assert.ok(!isAbsolute(withinPublic) && !/^\.\.(?:[/\\]|$)/.test(withinPublic), "Model resources must be shipped inside public/.");
          await access(local); models.relativeResources++;
        }
      }
    } finally { await handle.close(); }
  }
}
await auditModels(fileURLToPath(new URL("../public/assets/", import.meta.url)));
assert.deepEqual(models.externalResources, [], "GLB resources must be embedded or present locally.");
for (const extension of ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu"]) {
  assert.equal(models.extensions[extension] ?? 0, 0, `${extension} requires a verified local decoder before adding this asset.`);
}

const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  const address = server.httpServer.address(); assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ channel: "msedge", headless: true,
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
  const externalRequests = [], failures = [], errors = [], mediaCancellations = [], sockets = [];
  const requests = new Set(), worklets = [], scoreResults = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) {
      externalRequests.push(url); return route.abort("blockedbyclient");
    }
    if (/^https?:/.test(url)) requests.add(new URL(url).pathname);
    return route.continue();
  });
  await context.addInitScript(() => {
    window.offlineWorklets = [];
    if (typeof Worklet === "undefined") return;
    const add = Worklet.prototype.addModule;
    Worklet.prototype.addModule = function (url, ...args) {
      const resolved = new URL(String(url), location.href);
      window.offlineWorklets.push({ protocol: resolved.protocol, origin: resolved.origin,
        path: /^https?:/.test(resolved.protocol) ? resolved.pathname : "(generated local code)" });
      return Reflect.apply(add, this, [url, ...args]);
    };
  });
  const watch = (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text().slice(0, 600)); });
    page.on("requestfailed", (request) => {
      const failure = { path: request.url(), error: request.failure()?.errorText };
      if (request.resourceType() === "media" && failure.error === "net::ERR_ABORTED"
        && request.url().startsWith(`${origin}/assets/music/`)) mediaCancellations.push(failure);
      else failures.push(failure);
    });
    page.on("websocket", (socket) => sockets.push(socket.url()));
  };
  const show = await context.newPage(); watch(show);
  const began = Date.now();
  await show.goto(origin);
  await show.waitForFunction(() => window.devfest?.ready, null, { timeout: 90000 });
  const readyMs = Date.now() - began;
  assert.equal(await show.locator("#soundtrack").inputValue(), "violas-journey");
  await show.locator("#fullscreen").uncheck(); await show.locator("#play").click();
  await show.waitForFunction(() => document.querySelector("#soundtrack-player").currentTime > .5);
  const mp3 = await show.evaluate(() => {
    const app = window.devfest, media = document.querySelector("#soundtrack-player");
    app.togglePlayback();
    return { currentTime: media.currentTime, duration: media.duration,
      source: new URL(media.currentSrc).pathname, audioContext: app.showController.soundtrack.context.state };
  });
  assert.equal(mp3.audioContext, "running");
  await show.evaluate(() => window.devfest.returnToLobby());
  await show.locator("#soundtrack").selectOption("violas-journey-wav");
  await show.locator("#play").click();
  await show.waitForFunction(() => document.querySelector("#soundtrack-player").currentTime > .5);
  const wav = await show.evaluate(() => {
    const app = window.devfest, media = document.querySelector("#soundtrack-player");
    app.togglePlayback();
    return { currentTime: media.currentTime, duration: media.duration,
      source: new URL(media.currentSrc).pathname, audioContext: app.showController.soundtrack.context.state,
      effectTime: app.showController.effectTime(50.876) };
  });
  assert.equal(wav.audioContext, "running");
  assert.equal(wav.source, "/assets/music/violas-journey.wav");
  assert.equal(wav.effectTime, 51.03);
  assert.ok(Math.abs(wav.duration - mp3.duration) < .02);
  const sceneChecks = await show.evaluate(() => {
    const app = window.devfest;
    return [0, 5.925, 18.2, 28.5, 38.6, 44.5, 59.2, 80.45, 93.5, 94.2, 111, 125.8, 142, 151, 173, 180]
      .map((time) => { app.seek(time); app.world.scene.render(); return { time, ready: app.ready }; });
  });
  assert.ok(sceneChecks.every((sample) => sample.ready));

  const viewer = await context.newPage(); watch(viewer);
  await viewer.goto(`${origin}/?asset-viewer=simready`);
  await viewer.waitForFunction(() => window.simreadyViewer?.ready, null, { timeout: 90000 });
  await viewer.locator('[aria-label="SimReady asset"]').selectOption("all");
  const assets = await viewer.evaluate(() => ({
    reports: window.simreadyViewer.assets.reports.size, errors: [...window.simreadyViewer.assets.errors.values()],
  }));
  assert.equal(assets.reports, 9); assert.deepEqual(assets.errors, []);
  await viewer.close();

  const music = await context.newPage(); watch(music);
  await music.goto(`${origin}/strudel/`);
  await music.waitForFunction(() => window.strudelAV
    && !document.querySelector("#evaluate").disabled && window.strudelAV.transport.getStatus() === "CONNECTED");
  for (const score of ["arcade", "cinema", "trance", "legacy"]) {
    await music.locator("#score-choice").selectOption(score);
    music.once("dialog", (dialog) => dialog.accept());
    await music.locator("#load-keynote").click();
    const previous = await music.evaluate(() => window.strudelAV.helpers.sent);
    await music.locator("#evaluate").click();
    await music.waitForFunction((previous) => window.strudelAV.editor.repl.scheduler.started
      && window.strudelAV.helpers.sent > previous, previous, { timeout: 30000 });
    await music.waitForTimeout(500);
    const result = await music.evaluate(() => ({
      started: window.strudelAV.editor.repl.scheduler.started,
      events: window.strudelAV.helpers.sent, error: document.querySelector("#performance-status").dataset.error,
    }));
    assert.equal(result.error, "false"); scoreResults.push({ score, ...result });
    await music.locator("#stop").click();
    await music.waitForFunction(() => !window.strudelAV.editor.repl.scheduler.started);
  }
  worklets.push(...await music.evaluate(() => window.offlineWorklets));
  assert.ok(worklets.length > 0, "AudioWorklet initialization must actually be exercised.");
  assert.ok(worklets.every((worklet) => ["data:", "blob:"].includes(worklet.protocol) || worklet.origin === origin));
  const samples = [...requests].filter((path) => path.startsWith("/assets/strudel/") && path.endsWith(".wav"));
  assert.ok(samples.length >= 21, "Exercise the three local drums and eighteen orchestra samples.");
  assert.deepEqual(externalRequests, [], "No third-party origin is allowed, even on a fresh context with an empty cache.");
  assert.deepEqual(sockets, [], "Default playback must not require a remote relay.");
  assert.deepEqual(failures, []); assert.deepEqual(errors, []);
  const report = { testedAt: new Date().toISOString(), browser: "headless Edge", versions, models,
    mode: "Fresh production browser context, service workers blocked, all third-party HTTP(S) denied",
    readyMs, mp3, wav, sceneChecks, viewer: assets, strudel: scoreResults, localSampleCount: samples.length,
    worklets, sameOriginResources: requests.size, externalRequests, websocketRequests: sockets,
    expectedCancelledMediaRanges: mediaCancellations.length, failedRequests: failures, browserErrors: errors };
  await writeFile(new URL("../docs/offline-validation.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
