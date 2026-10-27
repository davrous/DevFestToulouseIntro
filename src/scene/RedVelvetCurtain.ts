import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { clamp } from "../engine/Timeline";

export const VELVET_CURTAIN = { halfWidth: 13.2, height: 32.1, hem: .25, gather: .92 } as const;

export function curtainInnerEdge(open: number): number {
  if (!Number.isFinite(open)) throw new RangeError("Curtain opening must be finite.");
  return VELVET_CURTAIN.halfWidth * VELVET_CURTAIN.gather * clamp(open);
}

export class RedVelvetCurtain {
  readonly root: TransformNode;
  readonly panels: Mesh[] = [];
  private readonly materials: ShaderMaterial[] = [];

  constructor(scene: Scene, parent: TransformNode, x: number, z: number) {
    this.root = new TransformNode("Arcade / grand red velvet exit curtain", scene);
    this.root.parent = parent;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = Math.PI / 2;
    for (const side of [-1, 1]) {
      const mesh = new Mesh(`Arcade / red velvet curtain ${side}`, scene);
      mesh.parent = this.root;
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      const columns = 96, rows = 32;
      for (let row = 0; row <= rows; row++) {
        for (let column = 0; column <= columns; column++) {
          positions.push(side * column / columns * VELVET_CURTAIN.halfWidth,
            VELVET_CURTAIN.hem + row / rows * VELVET_CURTAIN.height, 0);
          uvs.push(column / columns, row / rows);
          if (row && column < columns) {
            const at = row * (columns + 1) + column, before = at - columns - 1;
            indices.push(before, at, before + 1, before + 1, at, at + 1);
          }
        }
      }
      const data = new VertexData();
      data.positions = positions; data.uvs = uvs; data.indices = indices; data.applyToMesh(mesh);
      const material = new ShaderMaterial(`Arcade / rich red velvet ${side}`, scene, {
        vertexSource: `
          precision highp float;
          attribute vec3 position;
          attribute vec2 uv;
          uniform mat4 worldViewProjection;
          uniform float time,opening,side;
          varying vec2 vUV;
          void main() {
            vUV=uv;
            vec3 p=position;
            p.x=side*${VELVET_CURTAIN.halfWidth}*(1.0-(1.0-uv.x)*(1.0-opening*${VELVET_CURTAIN.gather}));
            p.z=(.24+opening*.22)*cos(uv.x*75.3982237)
              +sin(uv.y*3.14159265)*opening*.65;
            p.y+=sin(time*1.3+uv.x*5.0)*opening*.08*(1.0-uv.y);
            gl_Position=worldViewProjection*vec4(p,1.0);
          }`,
        fragmentSource: `
          precision highp float;
          varying vec2 vUV;
          void main() {
            float fold=.5+.5*cos(vUV.x*75.3982237);
            float velvet=.24+.7*pow(fold,1.7)+.06*sin(vUV.y*3.14159265);
            float fibers=sin(vUV.y*1900.0+vUV.x*73.0)*.012;
            vec3 red=vec3(.68,.012,.035)*(velvet+fibers);
            float trim=1.0-smoothstep(.009,.022,min(vUV.x,1.0-vUV.x));
            vec3 color=mix(red,vec3(.48,.20,.035)*(velvet+.2),trim*.65);
            gl_FragColor=vec4(color,1.0);
          }`,
      }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection", "time", "opening", "side"] });
      material.backFaceCulling = false;
      material.setFloat("side", side);
      mesh.material = material;
      this.materials.push(material); this.panels.push(mesh);
    }
    const rail = MeshBuilder.CreateCylinder("Arcade / golden curtain rail",
      { height: VELVET_CURTAIN.halfWidth * 2, diameter: .28, tessellation: 16 }, scene);
    rail.parent = this.root;
    rail.position.y = 32.45;
    rail.rotation.z = Math.PI / 2;
    const brass = new StandardMaterial("Arcade / curtain rail brass", scene);
    brass.diffuseColor.set(.6, .35, .08);
    brass.emissiveColor.set(.08, .035, .004);
    rail.material = brass;
    this.update(0, 0);
  }

  update(time: number, open: number): void {
    if (!Number.isFinite(time)) throw new RangeError("Curtain time must be finite.");
    const opening = curtainInnerEdge(open) / (VELVET_CURTAIN.halfWidth * VELVET_CURTAIN.gather);
    this.materials.forEach((material) => { material.setFloat("time", time); material.setFloat("opening", opening); });
  }
}
