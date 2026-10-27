import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";

const server = await preview({ preview: { host: "127.0.0.1", port: 0, open: false } });
let browser;
try {
  const address = server.httpServer.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ channel: "msedge", headless: true,
    args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [], external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) external.push(request.url());
    assert.ok(!/01_legacy_code_wall|02_xor_cpu_gate|03_sequence_storyboard/.test(request.url()),
      "Reference images must not be loaded by the runtime.");
  });
  const began = Date.now();
  await page.goto(origin);
  await page.waitForFunction(() => window.devfest?.ready, null, { timeout: 90000 });
  const readyMs = Date.now() - began;
  await page.addStyleTag({ content: "#pause-overlay{display:none!important}" });
  await page.evaluate(() => {
    window.legacySnapshot = () => {
      const { arcade, arcadePhysics } = window.devfest.world, gate = arcade.gate;
      return {
        wall: arcadePhysics.wall.map((prop) => [...prop.mesh.position.asArray(),
          ...prop.mesh.rotationQuaternion.asArray(), prop.mesh.isEnabled()]),
        panels: gate.leaves.map((leaf) => [...leaf.position.asArray(), ...leaf.rotationQuaternion.asArray()]),
        module: gate.logicModule.position.asArray(), state: { ...gate.state },
        signalEnabled: gate.signal.glow.isEnabled(), shaderProgress: gate.signal.material._floats.progress,
      };
    };
  });
  await page.locator("#fullscreen").uncheck(); await page.locator("#play").click();
  await page.waitForFunction(() => window.devfest.timeline.playing);
  await page.evaluate(() => {
    const app = window.devfest;
    app.seek(34.4);
    window.legacyPlayback = { snapshots: [], frames: [], seen: new Set() };
    const observer = app.world.scene.onAfterRenderObservable.add(() => {
      const time = app.timeline.time, probe = window.legacyPlayback;
      if (time >= 48.5) { app.world.scene.onAfterRenderObservable.remove(observer); return; }
      if (!app.timeline.playing) return;
      probe.frames.push([time, performance.now()]);
      for (const target of [35.7, 37.4, 38.55, 40.5, 42.1, 44.15, 46.03]) {
        if (time >= target && !probe.seen.has(target)) {
          probe.seen.add(target); probe.snapshots.push({ target, time, state: window.legacySnapshot() });
        }
      }
    });
  });
  await page.waitForFunction(() => window.devfest.timeline.time >= 35.8);
  const paused = await page.evaluate(() => {
    window.devfest.togglePlayback(); return { time: window.devfest.timeline.time, state: window.legacySnapshot() };
  });
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => ({ time: window.devfest.timeline.time, state: window.legacySnapshot() })), paused);
  await page.evaluate(() => window.devfest.togglePlayback());
  await page.waitForFunction(() => window.devfest.timeline.time >= 48.5, null, { timeout: 20000 });
  await page.evaluate(() => window.devfest.togglePlayback());
  const playback = await page.evaluate(() => ({
    snapshots: window.legacyPlayback.snapshots, frames: window.legacyPlayback.frames.length,
    music: document.querySelector("#soundtrack-player").currentTime,
  }));
  assert.equal(playback.snapshots.length, 7);
  for (const snapshot of playback.snapshots) {
    const replay = await page.evaluate((time) => { window.devfest.seek(time); return window.legacySnapshot(); }, snapshot.time);
    assert.deepEqual(replay, snapshot.state, `Direct seek must match actual music playback at ${snapshot.time}.`);
  }
  const counts = await page.evaluate(() => {
    const app = window.devfest, scene = app.world.scene;
    const count = () => [scene.meshes.length, scene.transformNodes.length, scene.materials.length,
      scene.lights.length, scene.getPhysicsEngine().getBodies().length];
    const before = count();
    for (let loop = 0; loop < 20; loop++) for (const time of [0, 34.4, 35.7, 37.4, 38.2, 39, 40.5, 42.1, 44.15, 46.03, 49, 180]) app.seek(time);
    return { before, after: count(), curtainMeshes: scene.meshes.filter((mesh) => /red velvet curtain/.test(mesh.name)).length,
      liveWallBodies: app.world.arcadePhysics.wall.filter((prop) => prop.mesh.physicsBody).length,
      bake: { frames: app.world.arcadePhysics.bake.frames, tracks: app.world.arcadePhysics.bake.tracks.length } };
  });
  assert.deepEqual(counts.before, counts.after);
  assert.equal(counts.curtainMeshes, 0); assert.equal(counts.liveWallBodies, 0);
  assert.equal(counts.bake.tracks, 48); assert.equal(counts.bake.frames, 181);
  const cameraBaseline = JSON.parse(await readFile(new URL("../docs/legacy-xor/camera-baseline.json", import.meta.url), "utf8"));
  const camera = await page.evaluate((samples) => {
    const app = window.devfest, V = app.world.camera.position.constructor;
    let positionError = 0, directionError = 0, fovError = 0;
    const reference = new app.world.camera.constructor("Validation / original camera pipeline", V.Zero(), app.world.scene);
    reference.inputs.clear();
    for (const sample of samples) {
      app.seek(sample.time);
      const actual = app.world.camera;
      actual.getViewMatrix(true);
      reference.position.copyFrom(V.FromArray(sample.position));
      reference.setTarget(V.FromArray(sample.target)); reference.getViewMatrix(true);
      positionError = Math.max(positionError, V.Distance(actual.position, reference.position));
      const expected = reference.getTarget().subtract(reference.position).normalize();
      directionError = Math.max(directionError, V.Distance(actual.getTarget().subtract(actual.position).normalize(), expected));
      fovError = Math.max(fovError, Math.abs(actual.fov - sample.fov));
    }
    reference.dispose();
    return { samples: samples.length, positionError, directionError, fovError };
  }, cameraBaseline.samples);
  assert.equal(camera.positionError, 0); assert.equal(camera.fovError, 0); assert.ok(camera.directionError < 1e-5);
  const captures = [];
  for (const [name, time] of [["01-assembly", 35.7], ["02-complete", 37.4], ["03-collision", 38.55],
    ["04-signal", 40.5], ["05-partial-gate", 44.15], ["06-exit", 46.03], ["07-xor-activation", 42.1]]) {
    await page.evaluate((time) => { window.devfest.seek(time); window.devfest.world.scene.render(); }, time);
    await page.screenshot({ path: new URL(`../docs/legacy-xor/after-${name}.png`, import.meta.url).pathname });
    captures.push({ name, time });
  }
  const finale = await page.evaluate(async () => {
    const app = window.devfest, scene = app.world.scene, actor = app.world.cinema.astronautRoot;
    app.seek(118.4);
    const oldCornerEmpty = !actor.isEnabled() && !scene.getTransformNodeByName("Digital / astronaut after buffer");
    const originalPose = [...actor.position.asArray(), ...actor.scaling.asArray()];
    const sources = [...new Set(actor.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0)
      .map((mesh) => mesh.sourceMesh ?? mesh))];
    const saved = sources.map((mesh) => mesh.material), Standard = app.world.cassouletPoster.mesh.material.constructor;
    const mask = new Standard("Validation / orbital astronaut visibility", scene);
    mask.disableLighting = true; mask.diffuseColor.set(0, 0, 0); mask.specularColor.set(0, 0, 0); mask.emissiveColor.set(1, 0, 1);
    let visibleSeconds = 0, fixed = true;
    try {
      app.seek(151);
      sources.forEach((mesh) => { mesh.material = mask; });
      await Promise.all(sources.map((mesh) => mask.forceCompilationAsync(mesh, { useInstances: true })));
      for (let time = 149; time <= 155; time += .25) {
        app.seek(time); scene.render();
        const pixels = await app.engine.readPixels(0, 0, 1920, 1080);
        let visible = 0;
        for (let at = 0; at < pixels.length; at += 4) {
          if (pixels[at] > 110 && pixels[at + 1] < pixels[at] * .15 && pixels[at + 2] > 110) visible++;
        }
        if (visible > 2000) visibleSeconds += .25;
        fixed &&= JSON.stringify([...actor.position.asArray(), ...actor.scaling.asArray()]) === JSON.stringify(originalPose);
      }
    } finally { sources.forEach((mesh, index) => { mesh.material = saved[index]; }); mask.dispose(); }
    app.seek(151); scene.render();
    const bounds = actor.getHierarchyBoundingVectors(true);
    const pastry = [29, 31.85, 32.2, 32.55, 32.75].map((time) => {
      app.seek(time);
      const mesh = scene.getMeshByName("Chocolatine compiler stage 1");
      return { time, visibility: mesh.visibility, enabled: mesh.isEnabled() };
    });
    return { oldCornerEmpty, visibleSeconds, fixed, position: actor.position.asArray(),
      bounds: { min: bounds.min.asArray(), max: bounds.max.asArray() }, height: bounds.max.y - bounds.min.y, pastry };
  });
  assert.equal(finale.oldCornerEmpty, true); assert.equal(finale.fixed, true);
  assert.ok(finale.visibleSeconds >= 3, "The relocated astronaut must really be visible behind the orbital hardware.");
  assert.ok(Math.abs(finale.height - 16.64) < .001);
  assert.ok(finale.bounds.min[2] > 28.75 && finale.bounds.max[2] < 55.25, "The astronaut must not enter the final corridor walls.");
  assert.equal(finale.pastry[0].visibility, 1);
  assert.ok(Math.abs(finale.pastry[2].visibility - .5) < .001);
  assert.ok(finale.pastry.slice(3).every((sample) => !sample.enabled && sample.visibility === 0));
  for (const [name, time] of [["finale-astronaut", 151], ["chocolatine-crossing", 32.75]]) {
    await page.evaluate((time) => { window.devfest.seek(time); window.devfest.world.scene.render(); }, time);
    await page.screenshot({ path: new URL(`../docs/legacy-xor/${name}.png`, import.meta.url).pathname });
  }
  const geometry = await page.evaluate(async () => {
    const app = window.devfest, scene = app.world.scene, gate = app.world.arcade.gate;
    const V = gate.root.position.constructor, M = gate.root.computeWorldMatrix(true).constructor;
    const solids = gate.root.getChildMeshes().filter((mesh) => mesh.material?.getClassName() === "PBRMaterial")
      .map((mesh) => {
        const vertices = mesh.getVerticesData("position");
        const min = new V(Infinity, Infinity, Infinity), max = new V(-Infinity, -Infinity, -Infinity);
        for (let index = 0; index < vertices.length; index += 3) {
          min.minimizeInPlaceFromFloats(vertices[index], vertices[index + 1], vertices[index + 2]);
          max.maximizeInPlaceFromFloats(vertices[index], vertices[index + 1], vertices[index + 2]);
        }
        return { mesh, min, max };
      });
    let conservativeClearance = Infinity, at;
    for (let frame = 0; frame <= 120; frame++) {
      const time = 43 + frame / 20; app.seek(time); scene.render();
      const camera = app.world.camera, forward = camera.getTarget().subtract(camera.position).normalize();
      const right = V.TransformNormal(V.Right(), camera.getWorldMatrix()).normalize();
      const up = V.TransformNormal(V.Up(), camera.getWorldMatrix()).normalize();
      const half = Math.tan(camera.fov / 2) * camera.minZ, near = camera.position.add(forward.scale(camera.minZ));
      const points = [camera.position, ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) =>
        near.add(right.scale(sx * half * 16 / 9)).add(up.scale(sy * half))))];
      for (const { mesh, min, max } of solids) {
        const base = mesh.computeWorldMatrix(true), instances = mesh.hasThinInstances ? mesh.thinInstanceGetWorldMatrices() : [M.Identity()];
        for (const instance of instances) {
          const world = instance.multiply(base), inverse = M.Invert(world), scale = new V();
          world.decompose(scale);
          for (const sample of points) {
            const point = V.TransformCoordinates(sample, inverse);
            const distance = Math.hypot(Math.max(min.x - point.x, 0, point.x - max.x) * scale.x,
              Math.max(min.y - point.y, 0, point.y - max.y) * scale.y,
              Math.max(min.z - point.z, 0, point.z - max.z) * scale.z);
            if (distance < conservativeClearance) { conservativeClearance = distance; at = { time, mesh: mesh.name }; }
          }
        }
      }
    }
    const widths = [];
    for (const time of [38.2, 39.5, 40.5, 41.5, 42.1]) {
      app.seek(time); scene.render();
      const image = await app.engine.readPixels(0, 0, 1920, 1080);
      let cyan = 0;
      for (let at = 0; at < image.length; at += 4) if (image[at + 1] > image[at] + 35 && image[at + 2] > image[at] + 45) cyan++;
      widths.push({ time, cyanPixels: cyan, progress: gate.state.signal, power: gate.state.power });
    }
    return { conservativeClearance, at, signalSamples: widths, panelCount: gate.panels.length };
  });
  assert.ok(geometry.conservativeClearance > .6, "The camera center and near-plane corners require real metal clearance.");
  assert.equal(geometry.panelCount, 4);
  assert.ok(geometry.signalSamples.at(-1).cyanPixels > 200, "The activated CPU must be visible in actual GPU pixels.");
  assert.ok(geometry.signalSamples[1].progress > 0 && geometry.signalSamples[1].progress < 1);
  assert.equal(geometry.signalSamples[1].power, 0);
  const measurements = [];
  for (const time of [35.7, 37.4, 38.55, 40.5, 42.1, 44.15, 46.03]) {
    measurements.push(await page.evaluate((time) => new Promise((resolve) => {
      const app = window.devfest, scene = app.world.scene; app.seek(time);
      const samples = []; let frame = 0, last;
      const observer = scene.onAfterRenderObservable.add(() => {
        const now = performance.now();
        if (frame > 20 && last !== undefined) samples.push(now - last); last = now;
        if (++frame < 125) return;
        scene.onAfterRenderObservable.remove(observer);
        samples.sort((a, b) => a - b);
        resolve({ time, fps: 1000 / (samples.reduce((a, b) => a + b, 0) / samples.length),
          medianMs: samples[Math.floor(samples.length / 2)], p95Ms: samples[Math.floor(samples.length * .95)],
          drawCalls: app.debug.instrumentation.drawCallsCounter.current });
      });
    }), time));
  }
  assert.ok(measurements.every((measurement) => measurement.fps >= 51), "Stay within 15% of the measured 60 FPS baseline.");
  await page.evaluate(() => window.devfest.debug.setVisible(true));
  await page.getByText("LEGACY WALL / XOR CPU GATE", { exact: true }).click();
  await page.getByLabel("Legacy XOR enableLegacyWallAssembly", { exact: true }).uncheck();
  await page.getByLabel("Legacy XOR enableXorCpuGate", { exact: true }).uncheck();
  const fallback = await page.evaluate(() => {
    const app = window.devfest; app.seek(37.4);
    return { gateDisabled: !app.world.arcade.gate.root.isEnabled(),
      originalHomes: app.world.arcadePhysics.wall.every((prop) => prop.mesh.position.equals(prop.home)) };
  });
  assert.equal(fallback.gateDisabled, true); assert.equal(fallback.originalHomes, true);
  await page.getByLabel("Legacy XOR enableLegacyWallAssembly", { exact: true }).check();
  await page.getByLabel("Legacy XOR enableXorCpuGate", { exact: true }).check();
  await page.getByLabel("Legacy XOR openingDuration", { exact: true }).fill("4");
  await page.getByLabel("Legacy XOR openingDuration", { exact: true }).press("Tab");
  assert.equal(await page.evaluate(() => window.devfest.world.legacyXor.openingDuration), 3.1);
  await page.getByRole("button", { name: "WALL IMPACT", exact: true }).click();
  assert.equal(await page.evaluate(() => window.devfest.timeline.time), 38.2);
  await page.evaluate(() => window.devfest.debug.setVisible(false));
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  const report = { readyMs, browser: "headless Edge", resolution: [1920, 1080],
    baselineCameraHash: cameraBaseline.hash, camera, playbackFrames: playback.frames,
    musicReached: playback.music, nativePlaybackSeekIdentical: true, pauseStable: true,
    replay: counts, geometry, measurements, captures, fallback, finale, browserErrors: errors, externalRequests: external };
  await writeFile(new URL("../docs/legacy-xor/validation.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
