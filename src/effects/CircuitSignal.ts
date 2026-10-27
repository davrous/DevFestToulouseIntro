import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { LegacyXorSettings } from "../scene/LegacyXorSequence";

export class CircuitSignal {
  readonly copper: Mesh;
  readonly glow: Mesh;
  readonly material: ShaderMaterial;
  readonly metal: PBRMaterial;

  constructor(scene: Scene, name: string, paths: readonly Vector3[][], radius: number,
    parent?: TransformNode) {
    const tubes = paths.map((path, index) => {
      const mesh = MeshBuilder.CreateTube(`${name} / trace ${index}`,
        { path, radius, tessellation: 6, cap: Mesh.CAP_ALL }, scene);
      const uvs = mesh.getVerticesData(VertexBuffer.UVKind);
      if (!uvs) throw new Error("Circuit tubes require distance UVs.");
      for (let at = 1; at < uvs.length; at += 2) uvs[at] = uvs[at] * .92 + index / paths.length * .08;
      mesh.setVerticesData(VertexBuffer.UVKind, uvs);
      return mesh;
    });
    const copper = Mesh.MergeMeshes(tubes, true, true);
    if (!copper) throw new Error("Could not build the physical circuit traces.");
    this.copper = copper; copper.name = `${name} / copper conductors`; copper.parent = parent ?? null;
    copper.isPickable = false;
    this.metal = new PBRMaterial(`${name} / etched copper`, scene);
    this.metal.metallic = .72; this.metal.roughness = .33;
    copper.material = this.metal;
    this.glow = copper.clone(`${name} / progressive electrical packet`, parent ?? null);
    this.material = new ShaderMaterial(`${name} / distance-driven signal`, scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying float distanceAlong;
        void main(){ distanceAlong=uv.y;gl_Position=worldViewProjection*vec4(position,1.0); }`,
      fragmentSource: `
        precision highp float;
        varying float distanceAlong;
        uniform vec3 signalColor;
        uniform float progress,enabledSignal,strength;
        void main(){
          float delta=distanceAlong-progress;
          float head=exp(-pow(delta/.032,2.0));
          float tail=smoothstep(-.24,-.035,delta)*(1.0-smoothstep(0.0,.025,delta));
          float charged=(1.0-smoothstep(progress-.02,progress+.01,distanceAlong))*.10;
          float energy=(head+tail*.55+charged)*enabledSignal;
          gl_FragColor=vec4(signalColor*strength*(.5+head),energy);
        }`,
    }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection", "progress", "enabledSignal", "strength", "signalColor"],
      needAlphaBlending: true });
    this.material.disableDepthWrite = true;
    this.material.zOffset = -1;
    this.glow.material = this.material;
    this.glow.isPickable = false;
  }

  update(progress: number, active: boolean, settings: LegacyXorSettings): void {
    this.material.setFloat("progress", progress);
    this.material.setFloat("enabledSignal", active ? 1 : 0);
    this.material.setFloat("strength", settings.emission);
    this.material.setColor3("signalColor", Color3.FromHexString(settings.signalColor));
    this.metal.albedoColor.copyFrom(Color3.FromHexString(settings.copperColor));
    this.metal.emissiveColor.copyFrom(this.metal.albedoColor).scaleInPlace(.08);
    this.glow.setEnabled(active);
  }
}
