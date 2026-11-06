import "@babylonjs/loaders/glTF";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import { cameraPose, routeAnchor } from "../camera/CameraPath";
import { CELL, cellPosition } from "../content/title";
import { cueEnvelope } from "../content/cues";
import { smoothstep } from "../engine/Timeline";
import { createWorldText } from "./WorldText";
import { ARCADE_ENTRY, CINEMA, LEVEL_COMPLETE } from "../content/showBeats";
import { SPEAKERS } from "../content/speakers";
import { createEventDecal, loadEventArtwork } from "./EventBranding";
import flagUrl from "../assets/event/mascot-flag-green.png";
import type { ArcadeMachine } from "./arcade/ArcadeSceneEnhancements";

const ROOT = "/assets/kenney/arcade/";
export const CABINET_COUNT = 6;
const openingPanelZ = cellPosition(-1, 13.95).z - 8.3;
const anneFlorePanelZ = routeAnchor(SPEAKERS[0].gateTime).position.z;
const cabinetStartZ = openingPanelZ + 18;
const cabinetEndZ = anneFlorePanelZ - 15.3;
const cabinetZAdjustments = [0, 0, -3, 0, -3, -7] as const;
export const CABINET_Z = Object.freeze(Array.from({ length: CABINET_COUNT }, (_, index) =>
  cabinetStartZ + (cabinetEndZ - cabinetStartZ) * index / (CABINET_COUNT - 1) + cabinetZAdjustments[index]));
export const CABINET_WALL_CLEARANCE = .8;
export const ARCADE_WALL_PANELS = { offset: CELL / 2 - .76, height: 17.5 } as const;

export class ArcadeCathedral {
  readonly machines: ArcadeMachine[] = [];
  private readonly cabinets: TransformNode[] = [];
  private readonly heroScreen;
  private logo?: ReturnType<typeof MeshBuilder.CreatePlane>;
  private readonly scanlines;
  private readonly scanlineMaterial: ShaderMaterial;
  private readonly screenMaterial: StandardMaterial;
  private readonly screens: ReturnType<typeof MeshBuilder.CreatePlane>[] = [];
  private readonly light: PointLight;
  private readonly complete;

  constructor(private readonly scene: Scene) {
    this.screenMaterial = new StandardMaterial("Arcade / reactive wall panels", scene);
    this.screenMaterial.disableLighting = true;
    this.screenMaterial.emissiveColor = Color3.FromHexString("#82ffde");
    this.screenMaterial.diffuseColor = Color3.Black();
    this.screenMaterial.backFaceCulling = false;
    const hero = cellPosition(-1, 13.95);
    const heroHeight = cameraPose(ARCADE_ENTRY.cross).position.y;
    this.heroScreen = createWorldText(scene, {
      name: "Arcade / hero portal screen", width: 13, height: 9.5,
      background: "#09131f", border: "#9bffe9",
      lines: [{ text: "DEVFEST AI4FUN", color: "#b8ffe4" },
        { text: "CLOSING KEYNOTE", color: "#ffbad9" }],
    });
    this.heroScreen.position.set(hero.x, heroHeight, hero.z - 8.3);
    this.scanlines = MeshBuilder.CreatePlane("FX/Arcade portal CRT scanlines",
      { width: 13, height: 9.5 }, scene);
    this.scanlines.position.set(hero.x, heroHeight, hero.z - 8.37);
    this.scanlines.isPickable = false;
    this.scanlineMaterial = new ShaderMaterial("Arcade / scanlines and screen glitch", scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        void main() {
          vUV = uv;
          gl_Position = worldViewProjection * vec4(position, 1.0);
        }`,
      fragmentSource: `
        precision highp float;
        varying vec2 vUV;
        uniform float time, flash, interference;
        void main() {
          float scan = 0.5 + 0.5 * sin(vUV.y * 700.0 + time * 17.0);
          float noise = fract(sin(vUV.y * 1599.0 + floor(time * 35.0) * 19.0) * 43758.5453);
          float glitch = step(0.985 - interference * 0.035, noise);
          vec3 rgb = vec3(0.2 + glitch * 0.9, 0.75 + flash * 0.3, 0.9 - glitch * 0.45);
          gl_FragColor = vec4(rgb, 0.04 + scan * 0.15 + glitch * 0.32 + flash * 0.15);
        }`,
    }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection", "time", "flash", "interference"],
      needAlphaBlending: true });
    this.scanlineMaterial.backFaceCulling = false;
    this.scanlineMaterial.disableDepthWrite = true;
    this.scanlines.material = this.scanlineMaterial;
    this.light = new PointLight("Arcade / one hero screen light",
      new Vector3(hero.x, heroHeight + 1, hero.z - 7), scene);
    this.light.diffuse = Color3.FromHexString("#7dffe3");
    this.light.range = 30;
    this.light.intensity = 0;
    const exit = routeAnchor(CINEMA.clapperAnchor);
    this.complete = createWorldText(scene, {
      name: "Arcade / level complete", width: LEVEL_COMPLETE.width, height: 4,
      background: "#101926", border: "#aaff98",
      lines: [{ text: "LEVEL COMPLETE", color: "#c5ffa4" }],
    });
    this.complete.position.set(exit.position.x, LEVEL_COMPLETE.height, exit.position.z);
    this.complete.rotation.y = exit.yaw;
    this.update(0, silentFeatures());
  }

  async prepare(): Promise<void> {
    const models = ["arcade-machine.glb", "dance-machine.glb", "pinball.glb"];
    const [templates, logoTexture] = await Promise.all([Promise.all(models.map(async (file) => {
      try {
        const loaded = await SceneLoader.ImportMeshAsync("", ROOT, file, this.scene);
        const root = loaded.meshes[0];
        if (!root) throw new Error("GLB contained no model root.");
        root.name = `Kenney / ${file} template`;
        root.setEnabled(false);
        return root;
      } catch (error) {
        console.error(`Local Kenney arcade model failed to load: ${ROOT}${file}`, error);
        return undefined;
      }
    })), loadEventArtwork(this.scene, flagUrl, "Event mascot / opening keynote flag")]);
    this.logo = createEventDecal(this.scene, "Arcade / opening DevFest logo", logoTexture, 3.8, 1);
    this.logo.parent = this.heroScreen;
    this.logo.position.set(0, 0, -.025);
    this.logo.visibility = this.heroScreen.visibility;
    const available = templates.filter((root): root is NonNullable<typeof root> => root !== undefined);
    if (!available.length) return;
    for (let index = 0; index < CABINET_COUNT; index++) {
      const side = index % 2 ? 1 : -1;
      const cell = cellPosition(-1, 12);
      const template = templates[index % templates.length] ?? available[0];
      const cabinet = template.clone(`Arcade cathedral / cabinet ${index}`, null);
      if (!cabinet) {
        console.error(`Could not clone local Kenney arcade cabinet ${index}; skipping it.`);
        continue;
      }
      cabinet.setEnabled(true);
      const size = 12 + index % 3 * 1.2;
      cabinet.scaling.setAll(size);
      cabinet.position.set(cell.x, 0, CABINET_Z[index]);
      cabinet.rotation.y = side * Math.PI / 2;
      const bounds = cabinet.getHierarchyBoundingVectors(true);
      const wallX = cell.x + side * (CELL / 2 - .75);
      const outerX = side < 0 ? bounds.min.x : bounds.max.x;
      cabinet.position.x += wallX - side * CABINET_WALL_CLEARANCE - outerX;
      this.cabinets.push(cabinet);
      this.machines.push({ cabinet: index, kind: (["arcade", "dance", "pinball"] as const)[index % 3], root: cabinet });
      const screen = MeshBuilder.CreatePlane(`FX/Arcade wall panel / ${index}`,
        { width: 2.5, height: 2.8 }, this.scene);
      screen.position.set(cell.x + side * ARCADE_WALL_PANELS.offset,
        ARCADE_WALL_PANELS.height, cabinet.position.z);
      screen.rotation.y = side * Math.PI / 2;
      screen.material = this.screenMaterial;
      screen.isPickable = false;
      this.screens.push(screen);
    }
    this.update(0, silentFeatures());
  }

  update(time: number, audio: AudioFeatures): void {
    const show = time < 49;
    for (const cabinet of this.cabinets) cabinet.setEnabled(show);
    for (const [index, screen] of this.screens.entries()) {
      screen.setEnabled(show);
      screen.scaling.setAll(1 + audio.bass * .14 + Math.sin(time * 6 + index) * .035);
    }
    this.screenMaterial.emissiveColor.set(
      .24 + audio.snare * .8, .8 + audio.energy * .35, .7 + audio.kick * .3);
    const portal = 1 - smoothstep((time - ARCADE_ENTRY.panelFadeStart)
      / (ARCADE_ENTRY.panelFadeEnd - ARCADE_ENTRY.panelFadeStart));
    this.heroScreen.visibility = portal;
    if (this.logo) this.logo.visibility = portal;
    this.scanlines.setEnabled(portal > 0);
    this.scanlineMaterial.setFloat("time", time);
    this.scanlineMaterial.setFloat("flash", audio.snare + audio.kick * .5 + (1 - portal) * .45);
    this.scanlineMaterial.setFloat("interference", 1 - portal + audio.treble * .5);
    this.light.intensity = (350 + audio.kick * 500 + audio.snare * 360) * portal;
    this.complete.visibility = cueEnvelope(time, LEVEL_COMPLETE.start, LEVEL_COMPLETE.end, .25);
  }
}
