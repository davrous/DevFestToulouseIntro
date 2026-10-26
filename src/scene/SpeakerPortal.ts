import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { THEME_COLORS, type SpeakerConfig } from "../content/speakers";
import { smoothstep } from "../engine/Timeline";
import { createWorldText, routeAnchor } from "./WorldText";
import { emissive } from "./Labyrinth";
import { BoxBatch } from "./Instances";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import { PortalLasers, laserReach, laserStrength, speakerReveal } from "../effects/ShowLighting";

export class SpeakerPortal {
  readonly root: TransformNode;
  readonly nameMesh: Mesh;
  readonly titleMesh: Mesh;
  readonly frame: Mesh;
  private readonly backplate: Mesh;
  private readonly textMaterials: StandardMaterial[] = [];
  private readonly decoration: Mesh;
  private readonly modules = new Float32Array(12 * 16);
  private readonly transform = Matrix.Identity();
  private readonly color: Color3;
  private readonly light;
  private readonly anchor;
  private readonly lasers: PortalLasers;
  private readonly tag: Mesh;
  private readonly overclockRings: Mesh[] = [];

  constructor(scene: Scene, readonly config: SpeakerConfig, index: number) {
    const accent = THEME_COLORS[config.visualTheme];
    this.color = Color3.FromHexString(accent);
    this.light = emissive(scene, `Speaker ${index + 1} ions`, accent, 1.3);
    this.root = new TransformNode(`SpeakerPortal / ${config.name}`, scene);
    this.anchor = routeAnchor(config.gateTime, config.lateralOffset);
    this.root.position.set(this.anchor.position.x, 0, this.anchor.position.z);
    this.root.rotation.y = this.anchor.yaw;
    const nameHeight = Math.min(25, this.anchor.position.y + 6.5);
    const gateWidth = config.gateWidth ?? 24;
    this.nameMesh = createWorldText(scene, {
      name: `Speaker / ${config.name}`, width: gateWidth - 1, height: 4.4,
      lines: [{ text: config.name.toUpperCase(), color: "#e4fff5", size: 240 }],
      background: config.visualTheme === "overclock" ? undefined : "#07151e",
      border: config.visualTheme === "overclock" ? undefined : accent,
    });
    this.nameMesh.parent = this.root;
    this.nameMesh.position.set(0, nameHeight, -.12);
    this.titleMesh = createWorldText(scene, {
      name: `Demo / ${config.demoTitle}`, width: 19, height: 1.9,
      lines: [{ text: config.demoTitle, color: accent, size: 160 }],
      background: "#07151e",
    });
    this.titleMesh.parent = this.root;
    this.titleMesh.position.set(0, nameHeight - 3.5, -.15);
    for (const panel of [this.nameMesh, this.titleMesh]) {
      if (!(panel.material instanceof StandardMaterial)) throw new Error("Speaker typography requires a StandardMaterial.");
      panel.material.disableLighting = false;
      panel.material.maxSimultaneousLights = 5;
      panel.material.emissiveColor.set(.28, .3, .32);
      panel.material.diffuseColor.set(.8, .8, .8);
      this.textMaterials.push(panel.material);
    }
    const plateMaterial = new PBRMaterial(`Speaker ${index + 1} illuminated backplate`, scene);
    plateMaterial.albedoColor = this.color.scale(.4);
    plateMaterial.emissiveColor = this.color.scale(.02);
    plateMaterial.metallic = .28;
    plateMaterial.roughness = .55;
    this.backplate = MeshBuilder.CreatePlane(`Speaker ${index + 1} lit card border`,
      { width: gateWidth + 1.2, height: 6.2 }, scene);
    this.backplate.parent = this.root;
    this.backplate.position.set(0, nameHeight, -.07);
    this.backplate.material = plateMaterial;
    this.backplate.isPickable = false;
    this.tag = createWorldText(scene, {
      name: `Speaker index ${index + 1}`, width: 20, height: 1.15,
      lines: [{ text: `0${index + 1} / ${["COMPILE", "BUILD", "RUN", "OVERCLOCK"][index]} / LIVE`, color: accent }],
    });
    this.tag.parent = this.root;
    this.tag.position.set(0, nameHeight + 3.4, -.15);
    const frameBatch = new BoxBatch(`FX/Speaker gate ${index + 1}`, this.light);
    frameBatch.add(-gateWidth / 2, 15, 0, .32, 30, .5);
    frameBatch.add(gateWidth / 2, 15, 0, .32, 30, .5);
    frameBatch.add(0, 30, 0, gateWidth, .32, .5);
    frameBatch.add(0, .25, 0, gateWidth, .16, .5);
    this.frame = frameBatch.build(scene);
    this.frame.unfreezeWorldMatrix();
    this.frame.parent = this.root;
    if (config.visualTheme === "overclock") {
      for (const [index, diameter] of [17, 11].entries()) {
        const ring = MeshBuilder.CreateTorus(`FX/Speaker overclock orbit ${index}`,
          { diameter, thickness: .17, tessellation: 64 }, scene);
        ring.parent = this.root;
        ring.position.set(0, nameHeight, .9 + index * .35);
        ring.rotation.x = Math.PI / 2;
        ring.material = emissive(scene, `Speaker overclock orbital light ${index}`,
          index ? "#a6ffe0" : accent, index ? .8 : 1.05);
        ring.isPickable = false;
        this.overclockRings.push(ring);
      }
    }
    const metal = new PBRMaterial(`Speaker ${index + 1} satellites`, scene);
    metal.albedoColor = this.color.scale(.35);
    metal.emissiveColor = this.color.scale(.15);
    metal.metallic = .6;
    metal.roughness = .3;
    this.decoration = MeshBuilder.CreateBox(`Speaker satellites ${index + 1}`, { size: 1 }, scene);
    this.decoration.material = metal;
    this.decoration.parent = this.root;
    this.decoration.isPickable = false;
    this.decoration.thinInstanceSetBuffer("matrix", this.modules, 16, false);
    this.lasers = new PortalLasers(scene, this.root, config);
    this.update(0, silentFeatures());
  }

  update(time: number, audio: AudioFeatures): void {
    const laser = laserStrength(time, this.config, audio);
    const reveal = speakerReveal(time, this.config);
    this.root.setEnabled(laser > 0 || reveal > 0);
    if (!this.root.isEnabled()) return;
    this.nameMesh.visibility = reveal;
    this.titleMesh.visibility = smoothstep((time - this.config.startTime - .65) / 1.7) * reveal;
    this.tag.visibility = reveal;
    this.backplate.visibility = Math.min(1, laser * 1.3) * laserReach(time, this.config)
      * (this.config.visualTheme === "overclock" ? .16 : 1);
    for (const material of this.textMaterials) {
      material.emissiveColor.set(.14 + laser * .45, .16 + laser * .48, .18 + laser * .5);
    }
    this.light.emissiveColor.copyFrom(this.color).scaleInPlace((.35 + reveal * .85) * (1 + audio.kick * .8 + audio.snare * .5));
    this.lasers.update(time, audio);
    this.frame.visibility = this.config.visualTheme === "overclock" ? 0 : this.backplate.visibility;
    this.decoration.visibility = reveal;
    this.frame.scaling.x = 1 + audio.bass * .006;
    const phase = time - this.config.startTime;
    const glitch = phase < .35 ? Math.sin(phase * 100) * .035 : 0;
    this.nameMesh.position.x = glitch;
    for (let i = 0; i < 12; i++) {
      const side = i < 6 ? -1 : 1;
      const j = i % 6;
      let y = 3 + j * 4.4;
      let z = 1.8;
      let spin = .1 * time + i;
      if (this.config.visualTheme === "signal") y += Math.sin(time * .7 + j) * .8;
      if (this.config.visualTheme === "neural") { y += Math.sin(time + j) * 1.2; z += Math.cos(time * .4 + j) * 1.4; }
      if (this.config.visualTheme === "playground") spin = time * .5 + j * .7;
      if (this.config.visualTheme === "overclock") { z += Math.sin(time * 2 + j) * 1.6; spin = time + j; }
      Matrix.ComposeToRef(
        new Vector3(.9, 1.5 + audio.energy * .3, .9),
        Quaternion.RotationYawPitchRoll(spin, spin * .3, 0),
        new Vector3(side * ((this.config.gateWidth ?? 24) / 2 - 1.3), y, z),
        this.transform,
      );
      this.transform.copyToArray(this.modules, i * 16);
    }
    this.decoration.thinInstanceBufferUpdated("matrix");
    this.overclockRings.forEach((ring, index) => {
      ring.visibility = reveal;
      ring.rotation.z = (index ? -1 : 1) * time * .22;
      ring.scaling.setAll(1 + audio.bass * .018 + audio.drop * .07);
    });
    this.decoration.thinInstanceRefreshBoundingInfo();
  }
}
