import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";

export async function prewarmRenderStates(scene: Scene, camera: Camera, states: readonly (() => void)[],
  restore: () => void): Promise<void> {
  const engine = scene.getEngine();
  const target = new RenderTargetTexture("Preparation / offscreen shader warmup",
    { width: engine.getRenderWidth(), height: engine.getRenderHeight() }, scene, false, true);
  const previousTarget = camera.outputRenderTarget;
  const physicsEnabled = scene.physicsEnabled;
  try {
    camera.outputRenderTarget = target;
    scene.physicsEnabled = false;
    for (const evaluate of states) {
      evaluate();
      await scene.whenReadyAsync(true);
      scene.render();
      await scene.whenReadyAsync(true);
      scene.render();
    }
  } finally {
    try {
      restore();
    } finally {
      camera.outputRenderTarget = previousTarget;
      scene.physicsEnabled = physicsEnabled;
      target.dispose();
    }
  }
}
