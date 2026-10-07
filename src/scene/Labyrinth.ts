import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CELL, HEIGHT, ROOF_THICKNESS, SEED, cellPosition, createTitleCells, seededRandom, type TitleCell } from "../content/title";
import { BoxBatch } from "./Instances";

function metal(scene: Scene, name: string, hex: string, metallic: number, roughness: number): PBRMaterial {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = Color3.FromHexString(hex);
  material.metallic = metallic;
  material.roughness = roughness;
  material.emissiveColor = Color3.FromHexString(hex).scale(.075);
  return material;
}

export function emissive(scene: Scene, name: string, color: string, strength = 1): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.FromHexString(color).scale(strength);
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  return material;
}

export interface Labyrinth {
  meshes: Mesh[];
  bridge: TransformNode;
  cyan: StandardMaterial;
  amber: StandardMaterial;
  roof: PBRMaterial;
  cellCount: number;
}

export function isArcadeExit(cell: TitleCell, dc: number, dr: number): boolean {
  return cell.line === 1 && cell.letter === 0 && cell.col === 1 && cell.row === 9 && dc === 1 && dr === 0;
}

export const BRIDGE_CELLS = [9, 8, 7].map((row) => ({ col: 2, row })) as readonly { col: number; row: number }[];

export function bridgeVisible(time: number): boolean {
  return time >= 0 && time <= 180;
}

function createBridge(scene: Scene): TransformNode {
  const root = new TransformNode("Arcade / force-field bridge", scene);
  const light = emissive(scene, "Bridge / visible connector", "#72ffe0", 2.3);
  const lights = new BoxBatch("FX/Bridge / circuit traces", light);
  const field = new StandardMaterial("Bridge / transparent floor field", scene);
  field.disableLighting = true;
  field.diffuseColor = Color3.FromHexString("#18313a");
  field.emissiveColor = Color3.FromHexString("#174b52");
  field.alpha = .4;
  field.backFaceCulling = false;
  const decks = new BoxBatch("Bridge / transparent force field", field);
  for (const { col, row } of BRIDGE_CELLS) {
    const { x, z } = cellPosition(col, row);
    decks.add(x - (row === 9 ? 1.5 : 0), -.1, z + (row === 7 ? 1.5 : 0),
      CELL + (row === 9 ? 3 : 0), .16, CELL + (row === 7 ? 3 : 0));
    for (const offset of [-CELL / 2 + 1, CELL / 2 - 1]) {
      lights.add(x + offset, .08, z, 1.4, .12, CELL);
    }
    lights.add(x, .08, z, CELL, .12, 1.4);
    if (row === 9) lights.add(x - CELL / 2, .08, z, 3, .12, CELL);
    if (row === 7) lights.add(x, .08, z + CELL / 2, CELL, .12, 3);
  }
  for (const batch of [decks, lights]) {
    const mesh = batch.build(scene);
    mesh.unfreezeWorldMatrix();
    mesh.parent = root;
  }
  return root;
}

export function createLabyrinth(scene: Scene): Labyrinth {
  const shell = metal(scene, "Titanium / outer shell", "#304851", .56, .39);
  const floor = metal(scene, "Brushed graphite / floor", "#253e49", .46, .44);
  const roof = metal(scene, "Ceramic alloy / upper deck", "#1d3742", .58, .32);
  const deckTexture = new DynamicTexture("Etched deck plating", { width: 512, height: 512 }, scene, true);
  const ctx = deckTexture.getContext();
  ctx.fillStyle = "#789096";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#334e58";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 488, 488);
  ctx.strokeRect(30, 30, 452, 452);
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const x = 65 + i * 47;
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, 130 + i * 21);
    ctx.lineTo(x + 22, 152 + i * 21);
    ctx.lineTo(x + 22, 480);
    ctx.stroke();
    ctx.fillStyle = "#28434c";
    ctx.fillRect(x - 4, 64, 9, 22);
    ctx.fillRect(x + 18, 419, 9, 22);
  }
  deckTexture.update();
  roof.albedoTexture = deckTexture;
  const ribMaterial = metal(scene, "Structural ribs", "#607c83", .65, .32);
  const panelMaterial = metal(scene, "Inset obsidian panels", "#111f29", .3, .55);
  const cyan = emissive(scene, "Ion / cyan", "#72ffe0", 1.4);
  const amber = emissive(scene, "Rose / Toulouse", "#ffa67a", 1.35);
  const white = emissive(scene, "White running lights", "#c6e8e2", 1.1);
  const bodies = new BoxBatch("Letter boundary walls", shell);
  const decks = new BoxBatch("Letter floors", floor);
  const roofs = new BoxBatch("Letter roofs", roof);
  const ribs = new BoxBatch("Architectural ribs", ribMaterial);
  const panels = new BoxBatch("Recessed panels", panelMaterial);
  const cyanLines = new BoxBatch("First line / light traces", cyan);
  const amberLines = new BoxBatch("Second line / light traces", amber);
  const lamps = new BoxBatch("Wayfinding luminaires", white);
  const random = seededRandom(SEED);
  const cells = createTitleCells();
  const occupied = new Set(cells.map(({ col, row }) => `${col},${row}`));

  for (const cell of cells) {
    const { x, z, col, row, line, letter } = cell;
    const neon = line === 0 ? cyanLines : amberLines;
    decks.add(x, -1.4, z, CELL, 2.8, CELL);
    roofs.add(x, HEIGHT, z, CELL - .15, ROOF_THICKNESS, CELL - .15);
    roofs.add(x, HEIGHT + 1.35, z, CELL - 3, .4, CELL - 3);
    neon.add(x, HEIGHT + 1.65, z + CELL / 2 - 1.4, CELL - 2.8, .16, .22);
    neon.add(x - CELL / 2 + 1.4, HEIGHT + 1.65, z, .22, .16, CELL - 2.8);
    if (random() > .35) {
      panels.add(x + 5, HEIGHT + 1.65, z, 5, .5, 14);
      neon.add(x + 4, HEIGHT + 2, z, .35, .25, 11);
    }
    const internal = line === 0 && letter === 0;
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (occupied.has(`${col + dc},${row + dr}`)) continue;
      const wx = x + dc * CELL / 2;
      const wz = z - dr * CELL / 2;
      const alongX = dr !== 0;
      const exit = internal && col === 2 && row === 6 && dr === 1;
      const arcadeExit = isArcadeExit(cell, dc, dr);
      const wallWidth = alongX ? CELL : 1.5;
      const wallDepth = alongX ? 1.5 : CELL;
      if (!exit && !arcadeExit) {
        bodies.add(wx, HEIGHT / 2, wz, wallWidth, HEIGHT, wallDepth);
      } else if (exit) {
        bodies.add(wx, 29, wz, CELL, 10, 1.5);
        bodies.add(wx - 12, 12, wz, 4, 24, 1.5);
        bodies.add(wx + 12, 12, wz, 4, 24, 1.5);
        neon.add(wx, 24, wz - 1, 20, .5, .5);
        neon.add(wx - 10, 12, wz - 1, .5, 24, .5);
        neon.add(wx + 10, 12, wz - 1, .5, 24, .5);
      }
      neon.add(wx, HEIGHT + 1.85, wz, alongX ? CELL : 1.2, .6, alongX ? 1.2 : CELL);
      if (!exit && !arcadeExit) {
        neon.add(wx - dc, 3, wz + dr, alongX ? CELL : .25, .25, alongX ? .25 : CELL);
        neon.add(wx - dc, HEIGHT - 4, wz + dr, alongX ? CELL : .35, .32, alongX ? .35 : CELL);
      }
      if (!internal || exit) continue;
      for (const offset of [-10, -3.33, 3.33, 10]) {
        const px = wx + (alongX ? offset : -dc * 1.2);
        const pz = wz + (alongX ? dr * 1.2 : offset);
        ribs.add(px, 16.5, pz, alongX ? .55 : 1, 31, alongX ? 1 : .55);
        neon.add(px - dc * .6, 14.5, pz + dr * .6, alongX ? .14 : .15, 14, alongX ? .15 : .14);
        panels.add(px + (alongX ? 2.7 : -dc * .1), 15, pz + (alongX ? dr * .1 : 2.7), alongX ? 4.3 : .4, 18, alongX ? .4 : 4.3);
        lamps.add(px - dc * .6, 6, pz + dr * .6, alongX ? 2.1 : .2, .18, alongX ? .2 : 2.1);
      }
    }
    if (internal) {
      // Frames sit on cell boundaries, leaving the camera's central lane unobstructed.
      for (const offset of [-CELL / 2 + 1.2, CELL / 2 - 1.2]) {
        ribs.add(x + offset, HEIGHT - 2.7, z, .55, 2, CELL);
        ribs.add(x, HEIGHT - 2.7, z + offset, CELL, 2, .55);
      }
      for (const offset of [-8.5, 8.5]) {
        cyanLines.add(x + offset, .075, z, .14, .12, CELL - 1);
        cyanLines.add(x, .075, z + offset, CELL - 1, .12, .14);
      }
      panels.add(x, -.015, z, 6, .04, 22);
      for (let i = -2; i <= 2; i++) {
        lamps.add(x + i * .45, .06, z + 7, .14, .06, 1.5);
      }
    }
  }
  const meshes = [bodies, decks, roofs, ribs, panels, cyanLines, amberLines, lamps].map((batch) => batch.build(scene));
  const bridge = createBridge(scene);
  return { meshes, bridge, cyan, amber, roof, cellCount: cells.length };
}
