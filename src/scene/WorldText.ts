import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { interiorPosition } from "../camera/CameraPath";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

interface TextLine { text: string; color?: string; size?: number }
interface TextOptions {
  name: string;
  width: number;
  height: number;
  lines: TextLine[];
  background?: string;
  border?: string;
}

export function createWorldText(scene: Scene, options: TextOptions): Mesh {
  const width = 2048;
  const height = Math.max(128, Math.min(1024, 2 ** Math.ceil(Math.log2(width * options.height / options.width))));
  const texture = new DynamicTexture(options.name, { width, height }, scene, true);
  texture.hasAlpha = true;
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, width, height);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }
  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, width - 36, height - 36);
    ctx.fillStyle = options.border;
    ctx.fillRect(18, 18, 90, 8);
    ctx.fillRect(width - 108, height - 26, 90, 8);
  }
  const spacing = (height - 48) / options.lines.length;
  options.lines.forEach((line, index) => {
    const desired = Math.min(line.size ?? spacing * .5, spacing * .72);
    ctx.font = `500 ${desired}px Consolas, monospace`;
    const size = Math.min(desired, desired * (width - 160) / Math.max(1, ctx.measureText(line.text).width));
    ctx.font = `500 ${size}px Consolas, monospace`;
    ctx.fillStyle = line.color ?? "#d6eee9";
    ctx.fillText(line.text, (width - ctx.measureText(line.text).width) / 2, 24 + spacing * (index + .55) + size * .32);
  });
  texture.update();
  const material = new StandardMaterial(`${options.name} typography`, scene);
  material.disableLighting = true;
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.emissiveColor = new Color3(.9, .95, 1);
  material.specularColor = Color3.Black();
  material.useAlphaFromDiffuseTexture = true;
  material.backFaceCulling = false;
  const mesh = MeshBuilder.CreatePlane(options.name, { width: options.width, height: options.height }, scene);
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

export function routeAnchor(time: number): { position: Vector3; yaw: number } {
  const position = interiorPosition(time);
  const direction = interiorPosition(time + .8).subtract(interiorPosition(time - .8));
  return { position, yaw: Math.atan2(direction.x, direction.z) };
}
