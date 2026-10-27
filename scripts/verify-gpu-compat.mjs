import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";

const external = process.env.GPU_CHECK_URL;
const server = external ? null : await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  const address = server?.httpServer.address();
  assert.ok(external || (address && typeof address === "object"));
  const origin = external ?? `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const results = [];
  for (const enabled of [false, true]) {
    const page = await browser.newPage(enabled ? {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
    } : {});
    const errors = [];
    let rejectFailure;
    const failure = new Promise((_, reject) => { rejectFailure = reject; });
    page.on("pageerror", (error) => { errors.push(error.message); rejectFailure(error); });
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text().slice(0, 800);
      errors.push(text); rejectFailure(new Error(text));
    });
    const began = Date.now();
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await Promise.race([page.waitForFunction(() => window.devfest?.ready, null, { timeout: 120000 }), failure]);
    const readyMs = Date.now() - began;
    const result = await Promise.race([page.evaluate(async (enabled) => {
      const app = window.devfest, world = app.world, actor = world.cinema.terminator;
      const original = actor.root.getChildMeshes().find((mesh) => mesh.getTotalVertices() > 0).material;
      const Plugin = actor.destruction[0].constructor, Vector = world.camera.position.constructor;
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 96;
      const engine = new app.engine.constructor(canvas, false,
        { preserveDrawingBuffer: true, stencil: false, audioEngine: false });
      engine.disableUniformBuffers = !enabled;
      const scene = new world.scene.constructor(engine);
      scene.clearColor.set(0, 0, 0, 1);
      try {
        const camera = new world.camera.constructor("GPU compatibility camera", new Vector(0, 0, -3), scene);
        camera.setTarget(Vector.Zero());
        const Mesh = world.scene.getMeshByName("Arcade / legacy voxel 0").constructor;
        const mesh = new Mesh("GPU compatibility triangle", scene);
        mesh.setVerticesData("position", [-1, -1, 0, 1, -1, 0, 0, 1, 0]);
        mesh.setVerticesData("normal", [0, 0, -1, 0, 0, -1, 0, 0, -1]); mesh.setIndices([0, 1, 2]);
        const material = new original.constructor("GPU compatibility PBR", scene);
        material.unlit = true; material.emissiveColor.set(1, 1, 1);
        const plugin = new Plugin(material); mesh.material = material;
        await material.forceCompilationAsync(mesh);
        await scene.whenReadyAsync(true);
        const samples = [];
        for (const damage of [0, .5, 1, 0]) {
          plugin.damage = damage; scene.render();
          const pixels = await engine.readPixels(0, 0, 96, 96);
          let visible = 0;
          for (let at = 0; at < pixels.length; at += 4) {
            if (pixels[at] > 150 && pixels[at + 1] > 150 && pixels[at + 2] > 150) visible++;
          }
          samples.push({ damage, visible });
        }
        const scenes = [125.8, 127.2, 0].map((time) => {
          app.seek(time); if (app.timeline.playing) app.togglePlayback();
          world.scene.render();
          return { time, model: actor.root.isEnabled(), petals: actor.debris.isEnabled(),
            damage: actor.destruction.map((effect) => effect.damage) };
        });
        return { fullIntroReady: app.ready, fullIntroUBO: app.engine.supportsUniformBuffers,
          webgl: engine.webGLVersion, probeUBO: engine.supportsUniformBuffers,
          materialUBO: material._uniformBuffer.useUbo, samples, scenes,
          renderer: app.engine.getGlInfo().renderer,
          shaderErrors: Object.values(engine._compiledEffects).map((effect) => effect.getCompilationError()).filter(Boolean) };
      } finally { scene.dispose(); engine.dispose(); }
    }, enabled), failure]);
    assert.equal(result.fullIntroReady, true); assert.equal(result.fullIntroUBO, enabled);
    assert.equal(result.probeUBO, enabled); assert.equal(result.materialUBO, enabled);
    assert.deepEqual(result.shaderErrors, []); assert.deepEqual(errors, []);
    assert.ok(result.samples[0].visible > 300);
    assert.ok(result.samples[1].visible > result.samples[0].visible * .2
      && result.samples[1].visible < result.samples[0].visible * .8);
    assert.equal(result.samples[2].visible, 0); assert.equal(result.samples[3].visible, result.samples[0].visible);
    assert.equal(result.scenes[0].model, true);
    assert.equal(result.scenes[1].model, false); assert.equal(result.scenes[1].petals, true);
    assert.ok(result.scenes[1].damage.every((damage) => damage === 1));
    results.push({ ...result, readyMs });
    await page.close();
  }
  assert.deepEqual(results[0].samples, results[1].samples, "UBO and non-UBO must render identical destruction and rewind.");
  const report = { browser: "headless Edge", actualPlatform: process.platform, url: external ?? "local production preview",
    note: "The Windows user-agent enables Babylon's UBO policy on the current host; this is not a physical RTX 5090 test.",
    results };
  await writeFile(new URL("../docs/gpu-compat-validation.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
