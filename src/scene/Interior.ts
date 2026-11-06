import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { cellPosition } from "../content/title";
import { BoxBatch } from "./Instances";
import { emissive } from "./Labyrinth";
import { createWorldText } from "./WorldText";

export const CORE_LAYOUT = {
  column: 4, row: 2.88, offsetX: 2, height: 24.5,
  ringDiameters: [9, 12, 15], ringThickness: .09,
} as const;

function signage(scene: Scene, label: string, subtitle: string, x: number, y: number, z: number, yaw: number): Mesh {
  const plane = createWorldText(scene, {
    name: label, width: 17, height: 4.25, background: "#0c1c25", border: "#648f96",
    lines: [{ text: label, color: "#9fedda" }, { text: subtitle, color: "#648f96" }],
  });
  plane.position.set(x, y, z);
  plane.rotation.y = yaw;
  plane.isPickable = false;
  return plane;
}

export interface Interior {
  root: TransformNode;
  core: Mesh;
  rings: Mesh[];
}

export function createInterior(scene: Scene): Interior {
  const firstMesh = scene.meshes.length;
  const root = new TransformNode("Digital D / architectural interior", scene);
  const light = emissive(scene, "Reactor ions", "#9affea", 1.55);
  const warm = emissive(scene, "Amber navigation", "#ffb78a", 1.2);
  const bars = new BoxBatch("Interior floating data banks", light);
  const housings = new BoxBatch("Data bank housings", emissive(scene, "Data bank dark metal", "#213f49", .65));
  const banks = [cellPosition(.85, 3.5), cellPosition(.85, 2.3), cellPosition(.85, 1.2)];
  banks.forEach(({ x, z }, index) => {
    housings.add(x, 11, z, 6, 19, 8);
    for (let i = 0; i < 18; i++) {
      bars.add(x - 3.1, 3 + i * .92, z, .15, .2, i % 3 === 0 ? 6 : 3.8);
    }
    signage(scene, `NODE / 0${index + 1}`, "NEURAL FABRIC  //  ONLINE", x - 3.2, 23, z, Math.PI / 2);
  });
  const top = cellPosition(1.75, 0);
  for (let i = 0; i < 7; i++) {
    housings.add(top.x - 20 + i * 8, 31, top.z, 1.4, 2, 8);
    bars.add(top.x - 20 + i * 8, 29.9, top.z, 1.4, .18, 8);
  }
  const east = cellPosition(CORE_LAYOUT.column, CORE_LAYOUT.row);
  const core = MeshBuilder.CreatePolyhedron("Suspended computational core", { type: 1, size: 3 }, scene);
  core.position.set(east.x + CORE_LAYOUT.offsetX, CORE_LAYOUT.height, east.z);
  core.material = light;
  const rings: Mesh[] = [];
  for (let i = 0; i < CORE_LAYOUT.ringDiameters.length; i++) {
    const ring = MeshBuilder.CreateTorus(`Core orbit ${i}`, { diameter: CORE_LAYOUT.ringDiameters[i], thickness: CORE_LAYOUT.ringThickness, tessellation: 64 }, scene);
    ring.position.copyFrom(core.position);
    ring.rotation.set(.5 + i * .65, 0, i * .8);
    ring.material = i === 1 ? warm : light;
    rings.push(ring);
  }
  const gateway = new BoxBatch("Depth gates", warm);
  for (const row of [1.8, 3.2, 4.6]) {
    const p = cellPosition(4, row);
    gateway.add(p.x - 11.5, 15, p.z, .25, 28, .5);
    gateway.add(p.x + 11.5, 15, p.z, .25, 28, .5);
    gateway.add(p.x, 29, p.z, 23, .25, .5);
  }
  bars.build(scene);
  housings.build(scene);
  gateway.build(scene);
  for (const mesh of scene.meshes.slice(firstMesh)) {
    mesh.unfreezeWorldMatrix();
    mesh.parent = root;
  }
  return { root, core, rings };
}

export function updateInterior(interior: Interior, time: number): void {
  interior.core.rotation.set(time * .1, time * .17, time * .035);
  interior.rings.forEach((ring, index) => {
    ring.rotation.copyFromFloats(.5 + index * .65 + time * .06, time * .08, index * .8);
  });
}

export function createFinalCaption(scene: Scene): Mesh {
  const texture = new DynamicTexture("Final caption / AI4Fun", { width: 2048, height: 256 }, scene, true);
  texture.hasAlpha = true;
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 2048, 256);
  ctx.fillStyle = "#badbd5";
  ctx.font = '600 160px "Segoe UI", Arial, sans-serif';
  const title = "AI4Fun";
  ctx.fillText(title, (2048 - ctx.measureText(title).width) / 2, 155);
  ctx.fillStyle = "#6a948f";
  ctx.font = "24px Consolas, monospace";
  const subtitle = "T O U L O U S E   /   2 0 2 6";
  ctx.fillText(subtitle, (2048 - ctx.measureText(subtitle).width) / 2, 220);
  texture.update();
  const material = emissive(scene, "Final caption light", "#d4eee7", .75);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  const caption = MeshBuilder.CreatePlane("AI4Fun / world-space caption", { width: 700, height: 87.5 }, scene);
  caption.material = material;
  caption.position = new Vector3(0, 1, -289);
  caption.rotation.x = Math.PI / 2;
  caption.metadata = { caption: title };
  return caption;
}
