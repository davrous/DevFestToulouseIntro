import { Effect } from "@babylonjs/core/Materials/effect";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ARCADE_ENTRY } from "../content/showBeats";
import { cueEnvelope } from "../content/cues";
import { TimedPostProcess } from "./TimedPostProcess";

export interface ArcadeEntryState {
  active: boolean;
  elapsed: number;
  strength: number;
  burst: number;
}

export function arcadeEntryState(time: number): ArcadeEntryState {
  if (!Number.isFinite(time)) throw new RangeError("Arcade entry time must be finite.");
  const active = time > ARCADE_ENTRY.start && time < ARCADE_ENTRY.end;
  if (!active) return { active: false, elapsed: 0, strength: 0, burst: 0 };
  const strength = cueEnvelope(time, ARCADE_ENTRY.start, ARCADE_ENTRY.end, .3, .4);
  const distance = (time - (ARCADE_ENTRY.cross - .4)) / .18;
  return {
    active, elapsed: time - ARCADE_ENTRY.start, strength,
    burst: strength * Math.exp(-distance * distance),
  };
}

Effect.ShadersStore["arcadeEntryFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 resolution;
uniform float elapsed, strength, burst;

float pixelNoise(vec2 cell) {
  return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec3 original = texture2D(textureSampler, vUV).rgb;
  float cellSize = mix(1.0, (10.0 + burst * 10.0) * max(1.0, resolution.y / 720.0), strength);
  vec2 cells = resolution / cellSize;
  vec2 uv = (floor(vUV * cells) + .5) / cells;
  uv = .5 + (uv - .5) * (1.0 - burst * .045);

  float row = floor(uv.y * 72.0);
  float tick = floor(elapsed * 16.0);
  float noise = pixelNoise(vec2(row, tick));
  uv.x += (noise - .5) * step(.87, noise) * strength * .012;
  uv = clamp(uv, vec2(.001), vec2(.999));

  float separation = strength * (.001 + burst * .003);
  vec3 retro;
  retro.r = texture2D(textureSampler, clamp(uv + vec2(separation, 0.0), .001, .999)).r;
  retro.g = texture2D(textureSampler, uv).g;
  retro.b = texture2D(textureSampler, clamp(uv - vec2(separation, 0.0), .001, .999)).b;
  retro = pow(max(retro, vec3(0.0)), vec3(.85));
  vec2 pixel = floor(vUV * cells);
  float dither = mod(pixel.x + mod(pixel.y, 2.0) * 2.0, 4.0) / 4.0 - .375;
  retro = floor(clamp(retro + dither * .1, 0.0, 1.0) * 7.0 + .5) / 7.0;
  retro *= vec3(.95, 1.05, 1.08);

  float raster = .88 + .12 * step(1.0, mod(floor(vUV.y * resolution.y), 3.0));
  vec2 withinPixel = fract(vUV * cells);
  float grid = .92 + .08 * step(.06, min(withinPixel.x, withinPixel.y));
  retro *= raster * grid;
  float edge = dot(vUV - .5, vUV - .5);
  retro *= 1.0 - edge * .25;
  gl_FragColor = vec4(mix(original, clamp(retro, 0.0, 1.0), strength), 1.0);
}`;

export class ArcadeEntryTransition extends TimedPostProcess {
  private state = arcadeEntryState(0);

  constructor(camera: Camera, pipeline: DefaultRenderingPipeline) {
    super(camera, pipeline, {
      name: "Arcade / retro gaming entry", shader: "arcadeEntry",
      uniforms: ["resolution", "elapsed", "strength", "burst"],
      compileError: "Arcade entry shader failed to compile",
    });
    this.postProcess.onApply = (effect) => {
      effect.setFloat2("resolution", Math.max(1, this.postProcess.width), Math.max(1, this.postProcess.height));
      effect.setFloat("elapsed", this.state.elapsed);
      effect.setFloat("strength", this.state.strength);
      effect.setFloat("burst", this.state.burst);
    };
  }

  update(time: number): void {
    this.state = arcadeEntryState(time);
    this.setActive(this.state.active);
  }
}
