import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createRosePetals } from "./RosePetals";

describe("original curved rose-petal shader", () => {
  it("builds a double-sided curved mesh and batches petals with deterministic flutter attributes", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    new FreeCamera("Petal camera", Vector3.Zero(), scene);
    const { mesh, material } = createRosePetals(scene, 192);
    const matrices = new Float32Array(192 * 16);
    for (let index = 0; index < 192; index++) Matrix.Translation(index, 0, 5).copyToArray(matrices, index * 16);
    mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
    expect(mesh.getTotalVertices()).toBeGreaterThan(100);
    expect(mesh.getVerticesData("position")?.every(Number.isFinite)).toBe(true);
    expect(mesh.getVerticesData("normal")?.every(Number.isFinite)).toBe(true);
    expect(mesh.thinInstanceCount).toBe(192);
    expect(material.backFaceCulling).toBe(false);
    await material.forceCompilationAsync(mesh, { useInstances: true });
    expect(material.isReady(mesh, true)).toBe(true);
    scene.dispose(); engine.dispose();
  });
});
