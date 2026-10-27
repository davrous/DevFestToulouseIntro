import { Effect } from "@babylonjs/core/Materials/effect";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CINEMA } from "../content/showBeats";
import { TimedPostProcess } from "./TimedPostProcess";

export function crtLightningState(time: number): { active: boolean; elapsed: number; energy: number } {
  if (!Number.isFinite(time)) throw new RangeError("CRT lightning time must be finite.");
  const active = time >= CINEMA.crtSync && time < CINEMA.crtSyncEnd;
  return { active, elapsed: active ? time - CINEMA.crtSync : 0,
    energy: active ? Math.exp(-(time - CINEMA.crtSync) * 8) : 0 };
}

Effect.ShadersStore["crtLightningFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 resolution, targets[8];
uniform float elapsed, energy;
float bolt(vec2 p,vec2 start,vec2 end,float seed) {
  vec2 axis=end-start;
  float lengthSquared=max(dot(axis,axis),.001);
  float t=clamp(dot(p-start,axis)/lengthSquared,0.0,1.0);
  vec2 normal=normalize(vec2(-axis.y,axis.x));
  float noise=sin(t*37.0+seed)*.017+sin(t*113.0+seed*2.3)*.007;
  vec2 closest=start+axis*t+normal*noise*sin(t*3.14159265);
  float distance=length(p-closest);
  return exp(-distance*260.0)*1.8+exp(-distance*40.0)*.35;
}
void main() {
  float aspect=resolution.x/resolution.y;
  vec2 p=vUV*vec2(aspect,1.0);
  vec2 fork=vec2(aspect*.52,.68);
  float arc=bolt(p,vec2(aspect*.38,1.08),fork,2.7);
  for(int i=0;i<8;i++) arc+=bolt(p,fork,targets[i]*vec2(aspect,1.0),float(i)*3.1);
  vec2 split=vec2(energy*.004,0.0);
  vec3 scene=texture2D(textureSampler,vUV).rgb;
  scene.r=texture2D(textureSampler,clamp(vUV+split,.001,.999)).r;
  scene.b=texture2D(textureSampler,clamp(vUV-split,.001,.999)).b;
  float wave=exp(-pow((length(p-fork)-elapsed*2.0)/.045,2.0))*energy;
  vec3 color=scene*(1.0-energy*.12)+vec3(.25,.6,1.0)*(arc*energy+wave*.35);
  color+=vec3(.12,.16,.24)*energy;
  gl_FragColor=vec4(color,1.0);
}`;

export class CrtLightningTransition extends TimedPostProcess {
  private state = crtLightningState(0);
  private readonly targets = new Array<number>(16).fill(.5);
  private readonly transform = Matrix.Identity();
  private readonly projected = Vector3.Zero();

  constructor(private readonly view: Camera, pipeline: DefaultRenderingPipeline, private readonly screens: readonly Mesh[]) {
    super(view, pipeline, { name: "Cinema / 59.2s CRT lightning", shader: "crtLightning",
      uniforms: ["resolution", "targets", "elapsed", "energy"], compileError: "CRT lightning shader failed to compile" });
    this.postProcess.onApply = (effect) => {
      effect.setFloat2("resolution", Math.max(1, this.postProcess.width), Math.max(1, this.postProcess.height));
      effect.setFloat("elapsed", this.state.elapsed);
      effect.setFloat("energy", this.state.energy);
      effect.setArray2("targets", this.targets);
    };
  }

  update(time: number): void {
    this.state = crtLightningState(time);
    if (this.state.active) {
      this.view.getViewMatrix(true).multiplyToRef(this.view.getProjectionMatrix(true), this.transform);
      this.screens.forEach((screen, index) => {
        screen.computeWorldMatrix(true);
        Vector3.TransformCoordinatesToRef(screen.getBoundingInfo().boundingBox.centerWorld, this.transform, this.projected);
        this.targets[index * 2] = .5 + this.projected.x * .5;
        this.targets[index * 2 + 1] = .5 + this.projected.y * .5;
      });
    }
    this.setActive(this.state.active);
  }
}
