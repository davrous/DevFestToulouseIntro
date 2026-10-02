import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { THEME_COLORS, type SpeakerConfig } from "../content/speakers";
import { cueEnvelope } from "../content/cues";
import { createWorldText, routeAnchor } from "./WorldText";
import { emissive } from "./Labyrinth";
import { BoxBatch } from "./Instances";
import type { AudioFeatures } from "../engine/AudioAnalyzer";

export class SpeakerPortal {
  readonly root: TransformNode;
  readonly nameMesh: Mesh;
  readonly titleMesh: Mesh;
  readonly frame: Mesh;
  private readonly decoration: Mesh;
  private readonly modules = new Float32Array(12 * 16);
  private readonly transform = Matrix.Identity();
  private readonly color: Color3;
  private readonly light;
  private readonly anchor;

  constructor(scene: Scene, readonly config: SpeakerConfig, index: number) {
    const accent = THEME_COLORS[config.visualTheme];
    this.color = Color3.FromHexString(accent);
    this.light = emissive(scene, `Speaker ${index + 1} ions`, accent, 1.3);
    this.root = new TransformNode(`SpeakerPortal / ${config.name}`, scene);
    this.anchor = routeAnchor(config.gateTime);
    this.root.position.set(this.anchor.position.x, 0, this.anchor.position.z);
    this.root.rotation.y = this.anchor.yaw;
    const nameHeight = Math.min(25, this.anchor.position.y + 6.5);
    this.nameMesh = createWorldText(scene, {
      name: `Speaker / ${config.name}`, width: 23, height: 4.4,
      lines: [{ text: config.name.toUpperCase(), color: "#e4fff5", size: 240 }],
      background: "#07151e", border: accent,
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
    const tag = createWorldText(scene, {
      name: `Speaker index ${index + 1}`, width: 20, height: 1.15,
      lines: [{ text: `0${index + 1} / ${["COMPILE", "BUILD", "RUN", "OVERCLOCK"][index]} / LIVE`, color: accent }],
    });
    tag.parent = this.root;
    tag.position.set(0, nameHeight + 3.4, -.15);
    if (config.visualTheme === "neural") {
      for (const [side, lines] of [
        [-1, ["agent.observe()", "agent.plan()"]],
        [1, ["await agent.act()", "world.compile()"]],
      ] as const) {
        const code = createWorldText(scene, {
          name: `Neural code / ${side}`, width: 7, height: 2.8,
          lines: lines.map((text) => ({ text, color: "#b7a0ff" })),
          background: "#101424", border: "#51476e",
        });
        code.parent = this.root;
        code.position.set(side * 8.2, 6, 2.5);
      }
    }
    const frameBatch = new BoxBatch(`FX/Speaker gate ${index + 1}`, this.light);
    frameBatch.add(-12, 15, 0, .32, 30, .5);
    frameBatch.add(12, 15, 0, .32, 30, .5);
    frameBatch.add(0, 30, 0, 24, .32, .5);
    frameBatch.add(0, .25, 0, 24, .16, .5);
    this.frame = frameBatch.build(scene);
    this.frame.unfreezeWorldMatrix();
    this.frame.parent = this.root;
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
    this.update(0, { kick: 0, bass: 0, mid: 0, treble: 0, energy: 0, beat: 0, violaEnergy: 0, snare: 0, drop: 0 });
  }

  update(time: number, audio: AudioFeatures): void {
    const envelope = cueEnvelope(time, this.config.startTime, this.config.endTime, .8);
    this.root.setEnabled(envelope > 0);
    if (envelope === 0) return;
    this.nameMesh.visibility = envelope;
    this.titleMesh.visibility = envelope;
    this.light.emissiveColor.copyFrom(this.color).scaleInPlace(1.2 + audio.kick * 1.1 + audio.snare * .7);
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
        new Vector3(side * 10.7, y, z),
        this.transform,
      );
      this.transform.copyToArray(this.modules, i * 16);
    }
    this.decoration.thinInstanceBufferUpdated("matrix");
    this.decoration.thinInstanceRefreshBoundingInfo();
  }
}
