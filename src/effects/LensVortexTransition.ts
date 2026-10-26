import { Effect } from "@babylonjs/core/Materials/effect";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA } from "../content/showBeats";
import { cueEnvelope } from "../content/cues";
import { cameraPose } from "../camera/CameraPath";
import { clamp, smoothstep } from "../engine/Timeline";
import { TimedPostProcess } from "./TimedPostProcess";

const entryPose = cameraPose(CINEMA.lens);
const entryHeading = Math.atan2(entryPose.target.x - entryPose.position.x, entryPose.target.z - entryPose.position.z);

export function lensVortexState(time: number): { active: boolean; elapsed: number; strength: number; turn: number; exit: number } {
  if (!Number.isFinite(time)) throw new RangeError("Lens vortex time must be finite.");
  const active = time > CINEMA.lens && time < CINEMA.vortexEnd;
  const pose = active ? cameraPose(time) : undefined;
  const heading = pose ? Math.atan2(pose.target.x - pose.position.x, pose.target.z - pose.position.z) : entryHeading;
  const difference = Math.atan2(Math.sin(heading - entryHeading), Math.cos(heading - entryHeading));
  return {
    active, elapsed: active ? time - CINEMA.lens : 0,
    strength: active ? cueEnvelope(time, CINEMA.lens, CINEMA.vortexEnd, .65, .25) : 0,
    turn: clamp(difference / (Math.PI / 2)),
    exit: smoothstep((time - CINEMA.vortexExit) / (CINEMA.vortexEnd - CINEMA.vortexExit)),
  };
}

Effect.ShadersStore["lensVortexFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 resolution;
uniform float elapsed, strength, turn, exitProgress;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 screen = (vUV - .5) * vec2(resolution.x / resolution.y, 1.0) * 2.0;
  vec2 p = screen - vec2(turn * .46, 0.0);
  p.x -= turn * .17 / (length(p) + .4);
  float radius = max(length(p), .06);
  float angle = atan(p.y, p.x);
  float depth = 2.1 / (radius + .08);
  float edge = smoothstep(.08, 1.1, radius);
  float travel = elapsed * 1.6 + turn * 2.5;
  float phase = angle + depth * .44 + elapsed * .68;
  float turbulence = sin(depth * 2.0 - travel * 2.0) * .6
    + sin(angle * 3.0 + travel) * .25;
  float spiral = pow(.5 + .5 * sin(phase * 9.0 + turbulence), 5.0);
  float rings = pow(.5 + .5 * sin(depth * 13.0 - travel * 8.0), 12.0);
  float threads = pow(.5 + .5 * sin(phase * 37.0 + depth * 4.0), 20.0);
  float braid = pow(.5 + .5 * sin(angle * 6.0 - depth * 7.0 + travel * 3.0), 14.0);
  vec2 cell = floor(vec2(phase * 29.0, depth * 24.0 - travel * 16.0));
  float sparks = step(.986, noise(cell));
  vec3 tint = mix(vec3(.04, .72, .85), vec3(.51, .18, .94),
    .5 + .5 * sin(phase * 2.0 + depth * .8));
  vec3 tunnel = tint * (.12 + spiral * .95 + rings * .65 + threads * .4 + braid * .3);
  tunnel += vec3(.63, .96, 1.0) * sparks * .85;
  tunnel += vec3(.03, .15, .24) * .2 / (radius + .2);
  tunnel *= smoothstep(.035, .2, radius);

  float aperture = exitProgress * 2.9;
  float reveal = 1.0 - smoothstep(aperture - .085, aperture + .085, radius);
  float shell = 1.0 - reveal;
  float rim = exp(-pow((radius - aperture) / .055, 2.0)) * sin(exitProgress * 3.14159265);
  float exitWave = sin(radius * 29.0 - exitProgress * 18.0) * rim;
  vec2 swirl = vec2(-p.y, p.x) * sin(depth * .8 - travel) * .009
    * strength * edge * (1.0 - exitProgress);
  swirl += p / radius * exitWave * .006;
  vec2 uv = clamp(vUV + swirl, .001, .999);
  vec3 scene = texture2D(textureSampler, uv).rgb;
  float separation = strength * (.0017 * edge * shell + rim * .004);
  scene.r = texture2D(textureSampler, clamp(uv + vec2(separation, 0.0), .001, .999)).r;
  scene.b = texture2D(textureSampler, clamp(uv - vec2(separation, 0.0), .001, .999)).b;
  float veil = strength * edge * .64 * shell;
  vec3 color = scene * (1.0 - veil) + tunnel * strength * (.2 + edge * .88) * shell;
  color += mix(vec3(.15, .9, 1.0), vec3(.7, .3, 1.0), .5 + .5 * sin(angle * 3.0 + travel))
    * rim * strength * .75;
  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}`;

export class LensVortexTransition extends TimedPostProcess {
  private state = lensVortexState(0);

  constructor(camera: Camera, pipeline: DefaultRenderingPipeline) {
    super(camera, pipeline, {
      name: "Cinema / lens demoscene vortex", shader: "lensVortex",
      uniforms: ["resolution", "elapsed", "strength", "turn", "exitProgress"],
      compileError: "Lens vortex shader failed to compile",
    });
    this.postProcess.onApply = (effect) => {
      effect.setFloat2("resolution", Math.max(1, this.postProcess.width), Math.max(1, this.postProcess.height));
      effect.setFloat("elapsed", this.state.elapsed);
      effect.setFloat("strength", this.state.strength);
      effect.setFloat("turn", this.state.turn);
      effect.setFloat("exitProgress", this.state.exit);
    };
  }

  update(time: number): void {
    this.state = lensVortexState(time);
    this.setActive(this.state.active);
  }
}
