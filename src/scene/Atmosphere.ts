import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { SEED, seededRandom, cellPosition } from "../content/title";
import { BoxBatch } from "./Instances";
import { emissive } from "./Labyrinth";
import { smoothstep } from "../engine/Timeline";

export const DUST = { minY: 2, maxY: 5, drift: .5, thickness: .055 } as const;

export function showFogDensity(time: number, violaEnergy = 0): number {
  const clearing = smoothstep((time - 158) / 7);
  const calm = 1 - smoothstep((time - 153) / 18);
  return (.009 + violaEnergy * calm * .001) * (1 - clearing) + .00008 * clearing;
}

export interface Atmosphere { stars: Mesh; dust: Mesh; backdrop: Mesh; grid: Mesh }

export function createAtmosphere(scene: Scene): Atmosphere {
  const random = seededRandom(`${SEED}_ATMOSPHERE`);
  const starMaterial = emissive(scene, "Distant starlight", "#93c7d5", 1);
  starMaterial.fogEnabled = false;
  const stars = MeshBuilder.CreateIcoSphere("Static starfield", { radius: 1, subdivisions: 1 }, scene);
  stars.material = starMaterial;
  stars.isPickable = false;
  const matrices: number[] = [];
  for (let i = 0; i < 1100; i++) {
    const radius = 2700 + random() * 2200;
    const azimuth = random() * Math.PI * 2;
    const elevation = random() * 1.7 - .85;
    const size = .4 + random() * 1.2;
    const position = new Vector3(Math.cos(azimuth) * radius, Math.sin(elevation) * radius, Math.sin(azimuth) * radius);
    matrices.push(...Matrix.Compose(new Vector3(size, size, size), Quaternion.Identity(), position).asArray());
  }
  for (let i = 0; i < 700; i++) {
    const x = (random() - .5) * 4000;
    const z = (random() - .5) * 2600;
    if (Math.abs(x) < 700 && Math.abs(z) < 345) continue;
    const size = .45 + random() * 1.1;
    const position = new Vector3(x, -5 + random() * 3, z);
    matrices.push(...Matrix.Compose(new Vector3(size, size, size), Quaternion.Identity(), position).asArray());
  }
  stars.thinInstanceSetBuffer("matrix", new Float32Array(matrices), 16, true);
  const dustBatch = new BoxBatch("Suspended interior dust", emissive(scene, "Dust photons", "#b1ffe9", .65));
  for (let i = 0; i < 300; i++) {
    const p = cellPosition(random() * 4, random() * 6);
    dustBatch.add(p.x, DUST.minY + random() * (DUST.maxY - DUST.minY), p.z, DUST.thickness, DUST.thickness, .14 + random() * .35);
  }
  const dust = dustBatch.build(scene);
  dust.unfreezeWorldMatrix();
  const backdrop = MeshBuilder.CreateGround("Infinite dark stage", { width: 18000, height: 18000 }, scene);
  backdrop.position.y = -16;
  const background = emissive(scene, "Blue hour horizon", "#071017", .5);
  background.emissiveColor.set(.16, .23, .29);
  backdrop.material = background;
  const gridMaterial = emissive(scene, "Survey grid ink", "#264452", .6);
  gridMaterial.emissiveColor.set(.19, .31, .36);
  const gridBatch = new BoxBatch("Understructure survey grid", gridMaterial);
  for (let i = -14; i <= 14; i++) {
    gridBatch.add(i * 70, -15.8, 0, .3, .04, 1960);
    gridBatch.add(0, -15.8, i * 70, 1960, .04, .3);
  }
  const grid = gridBatch.build(scene);
  return { stars, dust, backdrop, grid };
}
