import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import { clamp, smoothstep } from "../engine/Timeline";
import type { AudioFeatures } from "../engine/AudioAnalyzer";
import { cueEnvelope } from "../content/cues";
import { CASSOULET_PILE, DEPLOY_ROCKET } from "../content/showBeats";
import { createWorldText } from "../scene/WorldText";
import journey from "../audio/violasJourney.json";
import { SimReadyAssets } from "./SimReadyAssets";
import { createSimReadyConfig, isSimReadyGagId, SIMREADY_GAGS, VENDING_WALL, validateGagSettings, type GagSettings, type SimReadyGagId } from "./config";
import type { SimReadyAssetId } from "./registry";
import { CassouletPile } from "./CassouletPile";
import { BoxBatch } from "../scene/Instances";
import { MatrixRainWall } from "../effects/MatrixRainWall";

interface Gag {
  root: TransformNode;
  nodes: TransformNode[];
  meshes: AbstractMesh[];
  available: boolean;
  light?: PointLight;
  label?: ReturnType<typeof createWorldText>;
  armPivot?: TransformNode;
  pile?: CassouletPile;
  matrix?: MatrixRainWall;
}

const PONG_BEATS = [7, ...journey.beats.map(([time]) => time).filter((time) => time > 7 && time < 13.7), 13.7]
  .filter((time, index, beats) => index === 0 || time - beats[index - 1] >= .25);

export function pongPose(time: number, settings: GagSettings): { x: number; y: number; miss: number } {
  const beat = PONG_BEATS.findIndex((next) => next > time);
  const index = beat < 0 ? PONG_BEATS.length - 2 : Math.max(0, beat - 1);
  const start = PONG_BEATS[index], end = PONG_BEATS[index + 1];
  const phase = clamp((time - start) / (end - start));
  const side = index % 2 ? 1 : -1;
  const miss = Math.max(0, time - settings.animation.interaction);
  return {
    x: miss > 0 ? 5.4 + miss * 12 : side * 5.4 * (1 - 2 * phase),
    y: Math.sin((index + phase) * 1.2) * 2.1 - miss * miss * 3,
    miss,
  };
}

export function snackDropPose(time: number, settings: GagSettings): { y: number; z: number; flicker: number } {
  const elapsed = time - settings.animation.interaction;
  const progress = clamp(elapsed / settings.animation.duration);
  const landing = Math.max(0, elapsed - settings.animation.duration);
  const bounce = settings.animation.bounce * Math.abs(Math.sin(landing * 12)) * Math.exp(-landing * 6);
  const flickering = elapsed >= -settings.animation.flicker && elapsed < 0;
  return {
    y: 9.2 - 7 * progress * progress + bounce,
    z: -3.2 - .9 * smoothstep(progress),
    flicker: flickering ? .4 + .6 * Number(Math.sin(time * 87) > -.2) : 1,
  };
}

export function launchArmPose(time: number, settings: GagSettings): { support: number; retract: number } {
  return {
    support: smoothstep((time - DEPLOY_ROCKET.lookStart + .5) / 2),
    retract: smoothstep((time - settings.animation.interaction + .25) / settings.animation.duration),
  };
}

export class SimReadyGags {
  readonly assets: SimReadyAssets;
  readonly config;
  readonly groups = new Map<SimReadyGagId, Gag>();
  readonly errors: string[] = [];
  private preparing?: Promise<void>;

  constructor(private readonly scene: Scene, enabled = true) {
    this.config = createSimReadyConfig(enabled);
    this.assets = new SimReadyAssets(scene, (message) => this.errors.push(message));
  }

  prepare(progress: (message: string) => void = () => {}): Promise<void> {
    if (!this.config.enabled) return Promise.resolve();
    this.preparing ??= this.prepareAssets(progress);
    return this.preparing;
  }

  private async prepareAssets(progress: (message: string) => void): Promise<void> {
    const ids = [...new Set(Object.values(SIMREADY_GAGS).flatMap((gag) => [...gag.assets]))];
    try {
      await this.assets.prepare(ids, progress);
    } catch (error) {
      const message = `SimReady integration disabled: ${error instanceof Error ? error.message : String(error)}`;
      console.error(message, error);
      this.errors.push(message);
      progress(message);
      return;
    }
    for (const identifier of Object.keys(SIMREADY_GAGS).filter(isSimReadyGagId)) {
      const id = identifier;
      const root = new TransformNode(`SimReady gag / ${id}`, this.scene);
      root.setEnabled(false);
      const gag: Gag = { root, nodes: [], meshes: [], available: false };
      this.groups.set(identifier, gag);
      if (!SIMREADY_GAGS[identifier].assets.every((asset) => !this.assets.errors.has(asset))) continue;
      try {
        this.build(identifier, gag);
        gag.meshes = root.getChildMeshes();
        gag.available = gag.nodes.length > 0;
      } catch (error) {
        const message = `Optional SimReady gag ${identifier} unavailable: ${error instanceof Error ? error.message : String(error)}`;
        console.error(message, error);
        this.errors.push(message);
        root.dispose();
      }
    }
    if (this.scene.getPhysicsEngine()) this.initializePhysics();
  }

  private model(gag: Gag, asset: SimReadyAssetId, size: number, centered = false, height = false): TransformNode {
    const node = this.assets.create(asset, gag.root, `SimReady / ${asset} / ${gag.nodes.length}`, size,
      height ? "height" : "max", centered);
    if (!node) throw new Error(`Preloaded SimReady asset ${asset} could not be instantiated.`);
    gag.nodes.push(node);
    return node;
  }

  initializePhysics(): void {
    for (const [id, gag] of this.groups) {
      if (!gag.available || !gag.pile) continue;
      gag.root.position.fromArray(this.config.gags[id].position);
      gag.root.rotation.fromArray(this.config.gags[id].rotation);
      gag.pile.initialize();
    }
  }

  private label(gag: Gag, text: string, width: number, y: number, z = -.5): void {
    gag.label = createWorldText(this.scene, {
      name: `SimReady caption / ${text}`, width, height: 1.7, background: "#101f2b", border: "#8bf8d9",
      lines: [{ text, color: "#c8ffdf" }],
    });
    gag.label.parent = gag.root;
    gag.label.position.set(0, y, z);
  }

  private build(id: SimReadyGagId, gag: Gag): void {
    if (id === "pong") {
      this.model(gag, "pongPaddle", 3.5, true).position.x = -6;
      this.model(gag, "pongPaddle", 3.5, true).position.x = 6;
      this.model(gag, "pongBall", .7, true);
    } else if (id === "pastry") {
      this.model(gag, "croissant", 3.2, true);
    } else if (id === "cassoulet") {
      for (let index = 0; index < CASSOULET_PILE.count; index++) {
        this.model(gag, "cassouletCan", CASSOULET_PILE.size, true, true);
      }
      gag.pile = new CassouletPile(this.scene, gag.root, gag.nodes);
      const material = new PBRMaterial("Cassoulet / delivery crate", this.scene);
      material.albedoColor = Color3.FromHexString("#243c48");
      material.emissiveColor = Color3.FromHexString("#12262c");
      material.metallic = .3;
      material.roughness = .8;
      const crate = new BoxBatch("Cassoulet / retaining delivery crate", material);
      const width = CASSOULET_PILE.crateWidth, height = CASSOULET_PILE.crateHeight;
      for (const side of [-1, 1]) {
        for (let level = .4; level <= height; level += 1.2) {
          crate.add(side * width / 2, level, 0, .18, .18, width);
          crate.add(0, level, side * width / 2, width, .18, .18);
        }
        for (let offset = -width / 2; offset <= width / 2; offset += 1.2) {
          crate.add(side * width / 2, height / 2, offset, .18, height, .18);
          crate.add(offset, height / 2, side * width / 2, .18, height, .18);
        }
      }
      const mesh = crate.build(this.scene);
      mesh.unfreezeWorldMatrix();
      mesh.parent = gag.root;
    } else if (id === "launchArm") {
      const arm = this.model(gag, "robotArm", 9, false, true);
      const moving = arm.getChildTransformNodes().filter((node) => /armShoulder_0[1-4]_obj_00$/.test(node.name));
      if (moving.length) {
        const bounds = moving[0].getHierarchyBoundingVectors(true);
        const pivot = new TransformNode("SimReady launch arm / shoulder joint", this.scene);
        pivot.parent = arm;
        pivot.position.copyFrom(bounds.min.add(bounds.max).scale(.5));
        for (const node of moving) node.setParent(pivot);
        pivot.rotation.y = Math.PI;
        gag.armPivot = pivot;
      } else {
        throw new Error("Converted launch arm is missing the separate shoulder transforms required for articulation.");
      }
    } else {
      const machine = this.model(gag, "snackVendingMachine", 16, false, true);
      const bounds = machine.getHierarchyBoundingVectors(true);
      this.config.gags.vending.position[2] = VENDING_WALL.z - bounds.max.z - VENDING_WALL.clearance;
      gag.matrix = new MatrixRainWall(this.scene, gag.root, bounds.max.z);
      this.model(gag, "croissant", 1.4, true).position.x = -.8;
      this.label(gag, "404: HEALTHY SNACK NOT FOUND", 7.7, 12.4, -4.25);
      gag.light = new PointLight("SimReady vending interior light", machine.position.clone(), this.scene);
      gag.light.parent = gag.root;
      gag.light.position.set(0, 9.5, -4.8);
      gag.light.diffuse = Color3.FromHexString("#9dffe2");
      gag.light.range = 23;
      gag.light.intensity = 0;
      gag.light.includedOnlyMeshes = machine.getChildMeshes();
      const glow = MeshBuilder.CreatePlane("FX/SimReady vending display glow", { width: 5, height: 7 }, this.scene);
      glow.parent = gag.root;
      glow.position.set(.7, 9.5, -3.35);
      const material = new StandardMaterial("SimReady vending soft interior", this.scene);
      material.disableLighting = true;
      material.diffuseColor = Color3.Black();
      material.emissiveColor = Color3.FromHexString("#7affe0").scale(.12);
      material.alpha = .05;
      material.backFaceCulling = false;
      glow.material = material;
      glow.isPickable = false;
    }
  }

  update(time: number, audio: AudioFeatures): void {
    if (!Number.isFinite(time)) throw new RangeError("SimReady effect time must be finite.");
    for (const [id, gag] of this.groups) {
      const settings = this.config.gags[id];
      const active = this.config.enabled && this.config[SIMREADY_GAGS[id].flag] && gag.available
        && time >= settings.start && time < settings.end;
      gag.root.setEnabled(active);
      if (gag.light) gag.light.intensity = 0;
      if (!active) continue;
      gag.root.position.fromArray(settings.position);
      gag.root.rotation.fromArray(settings.rotation);
      gag.root.scaling.setAll(settings.scale);
      const visibility = id === "vending" || id === "launchArm" || id === "cassoulet"
        ? 1 : cueEnvelope(time, settings.start, settings.end, .12, .25);
      for (const mesh of gag.meshes) {
        mesh.visibility = visibility;
        mesh.showBoundingBox = this.config.boundingBoxes;
      }
      const local = time - settings.start;
      if (id === "pong") {
        const pose = pongPose(time, settings);
        gag.nodes[0].position.y = Math.sin(local * 1.3) * 2;
        gag.nodes[1].position.y = pose.miss > 0 ? -3 : Math.sin(local * 1.3 + 1.1) * 2;
        gag.nodes[2].position.set(pose.x, pose.y, -pose.miss * 3);
      } else if (id === "pastry") {
        const item = gag.nodes[0];
        const collected = smoothstep((time - settings.animation.interaction) / .55);
        item.position.y = Math.sin(local * 2.4) * .3 + collected * 1.8;
        item.rotation.y = local * 1.4;
        item.scaling.setAll(1 - collected * .75);
      } else if (id === "cassoulet") {
        gag.pile?.update(local);
      } else if (id === "launchArm") {
        const pose = launchArmPose(time, settings);
        gag.nodes[0].rotation.y = -.08 * pose.support * (1 - pose.retract);
        if (gag.armPivot) gag.armPivot.rotation.z = -1.1 + .65 * pose.support - .9 * pose.retract;
      } else {
        const pose = snackDropPose(time, settings);
        gag.matrix?.update(time);
        gag.nodes[1].position.set(-.8, pose.y, pose.z);
        gag.nodes[1].rotation.z = Math.min(.25, Math.max(0, time - settings.animation.interaction) * .3);
        if (gag.light) gag.light.intensity = (100 + audio.beat * 15) * pose.flicker;
        if (gag.label) gag.label.visibility = pose.flicker * cueEnvelope(time,
          settings.animation.interaction - settings.animation.flicker,
          settings.animation.interaction + (settings.animation.displayDuration ?? 3.45), .12, .25);
      }
    }
  }

  setSettings(id: SimReadyGagId, settings: GagSettings): void {
    validateGagSettings(settings);
    this.config.gags[id] = structuredClone(settings);
  }
}
