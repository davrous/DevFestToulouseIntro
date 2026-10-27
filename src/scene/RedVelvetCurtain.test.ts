import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { RedVelvetCurtain, VELVET_CURTAIN, curtainInnerEdge } from "./RedVelvetCurtain";
import { arcadeDoorOpen } from "./ArcadeT";
import { cameraPose } from "../camera/CameraPath";
import { CELL, HEIGHT, ROOF_THICKNESS, cellPosition } from "../content/title";

describe("grand red velvet T-exit curtain", () => {
  it("has two folded full-height wings, stays under the roof and clears the camera before crossing", () => {
    expect(curtainInnerEdge(0)).toBe(0);
    expect(curtainInnerEdge(1)).toBeGreaterThan(12);
    expect(VELVET_CURTAIN.height + VELVET_CURTAIN.hem).toBeLessThan(HEIGHT - ROOF_THICKNESS / 2);
    const exit = cellPosition(1, 9).x + CELL / 2;
    for (let time = 44; time < 49; time += .05) {
      if (Math.abs(cameraPose(time).position.x - exit) < 1) {
        expect(curtainInnerEdge(arcadeDoorOpen(time))).toBeGreaterThan(10);
      }
    }
  });

  it("precompiles and updates by absolute time without spawning cloth objects on replay", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    new FreeCamera("Curtain camera", Vector3.Zero(), scene);
    const curtain = new RedVelvetCurtain(scene, new TransformNode("Arcade stage", scene), 0, 0);
    expect(curtain.panels).toHaveLength(2);
    expect(curtain.panels.every((panel) => panel.getTotalVertices() > 3000)).toBe(true);
    const counts = [scene.meshes.length, scene.materials.length, scene.transformNodes.length];
    for (const time of [0, 43, 45, 49, 0, 45]) curtain.update(time, arcadeDoorOpen(time));
    expect([scene.meshes.length, scene.materials.length, scene.transformNodes.length]).toEqual(counts);
    await Promise.all(curtain.panels.map((panel) => panel.material!.forceCompilationAsync(panel)));
    scene.dispose(); engine.dispose();
  });
});
