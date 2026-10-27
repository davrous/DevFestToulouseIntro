import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { CASSOULET_INSTALL, CASSOULET_PILE, CINEMA, DEPLOY_ROCKET } from "../content/showBeats";
import { routeAnchor } from "../camera/CameraPath";
import { createSimReadyConfig, SIMREADY_GAGS, VENDING_WALL, validateGagSettings } from "./config";
import { launchArmPose, pongPose, SimReadyGags, snackDropPose } from "./SimReadyGags";
import { PONG_VOLLEY } from "../content/violin";

vi.mock("../scene/WorldText", () => ({
  createWorldText: (scene: Scene, options: { name: string }) =>
    MeshBuilder.CreatePlane(options.name, { width: 2, height: 1 }, scene),
}));
vi.mock("../effects/MatrixRainWall", () => ({
  MatrixRainWall: class {
    constructor(scene: Scene, parent: TransformNode) {
      MeshBuilder.CreatePlane("FX/Matrix / snack wall code rain", { size: 1 }, scene).parent = parent;
    }
    update() {}
  },
}));

async function setup() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const gags = new SimReadyGags(scene);
  const prepare = vi.spyOn(gags.assets, "prepare").mockResolvedValue();
  const create = vi.spyOn(gags.assets, "create").mockImplementation((id, parent, name) => {
    const root = new TransformNode(name, scene);
    root.parent = parent;
    const body = MeshBuilder.CreateBox(`${name} / body`, { size: 1 }, scene);
    body.parent = root;
    if (id === "robotArm") {
      for (let index = 1; index <= 4; index++) {
        const shoulder = new TransformNode(`${name} / armShoulder_0${index}_obj_00`, scene);
        shoulder.parent = root;
        const part = MeshBuilder.CreateBox(`${name} / arm part ${index}`, { size: .2 }, scene);
        part.parent = shoulder;
        part.position.set(index * .25, index * .3, 0);
      }
    }
    return root;
  });
  await gags.prepare();
  return { engine, scene, gags, prepare, create };
}

describe("configured NVIDIA art direction", () => {
  it("removes the donut, small robot and collision from playback and preloads only active assets", async () => {
    const { engine, scene, gags, prepare, create } = await setup();
    expect(Object.keys(SIMREADY_GAGS)).toEqual(["pong", "pastry", "cassoulet", "launchArm", "vending"]);
    expect(prepare.mock.calls[0][0]).toEqual(["pongPaddle", "pongBall", "croissant", "cassouletCan", "robotArm", "snackVendingMachine"]);
    const calls = create.mock.calls.length;
    const meshes = scene.meshes.length;
    await gags.prepare();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(calls);
    expect(scene.meshes).toHaveLength(meshes);
    scene.dispose();
    engine.dispose();
  });

  it("mounts the vending machine on the left of the front D wall, facing the entering camera", async () => {
    const { engine, scene, gags } = await setup();
    gags.update(61.8, silentFeatures());
    const vending = gags.groups.get("vending")!;
    expect(vending.root.isEnabled()).toBe(true);
    expect(vending.root.position.x).toBeLessThan(VENDING_WALL.x);
    expect(vending.root.rotation.asArray()).toEqual([0, 0, 0]);
    const bounds = vending.nodes[0].getHierarchyBoundingVectors(true);
    expect(bounds.max.z).toBeCloseTo(VENDING_WALL.z - VENDING_WALL.clearance, 4);
    expect(gags.config.gags.vending.start).toBe(CINEMA.start);
    expect(gags.config.gags.vending.end).toBe(CINEMA.auditoriumEnd);
    gags.update(CINEMA.auditoriumEnd, silentFeatures());
    expect(vending.root.isEnabled()).toBe(false);
    expect(vending.light?.intensity).toBe(0);
    scene.dispose();
    engine.dispose();
  });

  it("keeps the preloaded vending model and 404 caption fully visible throughout the camera passage", async () => {
    const { engine, scene, gags, prepare, create } = await setup();
    const vending = gags.groups.get("vending")!;
    const meshCount = scene.meshes.length;
    const instanceCount = create.mock.calls.length;
    const label = vending.label!;
    const machineMeshes = vending.nodes[0].getChildMeshes();
    expect(machineMeshes.length).toBeGreaterThan(0);
    for (const time of [CINEMA.start, 55, 59, 60.8, 61.349, 61.35, 61.351, 61.8, 65, 70, 55]) {
      gags.update(time, silentFeatures());
      expect(vending.root.isEnabled(), `machine at ${time}s`).toBe(true);
      expect(machineMeshes.every((mesh) => mesh.isEnabled() && mesh.visibility === 1)).toBe(true);
      expect(label.visibility).toBe(1);
      if (time === 61.8) expect(label.visibility).toBeGreaterThan(0);
    }
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(instanceCount);
    expect(scene.meshes).toHaveLength(meshCount);
    gags.update(CINEMA.start - .01, silentFeatures());
    expect(vending.root.isEnabled()).toBe(false);
    scene.dispose();
    engine.dispose();
  });

  it("keeps the Pong paddles and moving ball without creating the human-vs-AI caption", async () => {
    const { engine, scene, gags } = await setup();
    gags.update(18.5, silentFeatures());
    const pong = gags.groups.get("pong")!;
    expect(pong.root.isEnabled()).toBe(true);
    expect(pong.nodes).toHaveLength(3);
    expect(pong.label).toBeUndefined();
    expect(scene.meshes.some((mesh) => /PONG.*HUMAN/i.test(mesh.name))).toBe(false);
    const before = pong.nodes[2].position.clone();
    gags.update(18.65, silentFeatures());
    expect(pong.nodes[2].position.equals(before)).toBe(false);
    gags.update(18.5, silentFeatures());
    expect(pong.nodes[2].position.asArray()).toEqual(before.asArray());
    scene.dispose();
    engine.dispose();
  });

  it("places the support arm beside the existing rocket and retracts its real shoulder before liftoff", async () => {
    const { engine, scene, gags } = await setup();
    const rocket = routeAnchor(DEPLOY_ROCKET.time, DEPLOY_ROCKET.lateral).position;
    const settings = gags.config.gags.launchArm;
    expect(settings.position[0]).toBeCloseTo(rocket.x - 7);
    expect(settings.position[2]).toBeCloseTo(rocket.z + 1);
    expect(settings.animation.interaction).toBe(DEPLOY_ROCKET.launch);
    expect(launchArmPose(DEPLOY_ROCKET.launch - .3, settings).retract).toBe(0);
    expect(launchArmPose(DEPLOY_ROCKET.launch, settings).retract).toBeGreaterThan(0);
    expect(launchArmPose(DEPLOY_ROCKET.launch + .4, settings).retract).toBe(1);
    const arm = gags.groups.get("launchArm")!;
    expect(settings.start).toBe(CINEMA.digital);
    expect(settings.end).toBe(159);
    for (const time of [95, 120, 137, 139.499, 139.5, 140]) {
      gags.update(time, silentFeatures());
      expect(arm.root.isEnabled()).toBe(true);
      expect(arm.nodes[0].getChildMeshes().every((mesh) => mesh.isEnabled() && mesh.visibility === 1)).toBe(true);
    }
    gags.update(143.5, silentFeatures());
    expect(arm.root.isEnabled()).toBe(true);
    expect(arm.armPivot?.rotation.y).toBe(Math.PI);
    const supporting = arm.armPivot!.rotation.z;
    gags.update(145.2, silentFeatures());
    expect(arm.armPivot!.rotation.z).toBeLessThan(supporting);
    gags.update(143.5, silentFeatures());
    expect(arm.armPivot!.rotation.z).toBe(supporting);
    scene.dispose();
    engine.dispose();
  });

  it("stages the can barrage on the Terminator's corridor axis after the npm terminal", async () => {
    const { engine, scene, gags } = await setup();
    const settings = gags.config.gags.cassoulet;
    expect(settings.start).toBe(CASSOULET_INSTALL.complete);
    expect(settings.end).toBe(CASSOULET_PILE.end);
    expect(settings.position).toEqual([-448, .02, 126]);
    const gag = gags.groups.get("cassoulet")!;
    expect(gag.nodes).toHaveLength(CASSOULET_PILE.count);
    expect(gag.label).toBeUndefined();
    expect(scene.meshes.some((mesh) => /CASSOULET POWER/.test(mesh.name))).toBe(false);
    gags.update(CASSOULET_INSTALL.complete - .001, silentFeatures());
    expect(gag.root.isEnabled()).toBe(false);
    gags.update(settings.start + .25, silentFeatures());
    expect(gag.root.isEnabled()).toBe(true);
    scene.dispose();
    engine.dispose();
  });

  it("replays every gag without accumulating objects and independently disables features", async () => {
    const { engine, scene, gags } = await setup();
    const snapshot = () => [...gags.groups].map(([id, gag]) => gag.root.isEnabled() ? {
      id, enabled: true, position: gag.root.position.asArray(), rotation: gag.root.rotation.asArray(),
      nodes: gag.nodes.map((node) => ({ p: node.position.asArray(), r: node.rotation.asArray(), s: node.scaling.asArray() })),
      joint: gag.armPivot?.rotation.asArray(), light: gag.light?.intensity,
    } : { id, enabled: false });
    gags.update(61.8, silentFeatures());
    const original = snapshot();
    const count = scene.meshes.length;
    for (const time of [8, 28, 119, 143.9, 145.2, 180, 0]) gags.update(time, silentFeatures());
    gags.update(61.8, silentFeatures());
    expect(snapshot()).toEqual(original);
    expect(scene.meshes).toHaveLength(count);
    gags.config.enableSnackVendingMachine = false;
    gags.update(61.8, silentFeatures());
    expect(gags.groups.get("vending")!.root.isEnabled()).toBe(false);
    gags.update(18.5, silentFeatures());
    expect(gags.groups.get("pong")!.root.isEnabled()).toBe(true);
    gags.config.enabled = false;
    gags.update(18.5, silentFeatures());
    expect([...gags.groups.values()].every((gag) => !gag.root.isEnabled())).toBe(true);
    expect(() => gags.update(NaN, silentFeatures())).toThrow();
    scene.dispose();
    engine.dispose();
  });

  it("keeps all settings and analytical animations finite and rejects invalid edits", () => {
    const config = createSimReadyConfig();
    for (const settings of Object.values(config.gags)) expect(() => validateGagSettings(settings)).not.toThrow();
    const settings = structuredClone(config.gags.vending);
    expect(snackDropPose(settings.animation.interaction, settings).y).toBe(9.2);
    expect(snackDropPose(settings.animation.interaction + settings.animation.duration, settings).y).toBeCloseTo(2.2);
    const pose = snackDropPose(61.8, settings);
    snackDropPose(180, settings);
    expect(snackDropPose(61.8, settings)).toEqual(pose);
    for (let time = PONG_VOLLEY.start; time < PONG_VOLLEY.end; time += .01) {
      expect(Object.values(pongPose(time, config.gags.pong)).every(Number.isFinite)).toBe(true);
    }
    settings.scale = -1;
    expect(() => validateGagSettings(settings)).toThrow();
    settings.scale = 1;
    settings.end = 170;
    expect(() => validateGagSettings(settings)).toThrow();
  });
});
