import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { cellPosition, CELL } from "../content/title";
import { cueEnvelope } from "../content/cues";
import type { AudioFeatures } from "../engine/AudioAnalyzer";

export const WALL_METER_BANKS = [
  { col: -1, row: 9, face: "north", start: -2, end: 38 },
  { col: 0, row: 0, face: "north", start: 61, end: 112 },
  { col: 3, row: 0, face: "east", start: 91, end: 133 },
  { col: 4, row: 5, face: "south", start: 126, end: 151 },
  { col: 2, row: 6, face: "north", start: 143, end: 159 },
] as const;

export function wallMeterLevels(audio: AudioFeatures): [number, number, number] {
  return [audio.bass, Math.max(audio.mid, audio.violaEnergy), Math.max(audio.treble, audio.violaEnergy * .6)];
}

export function wallMeterVisibility(time: number, bank: typeof WALL_METER_BANKS[number]): number {
  return cueEnvelope(time, bank.start, bank.end, 2);
}

export class WallMeters {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  constructor(scene: Scene) {
    this.mesh = new Mesh("FX/Three-band corridor wall meters", scene);
    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    for (const bank of WALL_METER_BANKS) {
      const cell = cellPosition(bank.col, bank.row);
      for (let lane = 0; lane < 3; lane++) {
        const along = [-7.3, -.63, 6.03][lane];
        const center = bank.face === "east"
          ? { x: cell.x + CELL / 2 - 1.7, z: cell.z + along }
          : { x: cell.x + along, z: cell.z + (bank.face === "north" ? 1 : -1) * (CELL / 2 - 1.7) };
        const first = positions.length / 3;
        for (const [x, y, u, v] of [[-1.7, -6.5, 0, 0], [1.7, -6.5, 1, 0],
          [1.7, 6.5, 1, 1], [-1.7, 6.5, 0, 1]]) {
          positions.push(center.x + (bank.face === "east" ? 0 : x), 15 + y,
            center.z + (bank.face === "east" ? x : 0));
          uvs.push(u, v);
          colors.push(lane / 2, bank.start / 180, bank.end / 180, 1);
        }
        indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
      }
    }
    const data = new VertexData();
    data.positions = positions;
    data.uvs = uvs;
    data.colors = colors;
    data.indices = indices;
    data.applyToMesh(this.mesh);
    this.mesh.isPickable = false;
    this.material = new ShaderMaterial("Three-band wall spectrum", scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        attribute vec4 color;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        varying vec3 code;
        void main() {
          vUV = uv;
          code = color.rgb;
          gl_Position = worldViewProjection * vec4(position, 1.0);
        }`,
      fragmentSource: `
        precision highp float;
        varying vec2 vUV;
        varying vec3 code;
        uniform float time, bass, body, air;
        void main() {
          float start = code.g * 180.0;
          float end = code.b * 180.0;
          float appear = smoothstep(start, start + 2.0, time)
            * (1.0 - smoothstep(end - 2.0, end, time));
          float level = code.r < 0.25 ? bass : (code.r < 0.75 ? body : air);
          float idle = 0.22 + 0.08 * (0.5 + 0.5 * sin(time * 4.0 + code.r * 5.0));
          float lit = 1.0 - smoothstep(idle + level * 0.78 - 0.025,
            idle + level * 0.78 + 0.025, floor(vUV.y * 14.0) / 14.0);
          float gap = smoothstep(0.09, 0.18, fract(vUV.y * 14.0))
            * (1.0 - smoothstep(0.83, 0.92, fract(vUV.y * 14.0)));
          float edge = smoothstep(0.04, 0.18, vUV.x) * (1.0 - smoothstep(0.82, 0.96, vUV.x));
          vec3 tint = code.r < 0.25 ? vec3(0.25, 0.95, 0.86)
            : (code.r < 0.75 ? vec3(0.75, 0.61, 1.0) : vec3(1.0, 0.69, 0.43));
          gl_FragColor = vec4(tint * (0.65 + lit * 1.25),
            appear * edge * gap * (0.08 + lit * 0.85));
        }`,
    }, { attributes: ["position", "uv", "color"], uniforms: ["worldViewProjection", "time", "bass", "body", "air"], needAlphaBlending: true });
    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;
    this.mesh.material = this.material;
  }

  update(time: number, audio: AudioFeatures): void {
    this.mesh.setEnabled(WALL_METER_BANKS.some((bank) => wallMeterVisibility(time, bank) > 0));
    const [bass, body, air] = wallMeterLevels(audio);
    this.material.setFloat("time", time);
    this.material.setFloat("bass", bass);
    this.material.setFloat("body", body);
    this.material.setFloat("air", air);
  }
}
