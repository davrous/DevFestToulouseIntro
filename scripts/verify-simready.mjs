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
  assert.deepEqual(await page.locator("#soundtrack option").evaluateAll((options) => options.map((option) => option.value)),
    ["violas-journey", "violas-journey-wav"]);
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
  await page.evaluate(() => {
    const app = window.devfest, scene = app.world.scene, engine = app.engine;
    const probe = window.speakerEntranceProbe = { frames: [], shaderCompilations: [] };
    const shaderObserver = engine.onBeforeShaderCompilationObservable.add(() => {
      if (app.timeline.time >= 13 && app.timeline.time < 20.5) probe.shaderCompilations.push(app.timeline.time);
    });
    const observer = scene.onAfterRenderObservable.add(() => {
      if (app.timeline.time >= 20.5) {
        scene.onAfterRenderObservable.remove(observer);
        engine.onBeforeShaderCompilationObservable.remove(shaderObserver);
        return;
      }
      if (app.timeline.playing && app.timeline.time >= 13) probe.frames.push([app.timeline.time, performance.now()]);
    });
  });
  await page.evaluate(() => {
    const app = window.devfest, scene = app.world.scene, engine = app.engine;
    const probe = window.terminatorEntranceProbe = { frames: [], shaderCompilations: [] };
    const shaderObserver = engine.onBeforeShaderCompilationObservable.add(() => {
      if (app.timeline.time >= 116.5 && app.timeline.time < 128) probe.shaderCompilations.push(app.timeline.time);
    });
    const observer = scene.onAfterRenderObservable.add(() => {
      if (app.timeline.time >= 128) {
        scene.onAfterRenderObservable.remove(observer);
        engine.onBeforeShaderCompilationObservable.remove(shaderObserver);
        return;
      }
      if (app.timeline.playing && app.timeline.time >= 116.5) probe.frames.push([app.timeline.time, performance.now()]);
    });
  });
  await page.evaluate(() => {
    const probe = window.tunnelMusicProbe = { samples: 0, peaks: [0, 0, 0, 0], lows: [1, 1, 1, 1], maxRoutingError: 0 };
    const scene = window.devfest.world.scene;
    const observer = scene.onAfterRenderObservable.add(() => {
      const app = window.devfest;
      if (app.timeline.time >= 94.2) { scene.onAfterRenderObservable.remove(observer); return; }
      if (!app.timeline.playing || app.timeline.time < 80.45) return;
      const fft = window.showController.features;
      const source = [fft.bass, fft.lowMid, fft.highMid, fft.treble];
      const rendered = app.world.lensVortex.tunnel.bands;
      probe.samples++;
      source.forEach((value, index) => {
        probe.peaks[index] = Math.max(probe.peaks[index], value);
        probe.lows[index] = Math.min(probe.lows[index], value);
        probe.maxRoutingError = Math.max(probe.maxRoutingError, Math.abs(value - rendered[index]));
      });
    });
  });
  await page.evaluate(() => {
    const app = window.devfest, scene = app.world.scene;
    window.wallPosterReadable = () => {
      const poster = app.world.cassouletPoster, camera = app.world.camera;
      if (!poster.root.isEnabled() || camera.position.x <= poster.root.position.x) return false;
      const Vector = camera.position.constructor, width = app.engine.getRenderWidth(), height = app.engine.getRenderHeight();
      const world = poster.mesh.computeWorldMatrix(true), viewport = camera.viewport.toGlobal(width, height);
      const corners = poster.mesh.getBoundingInfo().boundingBox.vectors.map((point) =>
        Vector.Project(point, world, scene.getTransformMatrix(), viewport));
      return corners.every((point) => point.z > 0 && point.z < 1
        && point.x >= width * .04 && point.x <= width * .96
        && point.y >= height * .04 && point.y <= height * .96)
        && Math.max(...corners.map((point) => point.y)) - Math.min(...corners.map((point) => point.y)) >= height * .1;
    };
    const probe = window.cassouletPosterProbe = { frames: 0, first: null, last: null, robotVisibleDuringPoster: false };
    const observer = scene.onAfterRenderObservable.add(() => {
      if (app.timeline.time >= 145) { scene.onAfterRenderObservable.remove(observer); return; }
      if (!app.timeline.playing || app.timeline.time < 136.5 || !window.wallPosterReadable()) return;
      probe.frames++;
      probe.first ??= app.timeline.time;
      probe.last = app.timeline.time;
      probe.robotVisibleDuringPoster ||= app.world.cinema.terminator.root.isEnabled();
    });
  });
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
    await page.evaluate(() => window.devfest.seek(12.5));
    await page.waitForFunction(() => window.devfest.timeline.time >= 20.6, null, { timeout: 15000 });
    await page.evaluate(() => window.devfest.seek(78.5));
    await page.waitForFunction(() => window.devfest.timeline.time >= 94.2, null, { timeout: 25000 });
    await page.evaluate(() => window.devfest.seek(116.5));
    await page.waitForFunction(() => window.devfest.timeline.time >= 128, null, { timeout: 18000 });
    await page.evaluate(() => window.devfest.togglePlayback());
    await page.evaluate(() => { window.devfest.seek(136); window.devfest.togglePlayback(); });
    await page.waitForFunction(() => window.devfest.timeline.time >= 145, null, { timeout: 15000 });
    await page.evaluate(() => window.devfest.togglePlayback());
  }
  const speakerEntrance = await page.evaluate(() => {
    const probe = window.speakerEntranceProbe;
    const intervals = probe.frames.slice(1).map((frame, index) => frame[1] - probe.frames[index][1]).sort((a, b) => a - b);
    return { frames: probe.frames.length, shaderCompilations: probe.shaderCompilations,
      maxFrameMs: Math.max(...intervals), p95FrameMs: intervals[Math.floor(intervals.length * .95)],
      resolution: [window.devfest.engine.getRenderWidth(), window.devfest.engine.getRenderHeight()] };
  });
  assert.ok(speakerEntrance.frames > 300, "The first speaker must be measured during cold real-music playback.");
  assert.deepEqual(speakerEntrance.shaderCompilations, [], "Speaker and bass-deformed frame shaders must compile before SYSTEM READY.");
  assert.ok(speakerEntrance.maxFrameMs < 50, "Anne-Flore's first appearance must not stall the render loop.");
  assert.ok(speakerEntrance.p95FrameMs < 22, "The first speaker must retain the normal 60 FPS frame budget.");
  console.log("Cold first-speaker frame budget:", speakerEntrance);
  const terminatorEntrance = await page.evaluate(() => {
    const probe = window.terminatorEntranceProbe;
    const intervals = probe.frames.slice(1).map((frame, index) => frame[1] - probe.frames[index][1]).sort((a, b) => a - b);
    return { frames: probe.frames.length, shaderCompilations: probe.shaderCompilations,
      maxFrameMs: Math.max(...intervals), p95FrameMs: intervals[Math.floor(intervals.length * .95)],
      resolution: [window.devfest.engine.getRenderWidth(), window.devfest.engine.getRenderHeight()] };
  });
  assert.ok(terminatorEntrance.frames > 500, "Measure the cold entrance, can impacts and model-to-petals handoff during real music playback.");
  assert.deepEqual(terminatorEntrance.shaderCompilations, [], "The Terminator's actual PBR, skin and glow draw variants must be ready before playback.");
  assert.ok(terminatorEntrance.maxFrameMs < 50, "The Terminator's first appearance must not stall the render loop.");
  assert.ok(terminatorEntrance.p95FrameMs < 22, "The rescue must retain the normal 60 FPS frame budget.");
  console.log("Cold Terminator frame budget:", terminatorEntrance);
  const musicBands = await page.evaluate(() => window.tunnelMusicProbe);
  assert.ok(musicBands.samples > 100, "The four trails must be checked during real MP3 playback.");
  assert.ok(musicBands.peaks.every((value, index) => value > .005 && value - musicBands.lows[index] > .005),
    "Each trail must respond to a varying real Web Audio frequency band.");
  assert.ok(musicBands.maxRoutingError < .00001, "Live FFT bands must reach the tunnel material unchanged.");
  console.log("Live Web Audio trail bands:", musicBands);
  const posterPlayback = await page.evaluate(() => window.cassouletPosterProbe);
  assert.ok(posterPlayback.frames >= 180, "The wall comic must remain readable for several seconds during music playback.");
  assert.ok(posterPlayback.first > 136 && posterPlayback.last < 144.6 && posterPlayback.last - posterPlayback.first >= 4);
  assert.equal(posterPlayback.robotVisibleDuringPoster, false, "The punchline must follow, not conceal, the robot's destruction.");

  const davidScreen = await page.evaluate(() => {
    const app = window.devfest, screen = app.world.scene.getMeshByName("Cinema premiere / David Rousset");
    return [51.18, 60, 65.9, 66, 66.99, 67, 68.8, 75, 87.5, 60].map((time) => {
      app.seek(time); app.world.scene.render();
      return { time, enabled: screen.isEnabled(), visibility: screen.visibility,
        textureReady: screen.material.diffuseTexture.isReady() };
    });
  });
  assert.ok(davidScreen.every((state) => state.enabled && state.visibility === 1 && state.textureReady),
    "David's opaque, preloaded card must already exist before the camera rounds the corner, including on rewind.");

  const replay = await page.evaluate(async () => {
    const app = window.devfest;
    const counts = () => [app.world.scene.meshes.length, app.world.scene.transformNodes.length,
      app.world.scene.materials.length, app.world.scene.lights.length];
    const before = counts();
    const artDirection = [];
    for (const time of [3.5, 4.299, 4.5, 5.525, 5.925, 6.1, 15, 17.25, 17.5, 18, 19.1, 26.999, 27, 28.499, 28.5,
      41.8, 44.5, 46.5, 59.199, 59.2, 59.35, 59.9, 61.8, 63.25, 76.8, 78.5, 79.999, 80, 80.35, 80.45, 84.5, 90, 91.5, 92.8, 93.5, 94, 94.199, 94.2, 108, 110.699, 111,
      117.2, 118, 118.4, 119.5, 120, 121.25, 124.399, 124.4, 125.19, 125.3, 125.8, 126.5, 126.65, 126.85, 127.2, 127.7, 128, 130, 137, 139.499, 149, 153, 155, 166]) {
      app.seek(time);
      app.world.lensVortex.tunnel.camera.getViewMatrix(true);
      const http = app.world.scene.getTransformNodeByName("Toulouse HTTP redirect");
      const arm = app.world.simready.groups.get("launchArm");
      const cassoulet = app.world.simready.groups.get("cassoulet");
      const lens = app.world.scene.getMeshByName("Cinema / frontal camera lens rim");
      const bufferLabel = app.world.scene.getMeshByName("Digital / BUFFER OVERFLOW");
      const matrix = app.world.scene.getMeshByName("FX/Matrix / snack wall code rain");
      const astronaut = app.world.scene.getTransformNodeByName("Digital / astronaut behind Orbital Link");
      const astronautBounds = astronaut.getHierarchyBoundingVectors(true);
      const arches = app.world.scene.getMeshByName("FX/Digital / evolving data corridor");
      const archMatrices = app.world.digitalMoments.progressionMatrices;
      const preview = app.world.cinema.tunnelPreview;
      const terminal = app.world.easterEggs.npmTerminal;
      const robotBounds = app.world.cinema.terminator.root.getHierarchyBoundingVectors(true);
      matrix.computeWorldMatrix(true);
      const matrixBounds = matrix.getBoundingInfo().boundingBox;
      artDirection.push({
        time, entryShader: app.world.camera._postProcesses.some((pass) => pass?.name === "Arcade / retro gaming entry"),
        openingCenterOffset: app.world.scene.getMeshByName("Arcade / hero portal screen").position.y - app.world.camera.position.y,
        crtStrike: app.world.camera._postProcesses.some((pass) => pass?.name === "Cinema / 59.2s CRT lightning"),
        crtEnergy: app.world.crtLightning.state.energy,
        crtJokeScreens: app.world.cinema.crtScreens.filter((screen) => screen.material.name === "Cinema / lightning AI update screen").length,
        gatePanels: app.world.arcade.gate.panels.length,
        gateVisible: app.world.arcade.gate.root.isEnabled(),
        gateOpening: app.world.arcade.gate.state.open,
        npmCentered: terminal.mesh.position.x === 0,
        petalVertices: app.world.cinema.terminator.debris.getTotalVertices(),
        petalShader: app.world.cinema.terminator.debris.material.name,
        mangaPoster: app.world.cassouletPoster.root.isEnabled(),
        mangaFullscreen: app.world.camera._postProcesses.some((pass) => pass?.name === "Cassoulet / manga victory poster"),
        mangaOpacity: app.world.cassouletPoster.state.opacity,
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
        matrixBounds: [matrixBounds.minimumWorld.x, matrixBounds.maximumWorld.x,
          matrixBounds.minimumWorld.y, matrixBounds.maximumWorld.y],
        matrixSingleSurface: !app.world.scene.getMeshByName("FX/Matrix / snack wall code rain left"),
        lensPreviewReady: preview.material.isReady(preview.mesh),
        lensPreviewVisible: preview.mesh.isEnabled(),
        vortexTurn: app.world.lensVortex.state.turn, vortexExit: app.world.lensVortex.state.exit,
        physicalTunnelVertices: app.world.lensVortex.tunnel.mesh.getTotalVertices(),
        physicalFlightPosition: app.world.lensVortex.tunnel.camera.position.asArray(),
        physicalFlightHeading: app.world.lensVortex.tunnel.camera.getTarget()
          .subtract(app.world.lensVortex.tunnel.camera.position).normalize().asArray(),
        tunnelPassActive: app.world.scene.customRenderTargets.includes(app.world.lensVortex.tunnel.texture),
        terminator: app.world.cinema.terminator.root.isEnabled(),
        terminatorPosition: app.world.cinema.terminator.root.position.asArray(),
        terminatorFrame: app.world.cinema.terminator.animation.animatables[0]?.masterFrame,
        terminatorClip: app.world.cinema.terminator.animation.name,
        terminatorHeight: robotBounds.max.y - robotBounds.min.y,
        terminatorDamage: app.world.cinema.terminator.destruction[0]?.damage,
        terminatorDebris: app.world.cinema.terminator.debris.isEnabled(),
        terminal: { ...terminal.state },
        astronautPresent: astronaut.isEnabled(), astronautScale: astronaut.scaling.asArray(),
        astronautFeet: astronaut.position.y - 16.64 * astronaut.scaling.y / 2,
        astronautHeight: astronautBounds.max.y - astronautBounds.min.y,
        archBottom: archMatrices[(2 * 4 + 3) * 16 + 13],
        archCount: arches.thinInstanceCount,
        addedArchAbsent: !app.world.scene.getTransformNodeByName("Digital / astronaut rising arch"),
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
    const rally = snapshot(20.5), impactBall = snapshot(22.3);
    const violinSnapshot = () => app.world.scene.meshes.filter((mesh) => mesh.name.startsWith("Arcade / violin voxel "))
      .map((mesh) => [...mesh.position.asArray(), ...mesh.rotationQuaternion.asArray(), mesh.isEnabled()]);
    const fallenViolin = violinSnapshot();
    snapshot(180); snapshot(0);
    const volleyReplaySame = JSON.stringify(rally) === JSON.stringify(snapshot(20.5))
      && JSON.stringify(impactBall) === JSON.stringify(snapshot(22.3))
      && JSON.stringify(fallenViolin) === JSON.stringify(violinSnapshot());
    const collision = app.world.demoscene.impact;
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
      volleyReplaySame, violinCollision: { time: collision.impactTime, impulse: collision.impulse,
        voxel: collision.contactIndex },
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
  assert.equal(replay.artDirection.find((sample) => sample.time === 41.8).gateOpening, 0);
  assert.equal(replay.artDirection.find((sample) => sample.time === 44.5).gatePanels, 4);
  assert.ok(replay.artDirection.find((sample) => sample.time === 46.5).gateOpening > .99);
  assert.equal(replay.artDirection.find((sample) => sample.time === 59.2).gateVisible, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 121.25).npmCentered, true);
  assert.ok(replay.artDirection.find((sample) => sample.time === 127.2).petalVertices > 100);
  assert.equal(replay.artDirection.find((sample) => sample.time === 127.2).petalShader, "Cassoulet / curved crimson petal flutter");
  assert.equal(replay.artDirection.find((sample) => sample.time === 126.5).mangaPoster, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 126.85).mangaPoster, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 126.85).mangaOpacity, 1);
  assert.equal(replay.artDirection.find((sample) => sample.time === 127.7).mangaPoster, true);
  assert.ok(replay.artDirection.every((sample) => !sample.mangaFullscreen), "The comic must never cover the view as a fullscreen cut-in.");
  assert.ok(Math.abs(replay.artDirection.find((sample) => sample.time === 5.925).openingCenterOffset) < .000001);
  assert.equal(replay.artDirection.find((sample) => sample.time === 59.199).crtStrike, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 59.199).crtJokeScreens, 0);
  assert.equal(replay.artDirection.find((sample) => sample.time === 59.2).crtEnergy, 1);
  assert.equal(replay.artDirection.find((sample) => sample.time === 59.2).crtJokeScreens, 8);
  assert.equal(replay.artDirection.find((sample) => sample.time === 59.9).crtStrike, false);
  assert.equal(replay.volleyReplaySame, true, "Final Pong ball and struck violin must replay identical recorded poses.");
  assert.ok(replay.violinCollision.time > 21.8 && replay.violinCollision.time < 22.15);
  assert.ok(replay.violinCollision.impulse > .01, "The violin must fall because of a real contact, not a timer.");
  assert.ok(replay.artDirection.filter((sample) => [4.5, 5.525].includes(sample.time)).every((sample) => sample.entryShader));
  assert.ok(replay.artDirection.filter((sample) => [3.5, 4.299, 5.925, 6.1].includes(sample.time)).every((sample) => !sample.entryShader));
  assert.ok(replay.artDirection.filter((sample) => [15, 26.999, 27, 28.5].includes(sample.time))
    .every((sample) => sample.httpPresent && sample.httpYaw === 0));
  assert.equal(replay.artDirection.find((sample) => sample.time === 28.499).request, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 28.5).request, false);
  assert.ok(replay.artDirection.find((sample) => sample.time === 80.45).lensDistance < .02,
    "The 80s acceleration must cross the physical lens within half a second.");
  assert.ok(replay.artDirection.filter((sample) => [17.25, 17.5, 18, 19.1].includes(sample.time))
    .every((sample) => sample.violinOpacity === sample.anneFloreOpacity), "Violin and name must share their reveal envelope.");
  assert.ok(replay.artDirection.find((sample) => sample.time === 18).violinOpacity > 0);
  assert.equal(replay.artDirection.find((sample) => sample.time === 76.8).vortex, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 78.5).vortex, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 79.999).vortex, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 80).vortex, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 84.5).vortex, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 78.5).reelsVisible, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 94).vortex, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 94.199).vortex, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 94.199).tunnelPassActive, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 94.2).vortex, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 94.2).tunnelPassActive, false);
  assert.ok(replay.artDirection.find((sample) => sample.time === 91.5).vortexTurn > 0);
  assert.equal(replay.artDirection.find((sample) => sample.time === 92.8).vortexExit, 0);
  assert.ok(replay.artDirection.find((sample) => sample.time === 92.8).physicalFlightHeading[0] > .99,
    "The physical tunnel camera must finish facing right, not just distort a screen-space vortex.");
  assert.ok(Math.abs(replay.artDirection.find((sample) => sample.time === 93.5).vortexExit - .5) < .01);
  assert.ok(replay.artDirection.find((sample) => sample.time === 90).physicalTunnelVertices > 29000);
  assert.equal(replay.artDirection.find((sample) => sample.time === 63.25).terminator, false);
  const robotA = replay.artDirection.find((sample) => sample.time === 119.5);
  const robotB = replay.artDirection.find((sample) => sample.time === 121.25);
  assert.ok(robotA.terminator && robotB.terminator);
  assert.equal(robotA.terminatorClip, "The Chase");
  assert.ok(Math.abs(robotA.terminatorHeight - 21.6) < .01, "The Terminator must be exactly three times its former 7.2-unit height.");
  assert.notEqual(robotA.terminatorFrame, robotB.terminatorFrame);
  assert.ok(robotB.terminatorPosition[2] > robotA.terminatorPosition[2]);
  assert.equal(replay.artDirection.find((sample) => sample.time === 125.19).terminatorDamage, 0);
  assert.ok(replay.artDirection.find((sample) => sample.time === 125.8).terminatorDamage > 0);
  assert.equal(replay.artDirection.find((sample) => sample.time === 127.2).terminatorDamage, 1);
  assert.equal(replay.artDirection.find((sample) => sample.time === 127.2).terminator, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 127.2).terminatorDebris, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 61.8).matrixReady, true);
  const mural = replay.artDirection.find((sample) => sample.time === 61.8);
  assert.equal(mural.matrixSingleSurface, true);
  [-532, -462.75, .05, 32.85].forEach((value, index) => assert.ok(Math.abs(mural.matrixBounds[index] - value) < .001,
    "Matrix mural must extend from the black strip to the right wall edge, floor to ceiling."));
  assert.equal(replay.artDirection.find((sample) => sample.time === 78.5).lensPreviewReady, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 78.5).lensPreviewVisible, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 90).lensPreviewVisible, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 118).astronautPresent, false);
  const rising = replay.artDirection.find((sample) => sample.time === 117.2);
  const grown = replay.artDirection.find((sample) => sample.time === 118.4);
  assert.deepEqual(rising.astronautScale, [1, 1, 1]);
  assert.deepEqual(grown.astronautScale, [1, 1, 1]);
  assert.ok(replay.artDirection.filter((sample) => [149, 153, 155].includes(sample.time))
    .every((sample) => sample.astronautPresent && Math.abs(sample.astronautHeight - 16.64) < .001));
  assert.equal(replay.artDirection.find((sample) => sample.time === 166).astronautPresent, false);
  assert.ok([rising, grown].every((sample) => sample.archCount === 24 && sample.addedArchAbsent && Math.abs(sample.astronautFeet) < .001
    && sample.astronautScale.every((value) => value === sample.astronautScale[0])));
  assert.ok(rising.archBottom < grown.archBottom);
  assert.ok(Math.abs(grown.archBottom - 3.5) < .001);
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
  assert.ok(replay.artDirection.find((sample) => sample.time === 130).pileHeight > 2.1, "The rescue must leave a real colliding heap.");
  assert.ok(replay.artDirection.filter((sample) => [108, 110.699].includes(sample.time))
    .every((sample) => sample.bufferLabel === 0 && !sample.waterSpilling));
  assert.ok(replay.artDirection.find((sample) => sample.time === 111).bufferLabel > .9);
  assert.equal(replay.artDirection.find((sample) => sample.time === 111).waterSpilling, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 111).bufferYaw, Math.PI);
  assert.ok(replay.vendingApproach.every((sample) => sample.enabled && sample.opaque), "Machine must not pop in at the gag onset.");
  assert.ok(replay.vendingApproach.every((sample) => sample.caption === 1),
    "The 404 caption must already be present and remain opaque for the entire vending passage.");
  assert.equal(replay.vendingYaw, 0);
  assert.ok(replay.vendingX < -504);
  assert.ok(Math.abs(replay.vendingBack - 55.23) < .01, "Machine must be flush with the D wall.");
  assert.equal(replay.shoulder, true);

  const robotPresentation = await page.evaluate(async () => {
    const app = window.devfest, scene = app.world.scene, root = app.world.cinema.terminator.root;
    const meshes = root.getChildMeshes(), saved = meshes.map((mesh) => mesh.material);
    const Standard = scene.getMaterialByName("Cinema / physical lens rim").constructor;
    const mask = new Standard("Validation / occluded robot silhouette", scene);
    mask.disableLighting = true;
    mask.diffuseColor.set(0, 0, 0); mask.specularColor.set(0, 0, 0); mask.emissiveColor.set(1, 0, 1);
    const result = { minimum: [Infinity, Infinity, Infinity], maximum: [-Infinity, -Infinity, -Infinity],
      cameraClearance: Infinity, visibleSeconds: 0, centralSeconds: 0, lighting: null };
    try {
      app.seek(121.25);
      meshes.forEach((mesh) => { mesh.material = mask; });
      await Promise.all(meshes.map((mesh) => mask.forceCompilationAsync(mesh)));
      for (let time = 119.5; time <= 125; time += .25) {
        app.seek(time);
        meshes.forEach((mesh) => { mesh.skeleton?.prepare(true); mesh.refreshBoundingInfo(true); });
        const { min, max } = root.getHierarchyBoundingVectors(true);
        min.asArray().forEach((value, index) => { result.minimum[index] = Math.min(result.minimum[index], value); });
        max.asArray().forEach((value, index) => { result.maximum[index] = Math.max(result.maximum[index], value); });
        const camera = app.world.camera.position;
        result.cameraClearance = Math.min(result.cameraClearance, Math.hypot(
          Math.max(min.x - camera.x, 0, camera.x - max.x), Math.max(min.y - camera.y, 0, camera.y - max.y),
          Math.max(min.z - camera.z, 0, camera.z - max.z)));
        scene.render();
        const width = app.engine.getRenderWidth(), height = app.engine.getRenderHeight();
        const pixels = await app.engine.readPixels(0, 0, width, height);
        let count = 0, centerX = 0;
        const silhouette = [];
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index] > 110 && pixels[index + 1] < pixels[index] * .15 && pixels[index + 2] > 110) {
            count++; centerX += (index / 4) % width;
            if (time === 121.5) silhouette.push(index);
          }
        }
        if (count > 1000) {
          result.visibleSeconds += .25;
          if (Math.abs(centerX / count / width * 2 - 1) < .6) result.centralSeconds += .25;
        }
        if (time === 121.5) {
          meshes.forEach((mesh, index) => { mesh.material = saved[index]; });
          scene.render();
          const lit = await app.engine.readPixels(0, 0, width, height);
          const lights = app.world.cinema.terminator.lights;
          lights.forEach((light) => { light.intensity = 0; });
          scene.render();
          const dark = await app.engine.readPixels(0, 0, width, height);
          const brightness = (image) => silhouette.reduce((sum, index) =>
            sum + image[index] * .2126 + image[index + 1] * .7152 + image[index + 2] * .0722, 0) / silhouette.length;
          result.lighting = { lit: brightness(lit), withoutDedicatedLights: brightness(dark),
            scoped: lights.length === 2 && lights.every((light) =>
              light.includedOnlyMeshes.length > 0 && light.includedOnlyMeshes.every((mesh) => meshes.includes(mesh))),
            materialsReady: saved.filter(Boolean).every((material) => material.maxSimultaneousLights >= 6) };
          app.seek(time);
          meshes.forEach((mesh) => { mesh.material = mask; });
        }
      }
      return result;
    } finally {
      meshes.forEach((mesh, index) => { mesh.material = saved[index]; mesh.refreshBoundingInfo(false); });
      mask.dispose();
    }
  });
  assert.ok(robotPresentation.visibleSeconds >= 3.5, "The actual robot silhouette must remain visible beyond the npm terminal.");
  assert.ok(robotPresentation.centralSeconds >= 3, "The robot must advance toward the camera axis before being defeated.");
  assert.ok(robotPresentation.minimum[0] > -461.25 && robotPresentation.maximum[0] < -434.75);
  assert.ok(robotPresentation.minimum[2] > 56.75 && robotPresentation.maximum[2] < 195.25,
    "Every sampled skeletal pose must remain inside the actual corridor walls.");
  assert.ok(robotPresentation.minimum[1] >= .1 && robotPresentation.maximum[1] < 32.85);
  assert.ok(robotPresentation.cameraClearance > 1, "The camera must pass beside, not through, the enlarged robot.");
  assert.equal(robotPresentation.lighting.scoped, true);
  assert.equal(robotPresentation.lighting.materialsReady, true);
  assert.ok(robotPresentation.lighting.lit > robotPresentation.lighting.withoutDedicatedLights * 1.4,
    "Dedicated lighting must measurably reveal the original chrome, not merely add inactive lights.");
  console.log("Robot animated clearance / actual visibility:", robotPresentation);

  const wallPoster = await page.evaluate(async () => {
    const app = window.devfest, scene = app.world.scene, poster = app.world.cassouletPoster;
    const original = poster.mesh.material, Standard = original.constructor;
    const mask = new Standard("Validation / actual wall poster visibility", scene);
    mask.disableLighting = true;
    mask.diffuseColor.set(0, 0, 0); mask.specularColor.set(0, 0, 0); mask.emissiveColor.set(1, 0, 1);
    const result = { position: poster.root.position.asArray(), yaw: poster.root.rotation.y,
      longestReadableSeconds: 0, coloredArtworkPixels: 0, fixed: true };
    const fixedMatrix = Array.from(poster.root.computeWorldMatrix(true).asArray());
    try {
      app.seek(140.5); scene.render();
      const width = app.engine.getRenderWidth(), height = app.engine.getRenderHeight();
      const normal = await app.engine.readPixels(0, 0, width, height);
      poster.mesh.material = mask;
      await mask.forceCompilationAsync(poster.mesh);
      scene.render();
      const marked = await app.engine.readPixels(0, 0, width, height);
      for (let index = 0; index < marked.length; index += 4) {
        if (marked[index] > 110 && marked[index + 1] < marked[index] * .15 && marked[index + 2] > 110
          && normal[index] > normal[index + 1] + 15 && normal[index] > normal[index + 2] + 25) result.coloredArtworkPixels++;
      }
      let consecutive = 0;
      for (let time = 137; time < 144.6; time += .25) {
        app.seek(time); scene.render();
        const pixels = await app.engine.readPixels(0, 0, width, height);
        let visible = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index] > 110 && pixels[index + 1] < pixels[index] * .15 && pixels[index + 2] > 110) visible++;
        }
        consecutive = window.wallPosterReadable() && visible > 2000 ? consecutive + .25 : 0;
        result.longestReadableSeconds = Math.max(result.longestReadableSeconds, consecutive);
        result.fixed &&= Array.from(poster.root.computeWorldMatrix(true).asArray()).every((value, index) => value === fixedMatrix[index]);
      }
      return result;
    } finally { poster.mesh.material = original; mask.dispose(); }
  });
  assert.deepEqual(wallPoster.position, [-488, 17, 70]);
  assert.equal(wallPoster.yaw, -Math.PI / 2);
  assert.equal(wallPoster.fixed, true, "The poster must stay glued to the actual pre-launch wall, not follow the camera.");
  assert.ok(wallPoster.longestReadableSeconds >= 4, "The whole comic must remain readable and unoccluded before liftoff.");
  assert.ok(wallPoster.coloredArtworkPixels > 3000, "The GPU must show the colorful comic, not a blank overexposed rectangle.");
  console.log("Pre-launch wall manga:", wallPoster);

  const cassouletRescue = await page.evaluate(() => {
    const app = window.devfest, pile = app.world.simready.cassouletRescue, rescue = pile.rescue;
    const snapshot = (time) => {
      app.seek(time);
      const actor = app.world.cinema.terminator;
      return { position: actor.root.position.asArray(), rotation: actor.root.rotationQuaternion.asArray(),
        damage: actor.destruction.map((effect) => effect.damage),
        manga: { ...app.world.cassouletPoster.state },
        shards: actor.debris.isEnabled() ? Array.from(actor.matrices) : [],
        modelVisible: actor.root.isEnabled(), debrisVisible: actor.debris.isEnabled() };
    };
    const hit = snapshot(rescue.impactTime + .2), destroyed = snapshot(rescue.destroyTime + .4);
    snapshot(0); snapshot(180);
    const hitAgain = snapshot(rescue.impactTime + .2), destroyedAgain = snapshot(rescue.destroyTime + .4);
    return { impactTime: rescue.impactTime, destroyTime: rescue.destroyTime, contacts: rescue.contacts,
      fragments: app.world.cinema.terminator.debris.thinInstanceCount,
      deterministic: JSON.stringify([hit, destroyed]) === JSON.stringify([hitAgain, destroyedAgain]),
      destroyedModelHidden: !destroyed.modelVisible && destroyed.debrisVisible };
  });
  assert.ok(cassouletRescue.impactTime > 124.4 && cassouletRescue.impactTime < 126);
  assert.ok(cassouletRescue.destroyTime > cassouletRescue.impactTime && cassouletRescue.destroyTime < 128);
  assert.ok(cassouletRescue.contacts.length >= 12 && cassouletRescue.contacts.every((contact) => contact.impulse > .02));
  assert.equal(cassouletRescue.fragments, 192);
  assert.equal(cassouletRescue.deterministic, true);
  assert.equal(cassouletRescue.destroyedModelHidden, true);
  console.log("Measured cassoulet rescue:", cassouletRescue);

  const compareTunnelBackgrounds = async (time) => {
    const prepare = async (hide) => page.evaluate(({ time, hide }) => {
      const app = window.devfest;
      app.seek(time);
      if (hide) {
        window.tunnelBackgroundMasks = app.world.scene.meshes.map((mesh) => mesh.layerMask);
        app.world.scene.meshes.forEach((mesh) => { if (mesh.layerMask !== 0x10000000) mesh.layerMask = 0; });
      } else if (window.tunnelBackgroundMasks) {
        app.world.scene.meshes.forEach((mesh, index) => { mesh.layerMask = window.tunnelBackgroundMasks[index]; });
        delete window.tunnelBackgroundMasks;
      }
      app.world.scene.render();
    }, { time, hide });
    await prepare(false);
    const normal = await page.locator("#render-canvas").screenshot();
    await prepare(true);
    const hidden = await page.locator("#render-canvas").screenshot();
    await prepare(false);
    return normal.equals(hidden);
  };
  const tunnelIsolation = {
    insideIgnoresScene: await compareTunnelBackgrounds(90),
    exitRevealsScene: !await compareTunnelBackgrounds(93.5),
  };
  assert.equal(tunnelIsolation.insideIgnoresScene, true, "No exterior scenery may leak through the opaque tunnel.");
  assert.equal(tunnelIsolation.exitRevealsScene, true, "The exit aperture must reveal the real D scenery.");

  const exitContinuity = await page.evaluate(async () => {
    const app = window.devfest, samples = [];
    for (const time of [90, 92.8, 93.5, 93.8, 94, 94.199]) {
      app.seek(time); app.world.scene.render();
      const pixels = await app.world.lensVortex.tunnel.texture.readPixels();
      let walls = 0, room = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] > 250) walls++;
        if (pixels[index] < 5) room++;
      }
      samples.push({ time, walls: walls / (pixels.length / 4), room: room / (pixels.length / 4) });
    }
    let previous, maxFrameChange = 0;
    for (let frame = 0; frame <= 78; frame++) {
      app.seek(93 + frame / 60); app.world.scene.render();
      const pixels = await app.engine.readPixels(0, 0, app.engine.getRenderWidth(), app.engine.getRenderHeight());
      if (previous) {
        let difference = 0, count = 0;
        for (let index = 0; index < pixels.length; index += 64) {
          for (let channel = 0; channel < 3; channel++) difference += Math.abs(pixels[index + channel] - previous[index + channel]);
          count += 3;
        }
        maxFrameChange = Math.max(maxFrameChange, difference / count / 255);
      }
      previous = pixels;
    }
    return { samples, maxFrameChange };
  });
  for (const sample of exitContinuity.samples.filter((sample) => [92.8, 93.5, 93.8, 94].includes(sample.time))) {
    assert.ok(sample.walls > .05 && sample.room > .001, "The real tube and D room must coexist during the exit.");
  }
  assert.ok(exitContinuity.samples.find((sample) => sample.time === 94.199).room > .99);
  assert.ok(exitContinuity.maxFrameChange < .06, "The physical exit must not introduce abrupt full-frame cuts.");
  console.log("Physical exit / frame continuity:", exitContinuity);

  const measurements = [];
  for (const time of [44.5, 59.2, 61.8, 80.35, 84, 91.5, 93.5, 111, 118.4, 121.5, 125.8, 126.85, 127.2, 128, 140.5, 143.5]) {
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

  const soundtrackEndings = [];
  for (const id of ["violas-journey", "violas-journey-wav"]) {
    await page.evaluate(() => window.devfest.returnToLobby());
    await page.locator("#soundtrack").selectOption(id);
    await page.locator("#play").click();
    await page.waitForFunction(() => window.devfest.timeline.playing
      && document.querySelector("#soundtrack-player").duration > 0);
    await page.evaluate(() => {
      const app = window.devfest, audio = app.showController.soundtrack;
      const context = audio.context, gain = audio.outputGain, probe = context.createAnalyser();
      probe.fftSize = 2048;
      gain.disconnect(context.destination); gain.connect(probe); probe.connect(context.destination);
      const media = document.querySelector("#soundtrack-player"), before = new Float32Array(2048), after = new Float32Array(2048);
      const rms = (values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
      window.soundtrackEndingSamples = [];
      const observer = app.world.scene.onAfterRenderObservable.add(() => {
        audio.analyser.getFloatTimeDomainData(before); probe.getFloatTimeDomainData(after);
        const input = rms(before), output = rms(after);
        window.soundtrackEndingSamples.push({ remaining: media.duration - media.currentTime,
          gain: audio.outputVolume, input, output, ratio: input > .0001 ? output / input : null });
      });
      window.stopSoundtrackEndingProbe = () => {
        app.world.scene.onAfterRenderObservable.remove(observer);
        gain.disconnect(probe); probe.disconnect(); gain.connect(context.destination);
      };
      app.seek(media.duration - 1.8);
    });
    await page.waitForFunction(() => document.querySelector("#soundtrack-player").ended, null, { timeout: 6000 });
    await page.waitForTimeout(100);
    const ending = await page.evaluate(() => {
      const app = window.devfest, media = document.querySelector("#soundtrack-player"), samples = window.soundtrackEndingSamples;
      window.stopSoundtrackEndingProbe(); app.togglePlayback();
      const result = { duration: media.duration,
        before: samples.find((sample) => sample.remaining < 1.6 && sample.remaining > 1.3),
        middle: samples.find((sample) => sample.gain < .55 && sample.gain > .4),
        late: samples.find((sample) => sample.remaining < .12 && sample.remaining > .04),
        final: samples.at(-1), samples: samples.length };
      app.seek(0);
      return { ...result, rewindVolume: app.showController.soundtrack.outputVolume,
        source: new URL(media.currentSrc).pathname, mappedEffectTime: app.showController.effectTime(50.876) };
    });
    assert.ok(ending.before.ratio > .9 && ending.before.ratio < 1.1, "The fade must not lower normal soundtrack volume.");
    assert.ok(ending.middle.ratio > .3 && ending.middle.ratio < .75, "Measure the real post-gain audio signal, not only a volume property.");
    assert.ok(ending.late.ratio < .12, "Sound must approach silence before the actual media ending.");
    assert.equal(ending.final.gain, 0); assert.ok(ending.final.output < .0001);
    assert.equal(ending.rewindVolume, 1, "Restart must restore full soundtrack volume.");
    assert.ok(Math.abs(ending.duration - 177.6) < .02);
    assert.equal(ending.source, `/assets/music/violas-journey.${id.endsWith("-wav") ? "wav" : "mp3"}`);
    assert.equal(ending.mappedEffectTime, 51.03, "Both formats must use the same measured Journey transitions.");
    soundtrackEndings.push({ id, ...ending });
  }
  console.log("Measured Web Audio soundtrack endings:", soundtrackEndings);

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
    groups: loaded.groups, replay, tunnelIsolation, robotPresentation, cassouletRescue, posterPlayback, wallPoster,
    exitContinuity, musicBands, speakerEntrance, terminatorEntrance, davidScreen, soundtrackEndings, measurements, viewer,
    browserErrors: errors, externalRequests: external };
  await writeFile(new URL("../docs/simready-validation.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Verified nine models, five presentation moments, unchanged camera, deterministic replay and zero browser errors. Startup ${readyMs} ms.`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
