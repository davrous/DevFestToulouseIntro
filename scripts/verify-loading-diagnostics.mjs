import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";

const external = process.env.DIAGNOSTIC_CHECK_URL;
const server = external ? null : await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  const origin = external ? new URL(external).origin : `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [], requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(`${origin}/?diagnostic=report`);
  await page.waitForSelector("h1");
  assert.equal(await page.locator("canvas").count(), 0);
  assert.equal(await page.evaluate(() => !!window.devfest), false);
  assert.ok(!requests.some((url) => /\.(glb|mp4|wasm)(\?|$)|\/assets\/App-/.test(url)),
    "The report must not load the 3D application, models, videos or physics.");
  const reportRequests = requests.map((url) => new URL(url).pathname);
  const results = [];
  for (const profile of ["baseline", "no-video", "render-lite", "no-cinema", "no-simready", "no-warmup", "minimal"]) {
    requests.length = 0;
    const began = Date.now();
    await page.goto(`${origin}/?diagnostic=${profile}`);
    await page.waitForFunction(() => window.devfest?.ready, null, { timeout: 120000 });
    const state = await page.evaluate(() => {
      const app = window.devfest, world = app.world;
      const runs = JSON.parse(localStorage.getItem("devfest.loading-diagnostics.v1")).runs;
      return { profiles: runs.map((run) => run.profile), stages: runs[0].stages.map((stage) => stage.name),
        videos: world.arcadeEnhancements.media.resources.length, screens: world.arcadeEnhancements.screens.length,
        pinballs: world.arcadeEnhancements.pinballs.length,
        nvidia: world.simready.groups.size, width: app.engine.getRenderWidth(), height: app.engine.getRenderHeight(),
        samples: world.pipeline.samples, maxSamples: app.engine.getCaps().maxMSAASamples,
        bloom: world.pipeline.bloomEnabled, glow: world.glow.isEnabled,
        imageProcessing: world.pipeline.imageProcessingEnabled };
    });
    state.readyMs = Date.now() - began;
    assert.equal(state.profiles[0], profile);
    assert.ok(state.stages.includes("ready") && state.stages.includes("physics:wasm:done")
      && state.stages.includes("assets:cassoulet-poster:done"));
    if (profile === "no-video" || profile === "minimal") {
      assert.equal(state.videos, 0); assert.equal(state.screens, 0); assert.equal(state.pinballs, 2);
      assert.ok(!requests.some((url) => /\/assets\/arcade\/.*\.(mp4|png)/.test(url)));
    } else { assert.equal(state.videos, 2); assert.equal(state.screens, 4); }
    if (profile === "no-cinema" || profile === "minimal") {
      assert.ok(!requests.some((url) => url.includes("/assets/cinema/")));
    }
    if (profile === "no-simready" || profile === "minimal") {
      assert.equal(state.nvidia, 0);
      assert.ok(!requests.some((url) => url.includes("/assets/simready/")));
    }
    if (profile === "render-lite" || profile === "minimal") {
      assert.equal(state.samples, 1); assert.equal(state.bloom, false); assert.equal(state.glow, false);
      assert.equal(state.imageProcessing, false); assert.ok(state.width <= 1280 && state.height <= 720);
    }
    if (profile === "no-warmup" || profile === "minimal") assert.ok(state.stages.includes("render:warmup:skipped"));
    else assert.ok(state.stages.includes("render:warmup:done"));
    results.push({ profile, ...state });
  }
  await page.goto(`${origin}/?diagnostic=report`);
  await page.waitForSelector("h1");
  const exportedText = await page.locator("pre").textContent();
  const persisted = await page.evaluate(() => localStorage.getItem("devfest.loading-diagnostics.v1"));
  const stored = JSON.parse(exportedText);
  assert.equal(stored.runs.length, 7);
  assert.equal(stored.runs[0].profile, "minimal");
  assert.ok(stored.runs.every((run) => run.stages.some((stage) => stage.name === "ready")));
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter les traces JSON" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "devfest-iphone-diagnostic.json");
  await page.goto(origin);
  await page.waitForFunction(() => window.devfest?.ready, null, { timeout: 120000 });
  const normal = await page.evaluate(() => {
    const app = window.devfest;
    return { journal: localStorage.getItem("devfest.loading-diagnostics.v1"),
      videos: app.world.arcadeEnhancements.media.resources.length,
      screens: app.world.arcadeEnhancements.screens.length,
      samples: app.world.pipeline.samples, expectedSamples: Math.max(1, Math.min(4, app.engine.getCaps().maxMSAASamples)),
      bloom: app.world.pipeline.bloomEnabled, glow: app.world.glow.isEnabled };
  });
  assert.equal(normal.journal, persisted);
  assert.equal(normal.videos, 2); assert.equal(normal.screens, 4); assert.equal(normal.samples, normal.expectedSamples);
  assert.ok(normal.bloom && normal.glow);
  assert.deepEqual(errors, []);
  const { journal, ...normalSettings } = normal;
  const report = { testedAt: new Date().toISOString(), host: process.platform, browser: browser.version(),
    note: "Desktop profile/control verification, not a physical iPhone crash reproduction.",
    url: external ?? "local production preview", reportRequests, results,
    normal: normalSettings, journalUnchanged: journal === persisted, errors };
  await writeFile("docs/loading-diagnostics-validation.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ profiles: results.map(({ profile, readyMs }) => ({ profile, readyMs })),
    reportLoads3D: false, exportedRuns: stored.runs.length, normalUnchanged: true, errors }, null, 2));
} finally {
  await browser?.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
