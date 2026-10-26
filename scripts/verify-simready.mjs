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
    await page.evaluate(() => window.devfest.seek(78.5));
    await page.waitForFunction(() => window.devfest.timeline.time >= 94.2, null, { timeout: 25000 });
    await page.evaluate(() => window.devfest.togglePlayback());
  }
  const musicBands = await page.evaluate(() => window.tunnelMusicProbe);
  assert.ok(musicBands.samples > 100, "The four trails must be checked during real MP3 playback.");
  assert.ok(musicBands.peaks.every((value, index) => value > .005 && value - musicBands.lows[index] > .005),
    "Each trail must respond to a varying real Web Audio frequency band.");
  assert.ok(musicBands.maxRoutingError < .00001, "Live FFT bands must reach the tunnel material unchanged.");
  console.log("Live Web Audio trail bands:", musicBands);

  const replay = await page.evaluate(async () => {
    const app = window.devfest;
    const counts = () => [app.world.scene.meshes.length, app.world.scene.transformNodes.length,
      app.world.scene.materials.length, app.world.scene.lights.length];
    const before = counts();
    const artDirection = [];
    for (const time of [3.5, 4.299, 4.5, 5.525, 5.925, 6.1, 15, 17.25, 17.5, 18, 19.1, 26.999, 27, 28.999, 29,
      61.8, 63.25, 63.5, 76.8, 78.5, 79.999, 80, 80.35, 80.45, 84.5, 90, 91.5, 92.8, 93.5, 94, 94.199, 94.2, 108, 110.699, 111,
      117.2, 118, 118.4, 120, 124.399, 124.4, 125.8, 128, 130, 137, 139.499]) {
      app.seek(time);
      const http = app.world.scene.getTransformNodeByName("Toulouse HTTP redirect");
      const arm = app.world.simready.groups.get("launchArm");
      const cassoulet = app.world.simready.groups.get("cassoulet");
      const lens = app.world.scene.getMeshByName("Cinema / frontal camera lens rim");
      const bufferLabel = app.world.scene.getMeshByName("Digital / BUFFER OVERFLOW");
      const matrix = app.world.scene.getMeshByName("FX/Matrix / snack wall code rain");
      const astronaut = app.world.scene.getTransformNodeByName("Digital / astronaut after buffer");
      const arches = app.world.scene.getMeshByName("FX/Digital / evolving data corridor");
      const archMatrices = app.world.digitalMoments.progressionMatrices;
      const preview = app.world.cinema.tunnelPreview;
      const terminal = app.world.easterEggs.npmTerminal;
      const robotBounds = app.world.cinema.terminator.root.getHierarchyBoundingVectors(true);
      matrix.computeWorldMatrix(true);
      const matrixBounds = matrix.getBoundingInfo().boundingBox;
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
        terminal: { ...terminal.state },
        astronautPresent: astronaut.isEnabled(), astronautScale: astronaut.scaling.asArray(),
        astronautFeet: astronaut.position.y - 6.5 * astronaut.scaling.y / 2,
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
  assert.equal(replay.volleyReplaySame, true, "Final Pong ball and struck violin must replay identical recorded poses.");
  assert.ok(replay.violinCollision.time > 21.8 && replay.violinCollision.time < 22.15);
  assert.ok(replay.violinCollision.impulse > .01, "The violin must fall because of a real contact, not a timer.");
  assert.ok(replay.artDirection.filter((sample) => [4.5, 5.525].includes(sample.time)).every((sample) => sample.entryShader));
  assert.ok(replay.artDirection.filter((sample) => [3.5, 4.299, 5.925, 6.1].includes(sample.time)).every((sample) => !sample.entryShader));
  assert.ok(replay.artDirection.filter((sample) => [15, 26.999, 27, 29].includes(sample.time))
    .every((sample) => sample.httpPresent && sample.httpYaw === 0));
  assert.equal(replay.artDirection.find((sample) => sample.time === 28.999).request, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 29).request, false);
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
  const robotA = replay.artDirection.find((sample) => sample.time === 63.25);
  const robotB = replay.artDirection.find((sample) => sample.time === 63.5);
  assert.ok(robotA.terminator && robotB.terminator);
  assert.equal(robotA.terminatorClip, "The Chase");
  assert.ok(Math.abs(robotA.terminatorHeight - 21.6) < .01, "The Terminator must be exactly three times its former 7.2-unit height.");
  assert.notEqual(robotA.terminatorFrame, robotB.terminatorFrame);
  assert.ok(robotB.terminatorPosition[0] > robotA.terminatorPosition[0]);
  assert.equal(replay.artDirection.find((sample) => sample.time === 61.8).matrixReady, true);
  const mural = replay.artDirection.find((sample) => sample.time === 61.8);
  assert.equal(mural.matrixSingleSurface, true);
  [-532, -462.75, .05, 32.85].forEach((value, index) => assert.ok(Math.abs(mural.matrixBounds[index] - value) < .001,
    "Matrix mural must extend from the black strip to the right wall edge, floor to ceiling."));
  assert.equal(replay.artDirection.find((sample) => sample.time === 78.5).lensPreviewReady, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 78.5).lensPreviewVisible, true);
  assert.equal(replay.artDirection.find((sample) => sample.time === 90).lensPreviewVisible, false);
  assert.equal(replay.artDirection.find((sample) => sample.time === 118).astronautPresent, true);
  const rising = replay.artDirection.find((sample) => sample.time === 117.2);
  const grown = replay.artDirection.find((sample) => sample.time === 118.4);
  assert.ok(rising.astronautScale[0] > 1 && rising.astronautScale[0] < 1.6);
  assert.deepEqual(grown.astronautScale, [1.6, 1.6, 1.6]);
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

  const robotPresentation = await page.evaluate(async () => {
    const app = window.devfest, scene = app.world.scene, root = app.world.cinema.terminator.root;
    const meshes = root.getChildMeshes(), saved = meshes.map((mesh) => mesh.material);
    const Standard = scene.getMaterialByName("Cinema / physical lens rim").constructor;
    const mask = new Standard("Validation / occluded robot silhouette", scene);
    mask.disableLighting = true;
    mask.diffuseColor.set(0, 0, 0); mask.specularColor.set(0, 0, 0); mask.emissiveColor.set(1, 0, 1);
    const result = { minimum: [Infinity, Infinity, Infinity], maximum: [-Infinity, -Infinity, -Infinity],
      cameraClearance: Infinity, visibleSeconds: 0, centralSeconds: 0 };
    try {
      app.seek(63.5);
      meshes.forEach((mesh) => { mesh.material = mask; });
      await Promise.all(meshes.map((mesh) => mask.forceCompilationAsync(mesh)));
      for (let time = 60.5; time <= 70; time += .25) {
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
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index] > 110 && pixels[index + 1] < pixels[index] * .15 && pixels[index + 2] > 110) {
            count++; centerX += (index / 4) % width;
          }
        }
        if (count > 1000) {
          result.visibleSeconds += .25;
          if (Math.abs(centerX / count / width * 2 - 1) < .6) result.centralSeconds += .25;
        }
      }
      return result;
    } finally {
      meshes.forEach((mesh, index) => { mesh.material = saved[index]; mesh.refreshBoundingInfo(false); });
      mask.dispose();
    }
  });
  assert.ok(robotPresentation.visibleSeconds >= 5, "The actual robot silhouette must remain visible despite scenery occlusion.");
  assert.ok(robotPresentation.centralSeconds >= 4, "The robot must stay near the camera axis for a readable approach.");
  assert.ok(robotPresentation.minimum[0] > -573.25 && robotPresentation.maximum[0] < -546.75);
  assert.ok(robotPresentation.minimum[2] > 28.75 && robotPresentation.maximum[2] < 55.25,
    "Every sampled skeletal pose must remain inside the actual corridor walls.");
  assert.ok(robotPresentation.minimum[1] >= .1 && robotPresentation.maximum[1] < 32.85);
  assert.ok(robotPresentation.cameraClearance > 1, "The camera must pass beside, not through, the enlarged robot.");
  console.log("Robot animated clearance / actual visibility:", robotPresentation);

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
  for (const time of [63.25, 80.35, 84, 91.5, 93.5, 111, 118, 128, 143.5]) {
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
    groups: loaded.groups, replay, tunnelIsolation, robotPresentation, exitContinuity, musicBands, measurements, viewer,
    browserErrors: errors, externalRequests: external };
  await writeFile(new URL("../docs/simready-validation.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Verified nine models, five presentation moments, unchanged camera, deterministic replay and zero browser errors. Startup ${readyMs} ms.`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
