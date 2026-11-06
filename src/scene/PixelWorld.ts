import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Material } from "@babylonjs/core/Materials/material";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import { routeAnchor } from "../camera/CameraPath";
import { cellPosition } from "../content/title";
import { cueEnvelope } from "../content/cues";
import { emissive } from "./Labyrinth";
import { createWorldText } from "./WorldText";

export const RUNNER_COUNT = 12;
export const SCENERY_COUNT = 6;

function pixelTexture(scene: Scene, name: string, url: string): { texture: Texture; loaded: Promise<boolean> } {
  let resolveLoaded!: (loaded: boolean) => void;
  const loaded = new Promise<boolean>((resolve) => { resolveLoaded = resolve; });
  const texture = new Texture(url, scene, false, false, Texture.NEAREST_SAMPLINGMODE,
    () => resolveLoaded(true),
    (message, exception) => {
      console.error(`Local Kenney asset failed to load: ${url}: ${message}`, exception);
      resolveLoaded(false);
    });
  texture.name = name;
  texture.hasAlpha = true;
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  return { texture, loaded };
}

function spriteMaterial(scene: Scene, name: string, texture: Texture): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.disableLighting = true;
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.emissiveColor = new Color3(.85, .9, 1);
  material.useAlphaFromDiffuseTexture = true;
  material.transparencyMode = Material.MATERIAL_ALPHATEST;
  material.backFaceCulling = false;
  return material;
}

function tileUV(mesh: Mesh, original: number[], column: number, row: number,
  tile: number, step: number, width: number, height: number): void {
  const left = (column * step + .12) / width;
  const top = (row * step + .12) / height;
  const right = (column * step + tile - .12) / width;
  const bottom = (row * step + tile - .12) / height;
  mesh.setVerticesData(VertexBuffer.UVKind, original.map((value, index) =>
    index % 2 === 0 ? left + value * (right - left) : top + value * (bottom - top)), true);
}

export class PixelWorld {
  private readonly sprites: Mesh[] = [];
  private readonly backgrounds: Mesh[] = [];
  private readonly prompts: Mesh[] = [];
  private readonly platforms: Mesh[] = [];
  private readonly projectile: Mesh;
  private readonly hit: Mesh;
  private readonly life: Mesh;
  private readonly ready: Promise<boolean[]>;
  private readonly characterMaterial: StandardMaterial;
  private readonly terrainMaterial: StandardMaterial;

  constructor(scene: Scene) {
    const characters = pixelTexture(scene, "Kenney / animated character atlas",
      "/assets/kenney/characters/pixel-platformer-characters.png");
    const terrain = pixelTexture(scene, "Kenney / pixel platformer tilemap",
      "/assets/kenney/pixel/pixel-platformer-tilemap.png");
    const loaded = [characters.loaded, terrain.loaded];
    this.characterMaterial = spriteMaterial(scene, "Arcade / parallax runners", characters.texture);
    this.terrainMaterial = spriteMaterial(scene, "Arcade / layered pixel scenery", terrain.texture);
    for (let index = 0; index < RUNNER_COUNT; index++) {
      const side = index % 2 ? 1 : -1;
      const layer = Math.floor(index / 2) % 3;
      const mesh = MeshBuilder.CreatePlane(`Arcade / running pixel character ${index}`,
        { width: 3.2 + layer * 1.4, height: 3.2 + layer * 1.4 }, scene);
      mesh.material = this.characterMaterial;
      mesh.rotation.y = side * Math.PI / 2;
      mesh.isPickable = false;
      const uvs = Array.from(mesh.getVerticesData(VertexBuffer.UVKind)!);
      // This atlas contains distinct characters, not frames of a walk cycle.
      tileUV(mesh, uvs, index % 9, (index + layer) % 3, 24, 25, 224, 74);
      mesh.position.set(cellPosition(-1, 12).x + side * 12.9,
        12 + index % 4 * 2.2, cellPosition(-1, 14.4 - Math.floor(index / 2) * .85).z);
      this.sprites.push(mesh);
    }
    for (let index = 0; index < SCENERY_COUNT; index++) {
      const side = index % 2 ? 1 : -1;
      const layer = Math.floor(index / 2) % 3;
      const mesh = MeshBuilder.CreatePlane(`Arcade / pixel landscape ${index}`,
        { width: 7 + layer * 2, height: 7 + layer * 2 }, scene);
      mesh.material = this.terrainMaterial;
      mesh.rotation.y = side * Math.PI / 2;
      mesh.isPickable = false;
      const uvs = Array.from(mesh.getVerticesData(VertexBuffer.UVKind)!);
      tileUV(mesh, uvs, 2 + index % 5, 1 + layer, 18, 19, 379, 170);
      mesh.position.set(cellPosition(-1, 12).x + side * 13.15,
        15 + layer * 4, cellPosition(-1, 14.2 - Math.floor(index / 2) * 2).z);
      this.backgrounds.push(mesh);
    }
    const keys = ["key-w.png", "key-a.png", "key-s.png", "key-d.png"];
    keys.forEach((file, index) => {
      const icon = pixelTexture(scene, `Kenney / ${file}`, `/assets/kenney/input/${file}`);
      loaded.push(icon.loaded);
      const mesh = MeshBuilder.CreatePlane(`Arcade / floating input ${index}`, { size: 3.1 }, scene);
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      mesh.material = spriteMaterial(scene, `Arcade / input prompt ${index}`, icon.texture);
      mesh.isPickable = false;
      this.prompts.push(mesh);
    });
    this.ready = Promise.all(loaded);
    const platformMaterial = emissive(scene, "Arcade / playable ledges", "#b3fe86", 1.15);
    for (let index = 0; index < 6; index++) {
      const anchor = routeAnchor(34 + Math.floor(index / 3) * 3.5);
      const lane = index % 3 - 1;
      const mesh = MeshBuilder.CreateBox(`Arcade / live platform ${index}`,
        { width: 2.4, height: .3, depth: 4.8 }, scene);
      const offset = new Vector3(Math.cos(anchor.yaw) * (lane < 0 ? -9 : lane > 0 ? 9 : -6),
        0, -Math.sin(anchor.yaw) * (lane < 0 ? -9 : lane > 0 ? 9 : -6));
      mesh.position.copyFrom(anchor.position).addInPlace(offset);
      mesh.position.y = 3 + (index % 5) * 3.2;
      mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(anchor.yaw, 0, 0);
      mesh.material = platformMaterial;
      mesh.isPickable = false;
      this.platforms.push(mesh);
    }
    this.projectile = MeshBuilder.CreateSphere("Arcade / close call projectile",
      { diameter: 1.15, segments: 8 }, scene);
    this.projectile.material = emissive(scene, "Arcade / projectile flare", "#ff9b7e", 2);
    this.projectile.isPickable = false;
    const anchor = routeAnchor(35.5);
    this.hit = createWorldText(scene, {
      name: "Arcade / PLAYER 1 HIT", width: 15, height: 3,
      background: "#241728", border: "#ff7996", lines: [{ text: "PLAYER 1 HIT", color: "#ffb5a3" }],
    });
    this.hit.position.set(anchor.position.x, 19, anchor.position.z + 2);
    this.hit.rotation.y = anchor.yaw;
    this.life = createWorldText(scene, {
      name: "Arcade / EXTRA LIFE", width: 15, height: 3,
      background: "#152522", border: "#a5ff90", lines: [{ text: "EXTRA LIFE  +1", color: "#b7ffb2" }],
    });
    this.life.position.copyFrom(this.hit.position);
    this.life.rotation.y = anchor.yaw;
    this.update(0, silentFeatures());
  }

  async prepare(): Promise<void> {
    const [characters, terrain, ...keys] = await this.ready;
    if (!characters) this.sprites.forEach((mesh) => mesh.dispose());
    if (!terrain) this.backgrounds.forEach((mesh) => mesh.dispose());
    keys.forEach((loaded, index) => { if (!loaded) this.prompts[index].dispose(); });
  }

  update(time: number, audio: AudioFeatures): void {
    const stem = time >= 5 && time < 33;
    for (const mesh of [...this.sprites, ...this.backgrounds]) {
      if (mesh.isDisposed()) continue;
      mesh.setEnabled(stem);
    }
    this.prompts.forEach((mesh, index) => {
      if (mesh.isDisposed()) return;
      mesh.setEnabled(time < 17);
      const p = routeAnchor(6.3 + index * .8).position;
      mesh.position.set(p.x + (index % 2 ? 8 : -8),
        17 + Math.sin(time * 2 + index) * 1.2, p.z + 2);
    });
    this.platforms.forEach((mesh, index) => {
      mesh.setEnabled(time >= 32 && time < 43.5);
      mesh.scaling.y = 1 + audio.bass * .22 + audio.kick * .12;
      mesh.position.y = 3 + (index % 5) * 3.2 + Math.sin(time * 2 + index) * .7;
    });
    this.projectile.setEnabled(time >= 34.6 && time < 35.6);
    if (this.projectile.isEnabled()) {
      const anchor = routeAnchor(time + 1.2);
      const cross = (time - 34.6) / 1;
      this.projectile.position.set(anchor.position.x + Math.cos(anchor.yaw) * (-9 + cross * 18),
        anchor.position.y + 2.5,
        anchor.position.z - Math.sin(anchor.yaw) * (-9 + cross * 18));
    }
    this.hit.visibility = cueEnvelope(time, 34.7, 35.35, .18);
    this.life.visibility = cueEnvelope(time, 35.35, 36.9, .25);
  }
}
