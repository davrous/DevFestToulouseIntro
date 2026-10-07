import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Effect } from "@babylonjs/core/Materials/effect";
import { Constants } from "@babylonjs/core/Engines/constants";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { CLAP_CRT } from "../content/showBeats";
import { cueEnvelope } from "../content/cues";
import { smoothstep } from "../engine/Timeline";

export interface ClapCrtState {
  active: boolean;
  elapsed: number;
  signalHeight: number;
  pixelation: number;
  distortion: number;
  scanlines: number;
}

export function clapCrtState(time: number): ClapCrtState {
  const active = time > CLAP_CRT.start && time < CLAP_CRT.end;
  if (!active) return { active: false, elapsed: 0, signalHeight: 1, pixelation: 0, distortion: 0, scanlines: 0 };
  const strength = cueEnvelope(time, CLAP_CRT.start, CLAP_CRT.end, .12, .2);
  const collapse = smoothstep((time - CLAP_CRT.collapse) / (CLAP_CRT.collapsed - CLAP_CRT.collapse));
  const opening = smoothstep((time - CLAP_CRT.reopen) / (CLAP_CRT.open - CLAP_CRT.reopen));
  const signalHeight = time < CLAP_CRT.reopen
    ? 1 - collapse * (1 - CLAP_CRT.minimumHeight)
    : CLAP_CRT.minimumHeight + opening * (1 - CLAP_CRT.minimumHeight);
  return {
    active, elapsed: time - CLAP_CRT.start, signalHeight,
    pixelation: strength * smoothstep((time - CLAP_CRT.start) / .3)
      * (1 - smoothstep((time - CLAP_CRT.reopen) / .48)),
    distortion: strength,
    scanlines: strength * (time < CLAP_CRT.reopen ? .32 : 1),
  };
}

Effect.ShadersStore["clapCrtFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform vec2 resolution;
uniform float elapsed, signalHeight, pixelation, distortion, scanlines;

float signalNoise(vec2 cell) {
  return fract(sin(dot(cell, vec2(91.19, 57.83))) * 47455.13);
}

void main() {
  vec2 screen = vUV * 2.0 - 1.0;
  vec2 curved = screen * (1.0 + .055 * distortion * dot(screen, screen));
  float edge = mix(1.0, 1.0 - smoothstep(.94, 1.04, max(abs(curved.x), abs(curved.y))), distortion);
  vec2 uv = curved * .5 + .5;

  float row = floor(uv.y * 96.0);
  float tick = floor(elapsed * 18.0);
  float rowNoise = signalNoise(vec2(row, tick));
  float tear = smoothstep(.83, 1.0, rowNoise);
  uv.x += (rowNoise - .5) * tear * .027 * distortion;
  uv.x += sin(uv.y * 17.0 + elapsed * 11.0) * .0025 * distortion;

  float halfHeight = signalHeight * .5;
  float feather = 1.5 / resolution.y;
  float tube = 1.0 - smoothstep(halfHeight - feather, halfHeight + feather, abs(uv.y - .5));
  vec2 picture = vec2(uv.x, (uv.y - .5) / signalHeight + .5);
  float cellSize = mix(1.0, 18.0, pixelation) * max(1.0, resolution.y / 720.0);
  vec2 cells = resolution / cellSize;
  vec2 pixelUv = (floor(picture * cells) + .5) / cells;
  picture = mix(picture, pixelUv, pixelation);
  picture = clamp(picture, vec2(.001), vec2(.999));

  float separation = distortion * (.0012 + .0025 * tear);
  vec3 image;
  image.r = texture2D(textureSampler, clamp(picture + vec2(separation, 0.0), .001, .999)).r;
  image.g = texture2D(textureSampler, picture).g;
  image.b = texture2D(textureSampler, clamp(picture - vec2(separation, 0.0), .001, .999)).b;

  float raster = .5 + .5 * cos(vUV.y * resolution.y * 3.14159265);
  image *= 1.0 - scanlines * .2 * raster;
  float subpixel = mod(floor(vUV.x * resolution.x), 3.0);
  vec3 phosphor = vec3(
    1.0 - step(.5, subpixel),
    step(.5, subpixel) * (1.0 - step(1.5, subpixel)),
    step(1.5, subpixel)
  );
  image *= mix(vec3(1.0), vec3(.8) + phosphor * .6, scanlines * .2);
  float grain = signalNoise(floor(vUV * resolution / 2.0) + vec2(tick, tick * .73));
  image += (grain - .5) * .035 * distortion;
  image *= 1.0 - distortion * .12 * dot(screen, screen);

  float shutdown = 1.0 - smoothstep(.008, .075, signalHeight);
  image *= 1.0 - shutdown * .98;
  vec3 background = vec3(.002, .004, .006);
  vec3 color = mix(background, max(image, vec3(0.0)), tube * edge);

  float lineDistance = abs(vUV.y - .5) * resolution.y;
  float line = exp(-lineDistance * lineDistance / 5.0);
  float halo = exp(-lineDistance * .085);
  float lineWidth = 1.0 - smoothstep(.8, .99, abs(screen.x));
  color += vec3(.22, .95, .4) * (line * .72 + halo * .1) * lineWidth * shutdown;

  float frontier = abs(vUV.y - (.5 + halfHeight)) * resolution.y;
  float sweep = exp(-frontier * frontier / 12.0);
  color += vec3(.32, .69, .59) * sweep * (1.0 - signalHeight) * scanlines * .12;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

export class ClapCrtTransition {
  readonly postProcess: PostProcess;
  private state = clapCrtState(0);
  private attached = false;

  constructor(private readonly camera: Camera, pipeline: DefaultRenderingPipeline) {
    const scene = camera.getScene();
    this.postProcess = new PostProcess("CRT / clap signal transition", "clapCrt", {
      engine: scene.getEngine(), size: 1, samplingMode: Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
      uniforms: ["resolution", "elapsed", "signalHeight", "pixelation", "distortion", "scanlines"],
      blockCompilation: true,
    });
    this.postProcess.onApply = (effect) => {
      effect.setFloat2("resolution", Math.max(1, this.postProcess.width), Math.max(1, this.postProcess.height));
      effect.setFloat("elapsed", this.state.elapsed);
      effect.setFloat("signalHeight", this.state.signalHeight);
      effect.setFloat("pixelation", this.state.pixelation);
      effect.setFloat("distortion", this.state.distortion);
      effect.setFloat("scanlines", this.state.scanlines);
    };
    const observer = pipeline.onBuildObservable.add(() => {
      if (!this.attached) return;
      // Pipeline rebuilds must not put bloom or tone mapping after the phosphor line.
      camera.detachPostProcess(this.postProcess);
      camera.attachPostProcess(this.postProcess);
    });
    scene.onDisposeObservable.addOnce(() => {
      pipeline.onBuildObservable.remove(observer);
      this.postProcess.dispose(camera);
    });
  }

  prepare(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.postProcess.updateEffect(undefined, undefined, undefined, undefined,
        () => resolve(), (_effect, errors) => reject(new Error(`CRT transition shader failed to compile: ${errors}`)));
    });
  }

  update(time: number): void {
    this.state = clapCrtState(time);
    if (this.state.active === this.attached) return;
    if (this.state.active) this.camera.attachPostProcess(this.postProcess);
    else this.camera.detachPostProcess(this.postProcess);
    this.attached = this.state.active;
  }
}
