import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

/** Convex, clockwise or counterclockwise face; beveled caps keep the original outer bounds. */
export function beveledPrism(name: string, polygon: readonly (readonly [number, number])[],
  depth: number, bevel: number, scene: Scene): Mesh {
  const points = polygon.slice();
  const area = points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length]; return sum + a[0] * b[1] - b[0] * a[1];
  }, 0);
  if (area < 0) points.reverse();
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  const inset = points.map(([x, y]) => {
    const distance = Math.hypot(x - cx, y - cy);
    return [x + (cx - x) * bevel / distance, y + (cy - y) * bevel / distance] as const;
  });
  const positions: number[] = [], indices: number[] = [], normals: number[] = [];
  const triangle = (a: readonly number[], b: readonly number[], c: readonly number[]) => {
    const at = positions.length / 3; positions.push(...a, ...b, ...c); indices.push(at, at + 1, at + 2);
  };
  const ring = (a: readonly (readonly [number, number])[], az: number,
    b: readonly (readonly [number, number])[], bz: number) => {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      triangle([...a[i], az], [...a[j], az], [...b[j], bz]);
      triangle([...a[i], az], [...b[j], bz], [...b[i], bz]);
    }
  };
  for (let i = 1; i < points.length - 1; i++) {
    triangle([...inset[0], -depth / 2], [...inset[i + 1], -depth / 2], [...inset[i], -depth / 2]);
    triangle([...inset[0], depth / 2], [...inset[i], depth / 2], [...inset[i + 1], depth / 2]);
  }
  ring(inset, -depth / 2, points, -depth / 2 + bevel);
  ring(points, -depth / 2 + bevel, points, depth / 2 - bevel);
  ring(points, depth / 2 - bevel, inset, depth / 2);
  for (let index = 0; index < indices.length; index += 3) {
    [indices[index + 1], indices[index + 2]] = [indices[index + 2], indices[index + 1]];
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals;
  const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.isPickable = false;
  return mesh;
}
