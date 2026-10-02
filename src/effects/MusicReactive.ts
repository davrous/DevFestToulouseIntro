import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import { CELL, SEED, createTitleCells, seededRandom, cellPosition } from "../content/title";
import { smoothstep } from "../engine/Timeline";
import type { AudioFeatures } from "../engine/AudioAnalyzer";

export class MusicReactive {
  readonly particles: Mesh;
  private readonly particlesMaterial: ShaderMaterial;
  private readonly canalMaterial: ShaderMaterial;
  private readonly canal: Mesh;

  constructor(scene: Scene) {
    this.particles = new Mesh("FX/Deterministic data particles", scene);
    const random = seededRandom(`${SEED}/FLOW`);
    const cells = createTitleCells();
    const positions: number[] = [];
    const colors: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const cell = cells[Math.floor(random() * cells.length)];
      positions.push(cell.x + (random() - .5) * (CELL - 5), 3 + random() * 26, cell.z + (random() - .5) * (CELL - 5));
      colors.push(random(), random(), random(), 1);
    }
    const data = new VertexData();
    data.positions = positions;
    data.colors = colors;
    data.indices = Array.from({ length: 2000 }, (_, i) => i);
    data.applyToMesh(this.particles);
    this.particles.isPickable = false;
    this.particles.alwaysSelectAsActiveMesh = true;
    this.particlesMaterial = new ShaderMaterial("Data particle shader", scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec4 color;
        uniform mat4 worldViewProjection;
        uniform float time, reveal, energy, treble, viola;
        varying float opacity;
        varying vec3 tint;
        void main() {
          vec3 p = position;
          p.y = mix(3.0 + mod(position.y + time * (0.45 + energy), 26.0),
                    38.0 + sin(position.x * 0.08 + time * 1.3 + color.x * 6.28) * (1.0 + viola * 2.0), reveal);
          p.x += sin(time * 0.35 + color.x * 15.0) * (0.35 + viola);
          gl_Position = worldViewProjection * vec4(p, 1.0);
          gl_PointSize = 1.6 + color.y * 1.8 + treble * 2.8;
          opacity = 0.4 + 0.4 * sin(time + color.z * 6.28);
          tint = mix(vec3(0.35, 0.9, 0.8), vec3(1.0, 0.65, 0.4), color.x);
        }`,
      fragmentSource: `
        precision highp float;
        varying float opacity;
        varying vec3 tint;
        uniform float visibility;
        void main() {
          float radius = length(gl_PointCoord - 0.5);
          if (radius > 0.5) discard;
          gl_FragColor = vec4(tint, (1.0 - smoothstep(0.12, 0.5, radius)) * opacity * visibility);
        }`,
    }, { attributes: ["position", "color"], uniforms: ["worldViewProjection", "time", "reveal", "energy", "treble", "viola", "visibility"], needAlphaBlending: true });
    this.particlesMaterial.pointsCloud = true;
    this.particlesMaterial.disableDepthWrite = true;
    this.particles.material = this.particlesMaterial;

    this.canal = MeshBuilder.CreateGround("CANAL DU MIDI / flowing data bus", { width: 5, height: 147 }, scene);
    const anchor = cellPosition(.38, 3);
    this.canal.position.set(anchor.x, .22, anchor.z);
    this.canalMaterial = new ShaderMaterial("MIDI ribbon shader", scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`,
      fragmentSource: `
        precision highp float;
        varying vec2 vUV;
        uniform float time, energy, viola, opacity;
        uniform vec3 tint;
        void main() {
          float lane = abs(sin(vUV.x * 50.265));
          float packet = pow(max(0.0, sin(vUV.y * 95.0 - time * 3.4 + floor(vUV.x * 16.0))), 14.0);
          float wave = exp(-pow((vUV.x - 0.5 - sin(vUV.y * 18.0 - time) * 0.2) * 9.0, 2.0));
          float edge = smoothstep(0.0, 0.06, vUV.x) * smoothstep(0.0, 0.06, 1.0 - vUV.x);
          vec3 light = tint * (0.1 + packet * (0.7 + energy) + wave * (0.15 + viola));
          gl_FragColor = vec4(light, edge * (0.24 + lane * 0.42) * opacity);
        }`,
    }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection", "time", "energy", "viola", "opacity", "tint"], needAlphaBlending: true });
    this.canalMaterial.disableDepthWrite = true;
    this.canalMaterial.setColor3("tint", new Color3(.2, 1, .83));
    this.canal.material = this.canalMaterial;
    this.canal.isPickable = false;
  }

  update(time: number, audio: AudioFeatures): void {
    const calm = 1 - smoothstep((time - 155) / 23);
    const reveal = smoothstep((time - 163) / 9);
    const animationTime = Math.min(time, 177);
    this.particlesMaterial.setFloat("time", animationTime);
    this.particlesMaterial.setFloat("reveal", reveal);
    this.particlesMaterial.setFloat("energy", audio.energy * calm);
    this.particlesMaterial.setFloat("treble", audio.treble * calm);
    this.particlesMaterial.setFloat("viola", audio.violaEnergy * calm);
    this.particlesMaterial.setFloat("visibility", (.3 + smoothstep(time / 70) * .7) * (1 - .7 * smoothstep((time - 175) / 3)));
    this.canalMaterial.setFloat("time", animationTime);
    this.canalMaterial.setFloat("energy", audio.energy * calm);
    this.canalMaterial.setFloat("viola", audio.violaEnergy * calm);
    this.canalMaterial.setFloat("opacity", smoothstep(time / 20) * (1 - reveal));
  }
}
