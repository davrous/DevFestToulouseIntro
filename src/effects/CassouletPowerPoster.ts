import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { DURATION } from "../engine/Timeline";
import { CASSOULET_WALL_POSTER } from "../content/showBeats";

export const CASSOULET_POWER_TITLE = "The Power Of Cassoulet!";
export const CASSOULET_POWER_POSTER = { delay: .35, width: 1536, height: 864 } as const;

export function cassouletPowerState(time: number, destroyedAt: number | undefined, enabled = true):
  { active: boolean; opacity: number } {
  if (!Number.isFinite(time) || (destroyedAt !== undefined && !Number.isFinite(destroyedAt))) {
    throw new RangeError("Cassoulet poster requires finite show and destruction times.");
  }
  const start = destroyedAt === undefined ? undefined : destroyedAt + CASSOULET_POWER_POSTER.delay;
  const active = enabled && start !== undefined && time >= start && time <= DURATION;
  return { active, opacity: active ? 1 : 0 };
}

function drawPoster(texture: DynamicTexture): void {
  const ctx = texture.getContext();
  const { width, height } = CASSOULET_POWER_POSTER;
  const ink = "#151421";
  const ellipse = (x: number, y: number, rx: number, ry: number, rotation = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(rx, ry);
    ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore();
  };
  const curve = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let step = 1; step <= 24; step++) {
      const t = step / 24, s = 1 - t;
      ctx.lineTo(s ** 3 * x0 + 3 * s * s * t * x1 + 3 * s * t * t * x2 + t ** 3 * x3,
        s ** 3 * y0 + 3 * s * s * t * y1 + 3 * s * t * t * y2 + t ** 3 * y3);
    }
  };
  const centeredText = (text: string, x: number, y: number) => ctx.fillText(text, x - ctx.measureText(text).width / 2, y);
  const polygon = (points: readonly number[], fill: string, stroke = ink, lineWidth = 10) => {
    ctx.beginPath(); ctx.moveTo(points[0], points[1]);
    for (let index = 2; index < points.length; index += 2) ctx.lineTo(points[index], points[index + 1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke();
  };
  const headline = (text: string, x: number, y: number, size: number, color: string, maxWidth: number) => {
    ctx.font = `900 italic ${size}px Impact, "Arial Black", sans-serif`;
    const fitted = Math.min(size, size * maxWidth / Math.max(1, ctx.measureText(text).width));
    ctx.font = `900 italic ${fitted}px Impact, "Arial Black", sans-serif`;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#bd2435"; ctx.lineWidth = 22; ctx.strokeText(text, x + 8, y + 9);
    ctx.strokeStyle = ink; ctx.lineWidth = 19; ctx.strokeText(text, x, y);
    ctx.strokeStyle = "#fff8dc"; ctx.lineWidth = 5; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffe8ab"; ctx.fillRect(18, 18, width - 36, height - 36);
  ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = ink;
  for (let y = 36; y < height - 20; y += 24) {
    for (let x = 36; x < width - 20; x += 24) {
      ctx.beginPath(); ctx.arc(x + (y % 48 ? 12 : 0), y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  for (let index = 0; index < 56; index++) {
    const angle = index * Math.PI * 2 / 56;
    const inner = 320 + index % 5 * 22;
    ctx.beginPath(); ctx.moveTo(410 + Math.cos(angle) * inner, 440 + Math.sin(angle) * inner);
    ctx.lineTo(410 + Math.cos(angle) * 1700, 440 + Math.sin(angle) * 1700);
    ctx.strokeStyle = index % 3 ? "#251b28" : "#b72635";
    ctx.lineWidth = index % 3 ? 2 + index % 5 : 7; ctx.stroke();
  }
  const burst: number[] = [];
  for (let index = 0; index < 40; index++) {
    const angle = index / 40 * Math.PI * 2;
    const radius = index % 2 ? 325 : 405;
    burst.push(400 + Math.cos(angle) * radius, 445 + Math.sin(angle) * radius);
  }
  polygon(burst, "#f34a36", ink, 12);
  ctx.save(); ctx.translate(160, 190); ctx.rotate(-.22);
  headline("BOUM!", 0, 0, 88, "#fff5dc", 330); ctx.restore();

  ctx.save(); ctx.translate(285, 390); ctx.scale(.8, .8);
  ctx.save(); ctx.rotate(-.36);
  ctx.fillStyle = "#b97836"; ctx.strokeStyle = ink; ctx.lineWidth = 13;
  ctx.fillRect(-15, -275, 30, 440); ctx.strokeRect(-15, -275, 30, 440);
  ctx.beginPath(); ellipse(0, -300, 49, 76); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#e4b16d"; ctx.lineWidth = 6;
  ctx.beginPath(); ellipse(0, -300, 29, 53); ctx.stroke();
  ctx.restore();
  polygon([-95, -110, -278, 185, -170, 164, -64, 250, 66, 196, 105, -100], "#bd1d37", ink, 12);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    ctx.beginPath(); ctx.moveTo(103, -48);
    curve(103, -48, 172, -17, 211, -61, 187, -115);
    ctx.lineTo(166, -155); ctx.lineTo(191, -182); ctx.lineTo(224, -163);
    curve(224, -163, 277, -98, 265, -1, 193, 25);
    curve(193, 25, 160, 36, 117, 32, 96, 14);
    ctx.closePath(); ctx.fillStyle = "#dca55f"; ctx.strokeStyle = ink; ctx.lineWidth = 13; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ellipse(210, -178, 42, 35, -.2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 6;
    for (let finger = 0; finger < 3; finger++) {
      ctx.beginPath(); ctx.moveTo(191 + finger * 15, -193); ctx.lineTo(190 + finger * 15, -174); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(177, -14, 28, Math.PI, Math.PI * 1.8); ctx.stroke();
    ctx.restore();
  }
  const steel = ctx.createLinearGradient(-125, 0, 125, 0);
  steel.addColorStop(0, "#71939c"); steel.addColorStop(.22, "#d3e5df");
  steel.addColorStop(.72, "#f0f4dd"); steel.addColorStop(1, "#78959d");
  ctx.fillStyle = steel; ctx.strokeStyle = ink; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(-125, -145); ctx.lineTo(125, -145); ctx.lineTo(125, 151);
  curve(125, 151, 99, 188, -99, 188, -125, 151); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ellipse(0, -145, 125, 34); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ellipse(0, -150, 33, 12, -.2);
  ctx.fillStyle = "#54727a"; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = "#f5cd62"; ctx.fillRect(-118, -101, 236, 218);
  ctx.strokeStyle = "#b62635"; ctx.lineWidth = 9; ctx.strokeRect(-117, -100, 234, 218);
  ctx.font = '900 35px Impact, "Arial Black", sans-serif'; ctx.fillStyle = ink;
  centeredText("CASSOULET", 0, -56);
  ctx.lineWidth = 10;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 17, -5); ctx.lineTo(side * 65, -24); ctx.stroke();
    ctx.beginPath(); ellipse(side * 40, 12, 10, 17); ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(-35, 62); ctx.quadraticCurveTo(0, 90, 35, 57);
  ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.stroke();
  ctx.font = '900 23px "Arial Black", sans-serif'; centeredText("TOULOUSE EDITION", 0, 145);
  ctx.restore();

  ctx.save(); ctx.translate(545, 665);
  ctx.strokeStyle = ink; ctx.lineWidth = 19;
  const limb = (points: readonly number[]) => {
    ctx.beginPath(); ctx.moveTo(points[0], points[1]);
    for (let index = 2; index < points.length; index += 2) ctx.lineTo(points[index], points[index + 1]);
    ctx.strokeStyle = ink; ctx.lineWidth = 19; ctx.stroke();
    ctx.strokeStyle = "#b9c9cd"; ctx.lineWidth = 9; ctx.stroke();
  };
  limb([-24, 0, -62, 42, -109, 49]); limb([24, 0, 58, 38, 101, 69]);
  polygon([-126, 40, -99, 38, -88, 59, -130, 63], "#a1b5bc", ink, 7);
  polygon([88, 59, 113, 56, 134, 76, 91, 82], "#a1b5bc", ink, 7);
  limb([-49, -74, -85, -28, -133, -12]); limb([49, -74, 91, -40, 119, -107]);
  for (const [x, y] of [[-49, -74], [49, -74], [-62, 42], [58, 38], [-85, -28], [91, -40]]) {
    ctx.beginPath(); ellipse(x, y, 13, 13); ctx.fillStyle = "#526572"; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.stroke();
  }
  ctx.strokeStyle = "#754925"; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(119, -98); ctx.lineTo(119, -222); ctx.stroke();
  polygon([119, -222, 181, -237, 172, -189, 119, -178], "#fffdf1", ink, 6);
  ctx.fillStyle = "#b85a2c"; ctx.beginPath(); ellipse(146, -206, 12, 17, .4); ctx.fill();
  polygon([-46, -94, 47, -94, 34, -9, -32, -9], "#536572", ink, 9);
  ctx.strokeStyle = "#d9e3dd"; ctx.lineWidth = 7;
  for (let rib = 0; rib < 5; rib++) {
    ctx.beginPath(); ctx.moveTo(-35, -80 + rib * 13); ctx.lineTo(36, -80 + rib * 13); ctx.stroke();
  }
  ctx.fillStyle = ink; ctx.fillRect(-20, -94, 39, 82);
  ctx.font = '900 21px "Arial Black", sans-serif'; ctx.fillStyle = "#f4e8d1";
  centeredText("T-800", 0, -31);
  limb([0, -94, 0, -121]);
  ctx.save(); ctx.rotate(.14);
  polygon([-66, -188, -44, -228, 46, -224, 67, -187, 56, -130, 27, -108, -29, -113, -61, -143],
    "#bbc9cc", ink, 9);
  polygon([-54, -182, -9, -190, -13, -154, -45, -151], "#293541", ink, 5);
  polygon([9, -188, 54, -181, 45, -149, 12, -153], "#293541", ink, 5);
  ctx.strokeStyle = "#e71e3d"; ctx.lineWidth = 8;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * 32 - 10, -178); ctx.lineTo(side * 32 + 10, -158);
    ctx.moveTo(side * 32 + 10, -178); ctx.lineTo(side * 32 - 10, -158); ctx.stroke();
  }
  polygon([-8, -156, 10, -156, 17, -139, -13, -139], "#42525c", ink, 5);
  ctx.fillStyle = "#34434d"; ctx.fillRect(-32, -131, 66, 14);
  ctx.strokeStyle = "#e4ece3"; ctx.lineWidth = 4;
  for (let tooth = -24; tooth <= 28; tooth += 10) {
    ctx.beginPath(); ctx.moveTo(tooth, -130); ctx.lineTo(tooth, -117); ctx.stroke();
  }
  ctx.save(); ctx.translate(0, -245); ctx.rotate(-.25);
  ctx.fillStyle = "#f2cd63"; ctx.strokeStyle = ink; ctx.lineWidth = 7;
  ctx.fillRect(-58, -28, 116, 61); ctx.strokeRect(-58, -28, 116, 61);
  ctx.beginPath(); ellipse(0, -28, 58, 13); ctx.fillStyle = "#99aeb4"; ctx.fill(); ctx.stroke();
  ctx.font = '900 16px "Arial Black", sans-serif'; ctx.fillStyle = ink; centeredText("CASSOULET", 0, 14);
  ctx.restore();
  for (let bean = 0; bean < 4; bean++) {
    ctx.beginPath(); ellipse(-37 + bean * 23, -213 + bean % 2 * 10, 8, 13, .4);
    ctx.fillStyle = "#a85d2b"; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore(); ctx.restore();
  ctx.save(); ctx.translate(115, 680); ctx.rotate(-.07);
  ctx.fillStyle = ink; ctx.fillRect(-10, -32, 303, 52);
  ctx.fillStyle = "#fff4d7"; ctx.font = '900 25px "Arial Black", sans-serif';
  ctx.fillText("T-800: 0 / TERROIR: 1", 0, 3); ctx.restore();

  polygon([728, 204, 1482, 194, 1461, 607, 827, 611, 705, 687, 746, 535], "#fff9df", ink, 14);
  const words = CASSOULET_POWER_TITLE.split(" ");
  headline(words.slice(0, 3).join(" "), 790, 355, 116, "#fff8dd", 646);
  headline(words.slice(3).join(" "), 759, 520, 142, "#ffcf3d", 690);
  ctx.save(); ctx.translate(883, 666); ctx.rotate(-.045);
  ctx.fillStyle = ink; ctx.fillRect(-20, -46, 578, 66);
  ctx.font = '900 34px "Arial Black", sans-serif'; ctx.fillStyle = "#fff4cb";
  ctx.fillText("4.80 GB OF PURE POWER", 0, 0); ctx.restore();
  ctx.save(); ctx.translate(1110, 116); ctx.rotate(.08);
  headline("K.O.!", 0, 0, 90, "#f73649", 300); ctx.restore();
  ctx.fillStyle = ink; ctx.fillRect(32, 756, width - 64, 72);
  ctx.font = '900 italic 34px "Arial Black", sans-serif'; ctx.fillStyle = "#fff6d8";
  ctx.fillText("LE TERROIR CONTRE-ATTAQUE.", 65, 804);
  ctx.font = "bold 30px Consolas, monospace"; ctx.fillText("$ npm install victoire", 1010, 803);
  ctx.strokeStyle = ink; ctx.lineWidth = 22; ctx.strokeRect(20, 20, width - 40, height - 40);
  texture.update();
}

export class CassouletPowerPoster {
  readonly artwork: DynamicTexture;
  readonly root: TransformNode;
  readonly mesh;
  readonly frame;
  private state = cassouletPowerState(0, undefined);

  constructor(scene: Scene) {
    this.artwork = new DynamicTexture("Cassoulet / original manga victory artwork",
      { width: CASSOULET_POWER_POSTER.width, height: CASSOULET_POWER_POSTER.height },
      scene, false, Texture.BILINEAR_SAMPLINGMODE);
    this.artwork.hasAlpha = true;
    this.artwork.wrapU = this.artwork.wrapV = Texture.CLAMP_ADDRESSMODE;
    drawPoster(this.artwork);
    this.root = new TransformNode("Cassoulet / wall-mounted manga victory", scene);
    this.root.position.set(CASSOULET_WALL_POSTER.x, CASSOULET_WALL_POSTER.y, CASSOULET_WALL_POSTER.z);
    this.root.rotation.y = CASSOULET_WALL_POSTER.yaw;
    const height = CASSOULET_WALL_POSTER.width * CASSOULET_POWER_POSTER.height / CASSOULET_POWER_POSTER.width;
    this.mesh = MeshBuilder.CreatePlane("Cassoulet / manga wall poster",
      { width: CASSOULET_WALL_POSTER.width, height }, scene);
    this.mesh.parent = this.root;
    this.mesh.isPickable = false;
    const paper = new StandardMaterial("Cassoulet / printed manga artwork", scene);
    paper.disableLighting = true;
    paper.diffuseColor.set(0, 0, 0); paper.specularColor.set(0, 0, 0); paper.emissiveColor.set(0, 0, 0);
    paper.emissiveTexture = this.artwork;
    paper.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;
    this.mesh.material = paper;
    const depth = CASSOULET_WALL_POSTER.x - CASSOULET_WALL_POSTER.wallX;
    this.frame = MeshBuilder.CreateBox("Cassoulet / manga wall mounting frame",
      { width: CASSOULET_WALL_POSTER.width + .4, height: height + .4, depth }, scene);
    this.frame.parent = this.root;
    this.frame.position.z = depth / 2 + .03;
    this.frame.isPickable = false;
    const frameMaterial = new StandardMaterial("Cassoulet / dark wall frame", scene);
    frameMaterial.disableLighting = true;
    frameMaterial.diffuseColor.set(.035, .045, .055); frameMaterial.emissiveColor.set(.008, .01, .012);
    this.frame.material = frameMaterial;
    scene.onDisposeObservable.addOnce(() => this.artwork.dispose());
    this.update(0, undefined);
  }

  update(time: number, destroyedAt: number | undefined, enabled = true): void {
    this.state = cassouletPowerState(time, destroyedAt, enabled);
    this.root.setEnabled(this.state.active);
  }
}
