import { Effect } from "@babylonjs/core/Materials/effect";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA } from "../content/showBeats";
import { cueEnvelope } from "../content/cues";
import { TimedPostProcess } from "./TimedPostProcess";

export function lensVortexState(time: number): { active: boolean; elapsed: number; strength: number } {
  if (!Number.isFinite(time)) throw new RangeError("Lens vortex time must be finite.");
  const active = time > CINEMA.lens && time < CINEMA.vortexEnd;
  return {
    active, elapsed: active ? time - CINEMA.lens : 0,
    strength: active ? cueEnvelope(time, CINEMA.lens, CINEMA.vortexEnd, .65, 1) : 0,
  };
}

Effect.ShadersStore["lensVortexFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 resolution;
uniform float elapsed, strength;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 p = (vUV - .5) * vec2(resolution.x / resolution.y, 1.0) * 2.0;
  float radius = max(length(p), .06);
  float angle = atan(p.y, p.x);
  float depth = 1.8 / radius;
  float edge = smoothstep(.08, 1.1, radius);
  float phase = angle + depth * .36 - elapsed * .42;
  float spiral = pow(.5 + .5 * sin(phase * 9.0 + sin(depth * 2.0 - elapsed * 3.0)), 5.0);
  float rings = pow(.5 + .5 * sin(depth * 12.0 - elapsed * 13.0), 10.0);
  float threads = pow(.5 + .5 * sin(phase * 31.0 + depth * 3.0), 18.0);
  vec2 cell = floor(vec2(phase * 23.0, depth * 18.0 - elapsed * 21.0));
  float sparks = step(.992, noise(cell));
  vec3 tint = mix(vec3(.04, .72, .85), vec3(.51, .18, .94),
    .5 + .5 * sin(phase * 2.0 + depth * .8));
  vec3 tunnel = tint * (.08 + spiral * .65 + rings * .42 + threads * .25);
  tunnel += vec3(.63, .96, 1.0) * sparks * .7;
  tunnel *= smoothstep(.04, .25, radius);

  vec2 swirl = vec2(-p.y, p.x) * sin(depth * .8 - elapsed) * .007 * strength * edge;
  vec2 uv = clamp(vUV + swirl, .001, .999);
  vec3 scene = texture2D(textureSampler, uv).rgb;
  float separation = .0014 * strength * edge;
  scene.r = texture2D(textureSampler, clamp(uv + vec2(separation, 0.0), .001, .999)).r;
  scene.b = texture2D(textureSampler, clamp(uv - vec2(separation, 0.0), .001, .999)).b;
  float veil = strength * edge * .48;
  vec3 color = scene * (1.0 - veil) + tunnel * strength * (.16 + edge * .78);
  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}`;

export class LensVortexTransition extends TimedPostProcess {
  private state = lensVortexState(0);

  constructor(camera: Camera, pipeline: DefaultRenderingPipeline) {
    super(camera, pipeline, {
      name: "Cinema / lens demoscene vortex", shader: "lensVortex",
      uniforms: ["resolution", "elapsed", "strength"],
      compileError: "Lens vortex shader failed to compile",
    });
    this.postProcess.onApply = (effect) => {
      effect.setFloat2("resolution", Math.max(1, this.postProcess.width), Math.max(1, this.postProcess.height));
      effect.setFloat("elapsed", this.state.elapsed);
      effect.setFloat("strength", this.state.strength);
    };
  }

  update(time: number): void {
    this.state = lensVortexState(time);
    this.setActive(this.state.active);
  }
}
