import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Constants } from "@babylonjs/core/Engines/constants";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";

interface TransitionOptions {
  name: string;
  shader: string;
  uniforms: string[];
  samplers?: string[];
  compileError: string;
}

export class TimedPostProcess {
  readonly postProcess: PostProcess;
  private attached = false;

  constructor(private readonly camera: Camera, pipeline: DefaultRenderingPipeline,
    private readonly options: TransitionOptions) {
    const scene = camera.getScene();
    this.postProcess = new PostProcess(options.name, options.shader, {
      engine: scene.getEngine(), size: 1, samplingMode: Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
      uniforms: options.uniforms, samplers: options.samplers, blockCompilation: true,
    });
    const observer = pipeline.onBuildObservable.add(() => {
      if (!this.attached) return;
      // Pipeline rebuilds must leave the transition after bloom and tone mapping.
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
        () => resolve(), (_effect, errors) => reject(new Error(`${this.options.compileError}: ${errors}`)));
    });
  }

  protected setActive(active: boolean): void {
    if (active === this.attached) return;
    if (active) this.camera.attachPostProcess(this.postProcess);
    else this.camera.detachPostProcess(this.postProcess);
    this.attached = active;
  }
}
