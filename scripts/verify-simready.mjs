import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({ preview: { host: "127.0.0.1", port: 0, strictPort: false, open: false } });
let browser;
try {
  const address = server.httpServer.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({
    channel: process.env.SIMREADY_BROWSER ?? "msedge", headless: true,
    args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [], external = [], assetRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /Setting visibility on an instanced mesh has no effect/.test(message.text())) {
      errors.push(message.text());
    }
  });
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) external.push(url);
    if (url.includes("/assets/simready/")) assetRequests.push(url);
  });
  const began = Date.now();
  await page.goto(origin);
  await page.waitForFunction(() => window.devfest?.ready, null, { timeout: 120000 });
  const readyMs = Date.now() - began;
  assert.equal(await page.locator("#music-source").inputValue(), "mp3");
  assert.equal(await page.locator("#soundtrack").inputValue(), "violas-journey");
  const loaded = await page.evaluate(() => ({
    groups: [...window.devfest.world.simready.groups.keys()],
    errors: window.devfest.world.simready.errors,
    removed: window.devfest.world.scene.meshes.filter((mesh) => /SimReady \/ (donut|smallRobot|forklift)/.test(mesh.name)).length,
  }));
  assert.deepEqual(loaded.groups, ["pong", "pastry", "cassoulet", "launchArm", "vending"]);
  assert.deepEqual(loaded.errors, []);
  assert.equal(loaded.removed, 0);
  await page.locator("#fullscreen").uncheck();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.showController.soundtrackId === "violas-journey"
    && document.querySelector("#soundtrack-player").currentTime > .25);
  let fullShow;
  if (process.env.SIMREADY_FULL_SHOW === "1") {
    const playbackStarted = Date.now();
    await page.waitForFunction(() => window.devfest.timeline.time >= 180, null, { timeout: 210000 });
    fullShow = await page.evaluate(() => ({
      time: window.devfest.timeline.time, playing: window.devfest.timeline.playing,
      camera: window.devfest.world.camera.position.asArray(),
      activeGags: [...window.devfest.world.simready.groups.values()].filter((gag) => gag.root.isEnabled()).length,
    }));
    fullShow.wallMs = Date.now() - playbackStarted;
    assert.equal(fullShow.time, 180);
    assert.equal(fullShow.playing, false);
    assert.equal(fullShow.activeGags, 0);
    console.log("Full three-minute show:", fullShow);
  } else {
    await page.evaluate(() => window.devfest.togglePlayback());
  }

  const replay = await page.evaluate(async () => {
    const app = window.devfest;
    const counts = () => [app.world.scene.meshes.length, app.world.scene.transformNodes.length,
      app.world.scene.materials.length, app.world.scene.lights.length];
    const before = counts();
    const artDirection = [];
    for (const time of [3.5, 4.299, 4.5, 5.525, 5.925, 6.1, 15, 17.25, 17.5, 18, 19.1, 26.999, 27, 28.999, 29,
      61.8, 76.8, 78.5, 84.5, 86.3, 86.5, 90, 96.2, 97, 97.8, 108, 110.699, 111,
      117.2, 118, 118.4, 120, 124.399, 124.4, 125.8, 128, 130, 137, 139.499]) {
      app.seek(time);
      const http = app.world.scene.getTransformNodeByName("Toulouse HTTP redirect");
      const arm = app.world.simready.groups.get("launchArm");
      const cassoulet = app.world.simready.groups.get("cassoulet");
      const lens = app.world.scene.getMeshByName("Cinema / frontal camera lens rim");
      const bufferLabel = app.world.scene.getMeshByName("Digital / BUFFER OVERFLOW");
      const matrix = app.world.scene.getMeshByName("FX/Matrix / snack wall code rain");
      const matrixLeft = app.world.scene.getMeshByName("FX/Matrix / snack wall code rain left");
      const astronaut = app.world.scene.getTransformNodeByName("Digital / astronaut after buffer");
      const arch = app.world.scene.getTransformNodeByName("Digital / astronaut rising arch");
      const terminal = app.world.easterEggs.npmTerminal;
      artDirection.push({
        time, entryShader: app.world.camera._postProcesses.some((pass) => pass?.name === "Arcade / retro gaming entry"),
        httpPresent: http.isEnabled(), httpYaw: http.rotation.y,
        request: app.world.scene.getMeshByName("Chocolatine compiler stage 0").isEnabled(),
        armPresent: arm.root.isEnabled(),
        armOpaque: arm.nodes[0].getChildMeshes().every((mesh) => mesh.isEnabled() && mesh.visibility === 1),
        cassoulet: cassoulet.root.isEnabled(), lensDistance: lens.position.subtract(app.world.camera.position).length(),
        canCount: cassoulet.nodes.filter((node) => node.isEnabled()).length,
        pileHeight: Math.max(...cassoulet.nodes.filter((node) => node.isEnabled()).map((node) => node.position.y), 0),
        bufferLabel: bufferLabel.visibility,
        waterSpilling: app.world.scene.getMeshByName("FX/Buffer / water spills over the lip").isEnabled(),
        bufferYaw: app.world.scene.getTransformNodeByName("Digital / overflowing ring buffer").rotation.y,
        violinOpacity: app.world.scene.getMaterialByName("Arcade / voxel tint 0").alpha,
        anneFloreOpacity: app.world.scene.getMeshByName("Speaker / Anne-Flore Bernard").visibility,
        vortex: app.world.camera._postProcesses.some((pass) => pass?.name === "Cinema / lens demoscene vortex"),
        reelsVisible: app.world.scene.getTransformNodeByName("Cinema / reels and moving film architecture").isEnabled(),
        matrixReady: matrix.material.isReady(matrix),
        matrixPairReady: matrixLeft.material.isReady(matrixLeft) && matrixLeft.material === matrix.material
          && matrixLeft.geometry === matrix.geometry && matrixLeft.position.x < 0 && matrix.position.x > 0,
        vortexTurn: app.world.lensVortex.state.turn, vortexExit: app.world.lensVortex.state.exit,
        terminal: { ...terminal.state },
        astronautPresent: astronaut.isEnabled(), astronautScale: astronaut.scaling.asArray(),
        astronautFeet: astronaut.position.y - 6.5 * astronaut.scaling.y / 2,
        archHeight: arch.position.y, archPresent: arch.isEnabled(),
        oldAstronautAbsent: !app.world.scene.getTransformNodeByName("Cinema / passing astronaut"),
      });
    }
    const cameras = [];
    const vendingApproach = [];
    for (const time of [51.18, 55, 59, 60.8, 61.349, 61.35, 61.351, 61.8, 65, 70]) {
      app.seek(time);
      const gag = app.world.simready.groups.get("vending");
      vendingApproach.push({ time, enabled: gag.root.isEnabled(),
        opaque: gag.nodes[0].getChildMeshes().every((mesh) => mesh.visibility === 1 && mesh.isEnabled()),
        caption: gag.label.visibility });
    }
    for (const time of [0, 3.5, 5.925, 8, 13.9, 17, 18, 22, 27, 29, 38.1, 50.876, 59.4, 61.35, 61.8,
      62.2, 64.5, 66, 70, 78.5, 84.5, 86.3, 90, 97, 97.8, 99, 107, 110.7, 113.3, 117.2, 118.4, 124.4, 125.8, 128, 137, 140, 143.5, 144.6, 145.2, 146.8, 159, 168, 173, 180]) {
      app.world.simready.config.enabled = false;
      app.seek(time);
      const original = [...app.world.camera.position.asArray(), ...app.world.camera.rotation.asArray(), app.world.camera.fov];
      app.world.simready.config.enabled = true;
      app.seek(time);
      app.world.scene.render();
      const actual = [...app.world.camera.position.asArray(), ...app.world.camera.rotation.asArray(), app.world.camera.fov];
      cameras.push({ time, unchanged: actual.every((value, index) => value === original[index]) });
    }
    const gags = app.world.simready;
    const snapshot = (time) => {
      app.seek(time);
      return [...gags.groups].filter(([, gag]) => gag.root.isEnabled()).map(([id, gag]) => ({
        id, root: gag.root.position.asArray(),
        nodes: gag.nodes.map((node) => [...node.position.asArray(), ...node.rotation.asArray(), ...node.scaling.asArray()]),
        joint: gag.armPivot?.rotation.asArray(),
      }));
    };
    const first = snapshot(143.5);
    snapshot(61.8); snapshot(8); snapshot(180);
    const again = snapshot(143.5);
    const pile = snapshot(130);
    snapshot(125.8); snapshot(0); snapshot(180);
    const pileAgain = snapshot(130);
    app.seek(61.8);
    const vending = gags.groups.get("vending");
    const bounds = vending.nodes[0].getHierarchyBoundingVectors(true);
    return { before, after: counts(), cameras, vendingApproach, artDirection,
      pongCaptionAbsent: !app.world.scene.meshes.some((mesh) => /PONG.*HUMAN/i.test(mesh.name)),
      powerCaptionAbsent: !app.world.scene.meshes.some((mesh) => /CASSOULET POWER/.test(mesh.name)),
      pileReplaySame: JSON.stringify(pile) === JSON.stringify(pileAgain),
      replaySame: JSON.stringify(first) === JSON.stringify(again),
      vendingYaw: vending.root.rotation.y, vendingX: vending.root.position.x, vendingBack: bounds.max.z,
      shoulder: !!gags.groups.get("launchArm").armPivot };
  });
  assert.deepEqual(replay.after, replay.before, "Seeking must not accumulate scene objects.");
  assert.ok(replay.cameras.every((sample) => sample.unchanged), "NVIDIA effects must never change the camera.");
  assert.equal(replay.replaySame, true);
  assert.equal(replay.pongCaptionAbsent, true);
  assert.ok(replay.artDirection.filter((sample) => [4.5, 5.525].includes(sample.time)).every((sample) => sample.entryShader));
  assert.ok(replay.artDirection.filter((sample) => [3.5, 4.299, 5.925, 6.1].includes(sample.time)).every((sample) => !sample.entryShader));
  assert.ok(replay.artDirection.filter((sample) => [15, 26.999, 27, 29].includes(sample.time))
    .every((sample) => sample.httpPresent && sample.httpYaw === 0));
  assert.equal(replay.artDirection.find((sample) => sample.time === 28.999).request, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 29).request, false);
  assert.ok(replay.artDirection.find((sample) => sample.time === 86.3).lensDistance < .02,
    "Lens entry must leave time to see David, the reels and the complete popcorn cascade.");
  assert.ok(replay.artDirection.filter((sample) => [17.25, 17.5, 18, 19.1].includes(sample.time))
    .every((sample) => sample.violinOpacity === sample.anneFloreOpacity), "Violin and name must share their reveal envelope.");
  assert.ok(replay.artDirection.find((sample) => sample.time === 18).violinOpacity > 0);
  assert.equal(replay.artDirection.find((sample) => sample.time === 76.8).vortex, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 78.5).vortex, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 84.5).vortex, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 86.5).vortex, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 78.5).reelsVisible, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 97.8).vortex, false);
  assert.ok(replay.artDirection.find((sample) => sample.time === 97).vortexTurn > .9);
  assert.equal(replay.artDirection.find((sample) => sample.time === 96.2).vortexExit, 0);
  assert.ok(Math.abs(replay.artDirection.find((sample) => sample.time === 97).vortexExit - .5) < .01);
  assert.equal(replay.artDirection.find((sample) => sample.time === 61.8).matrixReady, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 61.8).matrixPairReady, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 118).astronautPresent, true);
  const rising = replay.artDirection.find((sample) => sample.time === 117.2);
  const grown = replay.artDirection.find((sample) => sample.time === 118.4);
  assert.ok(rising.astronautScale[0] > 0 && rising.astronautScale[0] < 1);
  assert.deepEqual(grown.astronautScale, [1, 1, 1]);
  assert.ok([rising, grown].every((sample) => sample.archPresent && Math.abs(sample.astronautFeet) < .001
    && sample.astronautScale.every((value) => value === sample.astronautScale[0])));
  assert.ok(rising.archHeight < grown.archHeight);
  assert.ok(replay.artDirection.every((sample) => sample.oldAstronautAbsent));
  assert.ok(replay.artDirection.filter((sample) => [120, 137, 139.499].includes(sample.time))
    .every((sample) => sample.armPresent && sample.armOpaque), "Launch arm must already be present during the approach.");
  assert.ok(replay.artDirection.filter((sample) => [120, 124.399].includes(sample.time)).every((sample) => !sample.cassoulet));
  assert.equal(replay.artDirection.find((sample) => sample.time === 124.399).terminal.complete, false);
  assert.ok(replay.artDirection.find((sample) => sample.time === 124.399).terminal.downloadedGB < 4.8);
  assert.equal(replay.artDirection.find((sample) => sample.time === 124.4).terminal.complete, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 124.4).terminal.downloadedGB, 4.8);
  assert.equal(replay.artDirection.find((sample) => sample.time === 124.4).canCount, 1);
  assert.equal(replay.artDirection.find((sample) => sample.time === 125.8).cassoulet, true);
  assert.equal(replay.powerCaptionAbsent, true);
  assert.equal(replay.pileReplaySame, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 130).canCount, 64);
  assert.ok(replay.artDirection.find((sample) => sample.time === 130).pileHeight > 5, "The can pile must be visibly tall.");
  assert.ok(replay.artDirection.filter((sample) => [108, 110.699].includes(sample.time))
    .every((sample) => sample.bufferLabel === 0 && !sample.waterSpilling));
  assert.ok(replay.artDirection.find((sample) => sample.time === 111).bufferLabel > .9);
  assert.equal(replay.artDirection.find((sample) => sample.time === 111).waterSpilling, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 111).bufferYaw, Math.PI);
  assert.ok(replay.vendingApproach.every((sample) => sample.enabled && sample.opaque), "Machine must not pop in at the gag onset.");
  assert.ok(replay.vendingApproach.filter((sample) => sample.time < 61.35 || sample.time >= 65)
    .every((sample) => sample.caption === 0), "Only the interaction caption has a short reveal window.");
  assert.equal(replay.vendingYaw, 0);
  assert.ok(replay.vendingX < -504);
  assert.ok(Math.abs(replay.vendingBack - 55.23) < .01, "Machine must be flush with the D wall.");
  assert.equal(replay.shoulder, true);

  const measurements = [];
  for (const time of [61.8, 90, 97, 111, 118, 128, 143.5]) {
    for (const enabled of [false, true]) {
      measurements.push(await page.evaluate(({ time, enabled }) => new Promise((resolve, reject) => {
        const app = window.devfest, scene = app.world.scene;
        app.world.simready.config.enabled = enabled;
        app.seek(time);
        let count = 0, last;
        const samples = [];
        const timer = setTimeout(() => {
          scene.onAfterRenderObservable.remove(observer);
          reject(new Error("Frame benchmark timed out."));
        }, 15000);
        const observer = scene.onAfterRenderObservable.add(() => {
          const now = performance.now();
          if (count > 25 && last !== undefined) samples.push(now - last);
          last = now;
          if (++count < 145) return;
          scene.onAfterRenderObservable.remove(observer);
          clearTimeout(timer);
          samples.sort((a, b) => a - b);
          resolve({ time, enabled, width: app.engine.getRenderWidth(), height: app.engine.getRenderHeight(),
            fps: 1000 / (samples.reduce((a, b) => a + b, 0) / samples.length),
            medianMs: samples[Math.floor(samples.length / 2)], p95Ms: samples[Math.floor(samples.length * .95)],
            drawCalls: app.debug.instrumentation.drawCallsCounter.current });
        });
      }), { time, enabled }));
    }
  }
  console.log("Frame benchmarks:", measurements);
  for (let index = 0; index < measurements.length; index += 2) {
    assert.ok(measurements[index + 1].fps >= measurements[index].fps * .85,
      `Significant frame-rate regression at ${measurements[index].time}s.`);
  }

  await page.goto(`${origin}/?asset-viewer=simready`);
  await page.waitForFunction(() => window.simreadyViewer?.ready, null, { timeout: 120000 });
  assert.equal(await page.locator('[aria-label="SimReady asset"] option').count(), 10);
  await page.locator('[aria-label="SimReady asset"]').selectOption("all");
  await page.getByLabel("Wireframe", { exact: true }).check();
  await page.getByLabel("Bounding boxes", { exact: true }).check();
  await page.getByLabel("Vertex normals", { exact: true }).check();
  const viewer = await page.evaluate(() => ({
    reports: window.simreadyViewer.assets.reports.size, errors: [...window.simreadyViewer.assets.errors.values()],
    normals: window.simreadyViewer.scene.getMeshByName("Inspection vertex normals")?.getTotalVertices() ?? 0,
  }));
  assert.equal(viewer.reports, 9);
  assert.deepEqual(viewer.errors, []);
  assert.ok(viewer.normals > 0);

  assetRequests.length = 0;
  await page.goto(`${origin}/?simready=0`);
  await page.waitForFunction(() => window.devfest?.ready, null, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.devfest.world.simready.groups.size), 0);
  assert.deepEqual(assetRequests, [], "Disabled mode must not download NVIDIA models.");
  assert.deepEqual(external, [], "The performance and viewer must use only local resources.");
  assert.deepEqual(errors, []);
  const report = { browser: process.env.SIMREADY_BROWSER ?? "msedge", viewport: [1920, 1080], readyMs, fullShow,
    groups: loaded.groups, replay, measurements, viewer, browserErrors: errors, externalRequests: external };
  await writeFile(new URL("../docs/simready-validation.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Verified nine models, five presentation moments, unchanged camera, deterministic replay and zero browser errors. Startup ${readyMs} ms.`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
