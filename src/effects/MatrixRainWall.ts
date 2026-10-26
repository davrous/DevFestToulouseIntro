import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

export const MATRIX_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-=/<>[]{}:;?!";
export const MATRIX_SIGNATURE = "DEVFESTTOULOUSE";
export const MATRIX_WALL = { width: 12, height: 20, offsetX: 14.4, centerY: 11, columns: 30, rows: 32, inset: 2.2 } as const;

const signatureShader = [...MATRIX_SIGNATURE].map((letter, index) =>
  `if (letter < ${index + .5}) return ${MATRIX_GLYPHS.indexOf(letter)}.0;`).join("\n");

export class MatrixRainWall {
  readonly mesh;
  readonly material: ShaderMaterial;

  constructor(scene: Scene, parent: TransformNode, depth: number) {
    const atlas = new DynamicTexture("Matrix wall / readable ASCII glyph atlas", { width: 512, height: 512 },
      scene, false, Texture.NEAREST_SAMPLINGMODE);
    atlas.hasAlpha = true;
    const ctx = atlas.getContext();
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px Consolas, monospace";
    for (const [index, glyph] of [...MATRIX_GLYPHS].entries()) {
      const x = index % 8 * 64 + (64 - ctx.measureText(glyph).width) / 2;
      ctx.fillText(glyph, x, Math.floor(index / 8) * 64 + 49);
    }
    atlas.update();
    this.mesh = MeshBuilder.CreatePlane("FX/Matrix / snack wall code rain",
      { width: MATRIX_WALL.width, height: MATRIX_WALL.height }, scene);
    this.mesh.parent = parent;
    this.mesh.position.copyFrom(new Vector3(MATRIX_WALL.offsetX, MATRIX_WALL.centerY, depth - MATRIX_WALL.inset));
    this.mesh.isPickable = false;
    this.material = new ShaderMaterial("Matrix wall / hidden DevFest Toulouse rain", scene, {
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
        uniform sampler2D glyphAtlas;
        uniform float time;

        float hash(vec2 cell) { return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453); }
        float signatureGlyph(float letter) {
          ${signatureShader}
          return 0.0;
        }

        void main() {
          vec2 grid = vec2(${MATRIX_WALL.columns}.0, ${MATRIX_WALL.rows}.0);
          vec2 cell = floor(vUV * grid);
          vec2 local = fract(vUV * grid);
          float seed = hash(vec2(cell.x, 7.0));
          float speed = 3.0 + seed * 4.0;
          float head = mod(grid.y - time * speed + seed * 47.0, grid.y);
          float distance = mod(cell.y - head + grid.y, grid.y);
          float rain = (1.0 - smoothstep(0.0, 11.0, distance)) * (.35 + seed * .65);
          float glyph = floor(hash(cell + vec2(0.0, floor(time * 7.0))) * ${MATRIX_GLYPHS.length}.0);
          bool firstWord = cell.y == 14.0 && cell.x >= 5.0 && cell.x < 12.0;
          bool secondWord = cell.y == 10.0 && cell.x >= 16.0 && cell.x < 24.0;
          if (firstWord) glyph = signatureGlyph(cell.x - 5.0);
          if (secondWord) glyph = signatureGlyph(7.0 + cell.x - 16.0);
          vec2 tile = vec2(mod(glyph, 8.0), floor(glyph / 8.0));
          vec2 atlasUV = vec2((tile.x + local.x) / 8.0, 1.0 - (tile.y + 1.0 - local.y) / 8.0);
          float ink = texture2D(glyphAtlas, atlasUV).a;
          float leader = 1.0 - smoothstep(0.0, 1.4, distance);
          vec3 color = mix(vec3(.03, .9, .32), vec3(.74, 1.0, .86), leader);
          float edge = smoothstep(0.0, .04, vUV.x) * (1.0 - smoothstep(.96, 1.0, vUV.x));
          color = vec3(.004, .018, .012) + color * ink * (.035 + rain * 1.2) * edge;
          gl_FragColor = vec4(color, 1.0);
        }`,
    }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection", "time"], samplers: ["glyphAtlas"] });
    this.material.setTexture("glyphAtlas", atlas);
    this.material.setFloat("time", 0);
    this.mesh.material = this.material;
  }

  update(time: number): void {
    if (!Number.isFinite(time)) throw new RangeError("Matrix wall time must be finite.");
    this.material.setFloat("time", time);
  }
}
