import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { BUFFER_OVERFLOW } from "../content/showBeats";
import { clamp, smoothstep } from "../engine/Timeline";
import { cueEnvelope } from "../content/cues";

export function bufferFillState(time: number): { filled: number; waterHeight: number; spill: number; label: number; extraY: number } {
  if (!Number.isFinite(time)) throw new RangeError("Buffer fill time must be finite.");
  const elapsed = time - BUFFER_OVERFLOW.start;
  const filled = Math.max(0, Math.min(BUFFER_OVERFLOW.count,
    Math.floor((elapsed - BUFFER_OVERFLOW.fallDuration) / BUFFER_OVERFLOW.fillInterval) + 1));
  const fill = filled / BUFFER_OVERFLOW.count;
  const impactAge = time - BUFFER_OVERFLOW.spill;
  const extraFall = clamp((impactAge + BUFFER_OVERFLOW.extraFallDuration) / BUFFER_OVERFLOW.extraFallDuration);
  const spill = impactAge >= 0 ? cueEnvelope(time, BUFFER_OVERFLOW.spill, BUFFER_OVERFLOW.end, .12, 1) : 0;
  return {
    filled, waterHeight: 2.2 + fill * 3.65 + (impactAge >= 0 ? .45 * Math.exp(-impactAge * 1.7) : 0),
    spill,
    label: time >= BUFFER_OVERFLOW.spill
      ? cueEnvelope(time, BUFFER_OVERFLOW.spill, BUFFER_OVERFLOW.signEnd, .16, .45) : 0,
    extraY: 11 - 5.35 * extraFall * extraFall,
  };
}

export class BufferWater {
  readonly surface;
  readonly spill;
  readonly material: ShaderMaterial;

  constructor(scene: Scene, parent: TransformNode) {
    const shader = {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        uniform float time, impact, vertical;
        varying vec2 vUV;
        void main() {
          vUV = uv;
          vec3 p = position;
          float radius = length(uv - vec2(.52, .5));
          float wave = sin(radius * 35.0 - time * 8.0) * (.025 + impact * .13);
          p.y += (1.0 - vertical) * wave;
          gl_Position = worldViewProjection * vec4(p, 1.0);
        }`,
      fragmentSource: `
        precision highp float;
        varying vec2 vUV;
        uniform float time, impact, vertical, opacity;
        void main() {
          float ripple = sin(vUV.x * 26.0 + time * 2.0) * sin(vUV.y * 22.0 - time * 2.6);
          float flow = .5 + .5 * sin(vUV.x * 80.0 + sin(vUV.y * 11.0 - time * 9.0) * 2.0);
          float streak = pow(flow, 4.0);
          float crest = pow(max(0.0, ripple), 6.0);
          vec3 water = mix(vec3(.04, .35, .43), vec3(.32, .93, .91), .5 + ripple * .2);
          water += vec3(.5, .9, .94) * (crest * (.3 + impact) + vertical * streak * .35);
          float edge = smoothstep(0.0, .06, vUV.x) * (1.0 - smoothstep(.94, 1.0, vUV.x));
          float alpha = mix(.62, .3 + streak * .5, vertical) * mix(1.0, edge, vertical);
          gl_FragColor = vec4(water, alpha * opacity);
        }`,
    };
    const options = { attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "time", "impact", "vertical", "opacity"], needAlphaBlending: true };
    this.material = new ShaderMaterial("Digital buffer / rippling displaced water", scene, shader, options);
    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;
    this.material.setFloat("vertical", 0);
    this.material.setFloat("opacity", 1);
    this.surface = MeshBuilder.CreateGround("FX/Buffer / contained water surface", { width: 5.2, height: 4.4, subdivisions: 16 }, scene);
    this.surface.parent = parent;
    this.surface.position.x = BUFFER_OVERFLOW.tankX;
    this.surface.material = this.material;
    this.surface.isPickable = false;
    const spillMaterial = new ShaderMaterial("Digital buffer / overflowing water curtain", scene, shader, options);
    spillMaterial.backFaceCulling = false;
    spillMaterial.disableDepthWrite = true;
    spillMaterial.setFloat("vertical", 1);
    this.spill = MeshBuilder.CreatePlane("FX/Buffer / water spills over the lip", { width: 5.2, height: 1 }, scene);
    this.spill.parent = parent;
    this.spill.position.set(BUFFER_OVERFLOW.tankX, 5, -2.43);
    this.spill.material = spillMaterial;
    this.spill.isPickable = false;
  }

  update(time: number): void {
    const state = bufferFillState(time);
    const elapsed = time - BUFFER_OVERFLOW.spill;
    const impact = elapsed >= 0 ? Math.exp(-elapsed * 1.7) : 0;
    this.surface.position.y = state.waterHeight;
    this.material.setFloat("time", time);
    this.material.setFloat("impact", impact);
    this.spill.setEnabled(state.spill > 0);
    const drop = smoothstep(elapsed / .5) * (BUFFER_OVERFLOW.tankRim - BUFFER_OVERFLOW.tankFloor);
    this.spill.scaling.y = Math.max(.001, drop);
    this.spill.position.y = BUFFER_OVERFLOW.tankRim - drop / 2;
    const material = this.spill.material;
    if (!(material instanceof ShaderMaterial)) throw new Error("Buffer spill needs its water shader.");
    material.setFloat("time", time);
    material.setFloat("impact", impact);
    material.setFloat("opacity", state.spill);
  }
}
