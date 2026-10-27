import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

export const CRT_PROGRAMS = [
  { style: "dos", title: "MS-DOS / DEVFEST.EXE", lines: [
    "C:\\>DIR /HYPE", "DEVFEST  EXE     180 seconds",
    "640K of RAM. Infinite ambition.", "C:\\>DEVFEST.EXE", "Loading developers... OK",
  ] },
  { style: "desktop", title: "Windows 95", lines: [
    "Installing applause...", "Time remaining: 26 years",
    "Plug and Pray: enabled", "Reboot? After the keynote.",
  ] },
  { style: "blue", title: "UNEXPECTED_APPLAUSE", lines: [
    "DEVFEST 95 / STOP 0x0000CAFE", "Your bugs are safe with us.",
    "Press F5 to blame the cache.", "CTRL + ALT + DEL? Not today.",
  ] },
  { style: "dos", title: "CONFIG.SYS", lines: [
    "DEVICE=HIMEM.SYS", "FILES=42", "BUFFERS=32",
    "REM no room for node_modules", "C:\\>coffee.exe /UNLIMITED",
  ] },
  { style: "dos", title: "TOULOUSE BBS / 14.4K", lines: [
    "ATDT 05-61-DEVFEST", "CONNECT 14400", "Downloading keynote.zip",
    "ETA: after the keynote", "NO CARRIER. ONLY DEVELOPERS.",
  ] },
  { style: "desktop", title: "Insert disk 2 of 42", lines: [
    "Installing node_modules", "Please do not eject Toulouse.",
    "Abort, Retry, Party? [P]", "Party selected.",
  ] },
  { style: "dos", title: "AUTOEXEC.BAT", lines: [
    "@ECHO OFF", "SET PATH=C:\\TOULOUSE", "chocolatine.exe /HOT",
    "Errorlevel: delicious", "C:\\>REM ship it!",
  ] },
  { style: "blue", title: "CACHE_NOT_FOUND", lines: [
    "The demo works on my 486.", "Suggested fix: more coffee.",
    "Memory dump: 42 bytes", "Audience recovery: SUCCESS",
  ] },
] as const;

export const CRT_LIGHTNING_PROGRAM = {
  style: "blue", title: "AI UPDATE / 99%", lines: [
    "Installing intelligence...", "Time remaining: 42 years",
    "Please do not unplug Toulouse.", "Fallback: more cassoulet.",
  ],
} as const;

export function createCrtMaterial(scene: Scene, index: number,
  program: (typeof CRT_PROGRAMS)[number] | typeof CRT_LIGHTNING_PROGRAM = CRT_PROGRAMS[index % CRT_PROGRAMS.length]): StandardMaterial {
  const texture = new DynamicTexture(`Cinema / retro CRT program ${index}`, { width: 1024, height: 768 }, scene, false);
  const ctx = texture.getContext();
  const desktop = program.style === "desktop";
  ctx.fillStyle = program.style === "blue" ? "#000099" : desktop ? "#167c80" : "#05130b";
  ctx.fillRect(0, 0, 1024, 768);
  if (desktop) {
    ctx.fillStyle = "#c4c4c4";
    ctx.fillRect(40, 60, 944, 600);
    ctx.fillStyle = "#000078";
    ctx.fillRect(52, 72, 920, 70);
    ctx.fillStyle = "#c4c4c4";
    ctx.fillRect(0, 690, 1024, 78);
    ctx.fillStyle = "#202020";
    ctx.font = "bold 42px Consolas, monospace";
    ctx.fillText("Start", 30, 744);
    ctx.fillText("DEVFEST.EXE", 220, 744);
    ctx.fillStyle = "#646464";
    ctx.fillRect(80, 530, 864, 48);
    ctx.fillStyle = "#000078";
    ctx.fillRect(88, 538, 610, 32);
  }
  ctx.fillStyle = program.style === "dos" ? "#80ffc0" : "#ffffff";
  ctx.font = "bold 88px Consolas, monospace";
  const titleSize = Math.min(88, 88 * 890 / Math.max(1, ctx.measureText(program.title).width));
  ctx.font = `bold ${titleSize}px Consolas, monospace`;
  ctx.fillText(program.title, desktop ? 72 : 44, desktop ? 124 : 92);
  ctx.fillStyle = desktop ? "#141414" : program.style === "blue" ? "#ffffff" : "#b6ffd6";
  program.lines.forEach((line, row) => {
    ctx.font = "64px Consolas, monospace";
    const size = Math.min(64, 64 * (desktop ? 864 : 936) / Math.max(1, ctx.measureText(line).width));
    ctx.font = `${size}px Consolas, monospace`;
    ctx.fillText(line, desktop ? 80 : 44, 210 + row * 76);
  });
  if (program.style === "dos") ctx.fillRect(44, 678, 28, 6);
  texture.update();
  const material = new StandardMaterial(`Cinema / CRT content ${index}`, scene);
  material.disableLighting = true;
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.emissiveColor = new Color3(.9, .95, 1);
  material.specularColor = Color3.Black();
  material.backFaceCulling = false;
  return material;
}

export function fitCrtScreen(screen: Mesh, television: TransformNode): void {
  const surfaces = television.getChildMeshes().filter((mesh) => /Object_[68]$/.test(mesh.name));
  const front = surfaces.find((mesh) => mesh.name.endsWith("Object_8"));
  if (!front || !screen.parent) throw new Error("CRT requires its curved front screen landmark and a support.");
  const vertices = front.getVerticesData(VertexBuffer.PositionKind);
  const indices = front.getIndices();
  if (!vertices || !indices) throw new Error("CRT front screen has no geometry.");
  front.computeWorldMatrix(true);
  const relative = front.getWorldMatrix().multiply(screen.parent.computeWorldMatrix(true).clone().invert());
  const points: Vector3[] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    points.push(Vector3.TransformCoordinates(Vector3.FromArray(vertices, i), relative));
  }
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const width = Math.max(...points.map((point) => point.x)) - minX;
  const height = Math.max(...points.map((point) => point.y)) - minY;
  if (width <= 0 || height <= 0) throw new Error("CRT front screen has invalid dimensions or orientation.");
  const data = new VertexData();
  data.positions = points.flatMap((point) => [point.x, point.y, point.z - .008]);
  data.uvs = points.flatMap((point) => [(point.x - minX) / width, (point.y - minY) / height]);
  data.indices = Array.from(indices);
  data.normals = [];
  VertexData.ComputeNormals(data.positions, data.indices, data.normals);
  data.applyToMesh(screen);
  screen.position.setAll(0);
  surfaces.forEach((mesh) => mesh.setEnabled(false));
}
