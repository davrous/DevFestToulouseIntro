import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { CINEMA } from "../content/showBeats";

export { TUNNEL_SPEAKER_TRAILS } from "./PhysicalTunnel";
export const LENS_PORTAL_RADIUS = 6.66;

export class LensTunnelPreview {
  readonly mesh;
  readonly material: ShaderMaterial;

  constructor(scene: Scene, parent: TransformNode, center: Vector3, yaw: number) {
    this.mesh = MeshBuilder.CreateDisc("Cinema / opaque tunnel inside lens", { radius: LENS_PORTAL_RADIUS, tessellation: 128 }, scene);
    this.mesh.parent = parent;
    this.mesh.position.copyFrom(center).subtractInPlace(new Vector3(Math.sin(yaw), 0, Math.cos(yaw)).scale(.15));
    this.mesh.rotation.y = yaw;
    this.mesh.isPickable = false;
    this.material = new ShaderMaterial("Cinema / shared opaque tunnel preview", scene, {
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
        uniform sampler2D tunnelSampler;
        uniform float aspect;
        void main() {
          vec2 uv = vec2(.5+(vUV.x-.5)/aspect,vUV.y);
          gl_FragColor = vec4(texture2D(tunnelSampler,uv).rgb,1.0);
        }`,
    }, { attributes: ["position", "uv"], uniforms: ["worldViewProjection", "aspect"], samplers: ["tunnelSampler"] });
    this.material.setFloat("aspect", 16 / 9);
    this.mesh.material = this.material;
  }

  setTunnel(texture: RenderTargetTexture): void { this.material.setTexture("tunnelSampler", texture); }

  update(time: number): void {
    this.mesh.setEnabled(time >= CINEMA.start && time < CINEMA.lens);
    const engine = this.mesh.getScene().getEngine();
    this.material.setFloat("aspect", Math.max(1, engine.getRenderWidth()) / Math.max(1, engine.getRenderHeight()));
  }
}
