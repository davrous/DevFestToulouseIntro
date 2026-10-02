import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Material } from "@babylonjs/core/Materials/material";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";

export class BoxBatch {
  private readonly matrices: number[] = [];
  private readonly matrix = new Matrix();
  private readonly scale = new Vector3();
  private readonly translation = new Vector3();

  constructor(readonly name: string, readonly material: Material) {}

  add(x: number, y: number, z: number, width: number, height: number, depth: number, yaw = 0): void {
    this.scale.set(width, height, depth);
    this.translation.set(x, y, z);
    Matrix.ComposeToRef(this.scale, Quaternion.RotationYawPitchRoll(yaw, 0, 0), this.translation, this.matrix);
    this.matrices.push(...this.matrix.asArray());
  }

  build(scene: Scene): Mesh {
    const mesh = MeshBuilder.CreateBox(this.name, { size: 1 }, scene);
    mesh.material = this.material;
    mesh.isPickable = false;
    if (this.matrices.length === 0) {
      mesh.setEnabled(false);
      return mesh;
    }
    mesh.thinInstanceSetBuffer("matrix", new Float32Array(this.matrices), 16, true);
    mesh.freezeWorldMatrix();
    return mesh;
  }
}
