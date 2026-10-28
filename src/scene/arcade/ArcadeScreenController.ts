import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Vector2 } from "@babylonjs/core/Maths/math.vector";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { ArcadeMedia } from "./ArcadeMediaManager";
import type { ArcadeSettings, CabinetKind } from "./config";

export const CABINET_SCREENS = {
  arcade: { width: .3, bottom: .3316, top: .5092, bottomZ: .118, topZ: .0588 },
  dance: { width: .6, bottom: .35, top: .6007, bottomZ: -.2957, topZ: -.2957 },
};

export function screenAspect(kind: Exclude<CabinetKind, "pinball">): number {
  const screen = CABINET_SCREENS[kind];
  return screen.width / Math.hypot(screen.top - screen.bottom, screen.topZ - screen.bottomZ);
}

export function createDisplayQuad(scene: Scene, name: string, parent: TransformNode,
  width: number, bottom: number, top: number, bottomZ: number, topZ: number): Mesh {
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = [width / 2, bottom, bottomZ, -width / 2, bottom, bottomZ,
    -width / 2, top, topZ, width / 2, top, topZ];
  data.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
  data.indices = [0, 1, 2, 0, 2, 3];
  data.normals = [];
  VertexData.ComputeNormals(data.positions, data.indices, data.normals);
  data.applyToMesh(mesh);
  mesh.parent = parent;
  mesh.isPickable = false;
  return mesh;
}

export class ArcadeScreenController {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  private readonly fit = new Vector2(1, 1);

  constructor(scene: Scene, readonly cabinet: number, parent: TransformNode,
    readonly kind: Exclude<CabinetKind, "pinball">, public media: ArcadeMedia) {
    const surface = CABINET_SCREENS[kind];
    this.mesh = createDisplayQuad(scene, `Arcade gameplay / cabinet ${cabinet}`, parent,
      surface.width - .002, surface.bottom + .001, surface.top - .001, surface.bottomZ + .0008, surface.topZ + .0008);
    this.material = new ShaderMaterial(`Arcade monitor CRT / ${cabinet}`, scene, {
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
        uniform sampler2D gameplay;
        uniform vec2 fit;
        uniform float time, brightness, scanlines, crt, rows;
        void main() {
          vec2 centered = (vUV - 0.5) * 2.0;
          vec2 uv = centered * (1.0 + crt * 0.008 * dot(centered, centered));
          uv = uv / fit * 0.5 + 0.5;
          if (min(uv.x, uv.y) < 0.0 || max(uv.x, uv.y) > 1.0) {
            gl_FragColor = vec4(0.002, 0.003, 0.004, 1.0); return;
          }
          vec3 color = texture2D(gameplay, uv).rgb;
          float scan = 1.0 - crt * scanlines * (0.5 + 0.5 * cos(uv.y * rows * 3.14159265));
          float vignette = 1.0 - crt * 0.045 * dot(centered, centered);
          float flicker = 1.0 + crt * 0.003 * sin(time * 83.0);
          gl_FragColor = vec4(color * brightness * scan * vignette * flicker, 1.0);
        }`,
    }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection", "fit", "time", "brightness", "scanlines", "crt", "rows"],
      samplers: ["gameplay"] });
    this.material.backFaceCulling = false;
    this.mesh.material = this.material;
  }

  update(time: number, settings: ArcadeSettings): void {
    this.mesh.setEnabled(settings.enableArcadeVideoScreens);
    this.mesh.showBoundingBox = settings.screenBounds;
    const aspect = (this.media.video.videoWidth || 4) / (this.media.video.videoHeight || 3);
    const displayAspect = screenAspect(this.kind);
    this.fit.set(Math.min(1, aspect / displayAspect), Math.min(1, displayAspect / aspect));
    this.material.setTexture("gameplay", !this.media.error && this.media.texture?.isReady() ? this.media.texture : this.media.poster);
    this.material.setVector2("fit", this.fit);
    this.material.setFloat("time", time);
    this.material.setFloat("brightness", settings.videoBrightness);
    this.material.setFloat("scanlines", settings.scanlineStrength);
    this.material.setFloat("crt", settings.enableArcadeCrtEffect ? 1 : 0);
    this.material.setFloat("rows", this.media.video.videoHeight || 240);
  }
}
