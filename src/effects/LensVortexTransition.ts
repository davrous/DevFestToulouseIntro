import { Effect } from "@babylonjs/core/Materials/effect";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA } from "../content/showBeats";
import { clamp, smoothstep } from "../engine/Timeline";
import { silentFeatures, type AudioFeatures } from "../engine/AudioAnalyzer";
import { TimedPostProcess } from "./TimedPostProcess";
import { PhysicalTunnel } from "./PhysicalTunnel";
import { TUNNEL_DISTANCES, TUNNEL_LEAD_OUT, TUNNEL_LENGTH, TUNNEL_RIGHT_TURN_INDEX, tunnelFlightPose } from "../camera/TunnelFlight";

export function lensVortexState(time: number): {
  active: boolean; elapsed: number; strength: number; turn: number; exit: number; entry: number;
} {
  if (!Number.isFinite(time)) throw new RangeError("Lens vortex time must be finite.");
  const pose = tunnelFlightPose(time);
  const turnStart = TUNNEL_DISTANCES[TUNNEL_RIGHT_TURN_INDEX];
  return {
    active: time >= CINEMA.camera && time < CINEMA.vortexEnd,
    elapsed: time - CINEMA.lens,
    strength: smoothstep((time - CINEMA.camera) / .18),
    turn: clamp((pose.distance - turnStart) / (TUNNEL_LENGTH - TUNNEL_LEAD_OUT - turnStart)),
    exit: smoothstep((time - CINEMA.vortexExit) / (CINEMA.vortexEnd - CINEMA.vortexExit)),
    entry: clamp((time - CINEMA.camera) / (CINEMA.lens - CINEMA.camera)),
  };
}

Effect.ShadersStore["lensVortexFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler, tunnelSampler;
uniform vec2 resolution;
uniform float elapsed, strength, entryProgress;

void main() {
  vec2 screen = (vUV-.5)*vec2(resolution.x/resolution.y,1.0)*2.0;
  float radius = max(length(screen),.001);
  vec3 color;
  if (entryProgress < 1.0) {
    vec2 radial = (vUV-.5)*entryProgress*.035;
    color = texture2D(textureSampler,vUV).rgb*.46;
    color += texture2D(textureSampler,clamp(vUV-radial,.001,.999)).rgb*.28;
    color += texture2D(textureSampler,clamp(vUV-radial*2.0,.001,.999)).rgb*.26;
    color += vec3(.02,.08,.12)*sin(entryProgress*3.14159265)*strength;
  } else {
    float pulse = exp(-max(0.0,elapsed)*5.0);
    vec2 warp = screen/radius*sin(radius*18.0-elapsed*25.0)*pulse*.007;
    vec4 tunnel = texture2D(tunnelSampler,clamp(vUV+warp,.001,.999));
    vec3 outside = texture2D(textureSampler,vUV).rgb;
    color = tunnel.rgb + outside*(1.0-tunnel.a);
  }
  gl_FragColor = vec4(color,1.0);
}`;

export class LensVortexTransition extends TimedPostProcess {
  private state = lensVortexState(0);
  readonly tunnel: PhysicalTunnel;

  constructor(camera: Camera, pipeline: DefaultRenderingPipeline) {
    super(camera, pipeline, {
      name: "Cinema / lens demoscene vortex", shader: "lensVortex",
      uniforms: ["resolution", "elapsed", "strength", "entryProgress"],
      samplers: ["tunnelSampler"],
      compileError: "Lens vortex shader failed to compile",
    });
    this.tunnel = new PhysicalTunnel(camera.getScene());
    this.postProcess.onApply = (effect) => {
      effect.setFloat2("resolution", Math.max(1, this.postProcess.width), Math.max(1, this.postProcess.height));
      effect.setFloat("elapsed", this.state.elapsed);
      effect.setFloat("strength", this.state.strength);
      effect.setFloat("entryProgress", this.state.entry);
      effect.setTexture("tunnelSampler", this.tunnel.texture);
    };
  }

  update(time: number, audio: AudioFeatures = silentFeatures()): void {
    this.state = lensVortexState(time);
    this.tunnel.update(time, audio);
    this.setActive(this.state.active);
  }
}
