import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { ICanvasRenderingContext } from "@babylonjs/core/Engines/ICanvas";
import type { Scene } from "@babylonjs/core/scene";
import type { ProceduralArcadeGame } from "./config";
import type { ArcadeScreenMedia } from "./ArcadeScreenMedia";

const WIDTH = 320;
const HEIGHT = 200;
const FRAME_RATE = 12;
type ArcadeDrawingContext = ICanvasRenderingContext & {
  imageSmoothingEnabled?: boolean;
  textBaseline?: CanvasTextBaseline;
};

export function proceduralFrame(time: number): number {
  return Math.floor(time * FRAME_RATE);
}

function colorRect(context: ArcadeDrawingContext, x: number, y: number, width: number, height: number, color: string): void {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.ceil(width), Math.ceil(height));
}

function label(context: ArcadeDrawingContext, text: string, x: number, y: number, color: string, size = 8): void {
  context.fillStyle = color;
  context.font = `bold ${size}px monospace`;
  context.textBaseline = "top";
  context.fillText(text, x, y);
}

function drawHero(context: ArcadeDrawingContext, x: number, y: number, step: number): void {
  const stride = step % 2 ? 2 : 0;
  colorRect(context, x + 3, y, 10, 4, "#f5c46a");
  colorRect(context, x + 1, y + 3, 14, 8, "#f2d5a3");
  colorRect(context, x + 2, y + 5, 2, 2, "#1a173b");
  colorRect(context, x + 10, y + 5, 2, 2, "#1a173b");
  colorRect(context, x + 4, y + 10, 9, 8, "#59d5b1");
  colorRect(context, x + 6, y + 12, 5, 2, "#f7e7b0");
  colorRect(context, x + 5, y + 18, 3, 7, "#e96762");
  colorRect(context, x + 10, y + 18, 3, 7, "#e96762");
  colorRect(context, x + 3 - stride, y + 24, 6 + stride, 3, "#f6d474");
  colorRect(context, x + 9 + stride, y + 24, 6 - stride, 3, "#f6d474");
}

function drawAnniversary(context: ArcadeDrawingContext, time: number): void {
  const phase = ((time % 12) + 12) % 12;
  const frame = proceduralFrame(time);
  colorRect(context, 0, 0, WIDTH, HEIGHT, "#17103a");
  for (let index = 0; index < 34; index++) {
    const x = (index * 47 + 13) % WIDTH, y = 18 + index * 19 % 72;
    colorRect(context, x, y, index % 4 === 0 ? 2 : 1, 1, index % 3 ? "#7260bc" : "#ffd46e");
  }
  colorRect(context, 0, 88, WIDTH, 43, "#28215c");
  colorRect(context, 0, 112, WIDTH, 12, "#1a3b70");
  colorRect(context, 0, 124, WIDTH, 16, "#15506c");
  colorRect(context, 0, 157, WIDTH, 43, "#5b2c52");
  colorRect(context, 0, 153, WIDTH, 7, "#72bd65");

  colorRect(context, 24, 92, 82, 45, "#cf704b");
  colorRect(context, 38, 77, 54, 18, "#cf704b");
  colorRect(context, 45, 59, 40, 22, "#f1a05b");
  colorRect(context, 52, 48, 27, 16, "#72a8dc");
  colorRect(context, 60, 38, 11, 12, "#e5bd68");
  colorRect(context, 68, 34, 3, 8, "#fff0a0");
  for (let arch = 0; arch < 4; arch++) {
    colorRect(context, 32 + arch * 17, 107, 6, 21, "#583657");
    colorRect(context, 34 + arch * 17, 109, 2, 14, "#f3bb72");
  }
  for (let pier = 0; pier < 4; pier++) {
    const x = 174 + pier * 35;
    colorRect(context, x, 111, 6, 43, "#c87963");
    colorRect(context, x - 7, 111, 20, 4, "#f0a36d");
    colorRect(context, x + 2, 104 + Math.sin(phase + pier) * 2, 2, 5, "#ffda77");
  }
  for (let index = 0; index < 14; index++) {
    colorRect(context, index * 24, 165, 13, 3, "#815143");
    colorRect(context, index * 24 + 8, 177, 14, 3, "#3d3150");
  }

  colorRect(context, 7, 6, 306, 21, "#0b0925");
  label(context, "DEVFEST TOULOUSE", 13, 10, "#f2e8ff", 11);
  label(context, "SCORE", 260, 8, "#f5cf72", 8);
  label(context, String(Math.min(10, Math.floor(phase * 10 / 12))).padStart(4, "0"), 270, 17, "#f5cf72", 8);
  for (let index = 0; index < 3; index++) {
    colorRect(context, 14 + index * 13, 33, 5, 5, "#f04f61");
    colorRect(context, 11 + index * 13, 36, 11, 5, "#f04f61");
    colorRect(context, 14 + index * 13, 41, 5, 4, "#f04f61");
  }
  label(context, "STAR x10", 11, 50, "#ffd75f", 8);

  colorRect(context, 98, 36, 132, 47, "#4c3b87");
  colorRect(context, 101, 39, 126, 41, "#110d30");
  label(context, "10 YEARS OF", 126, 43, "#f2e8ff", 9);
  label(context, "DEVFEST", 122, 54, "#ffd35f", 15);
  label(context, "TOULOUSE", 124, 71, "#f2e8ff", 9);

  const signs: Array<[number, string]> = [[57, "2014"], [157, "..."], [250, "2024"]];
  for (const [x, text] of signs) {
    colorRect(context, x + 13, 132, 4, 22, "#d18b53");
    colorRect(context, x, 125, 31, 14, "#f1bd6c");
    colorRect(context, x + 2, 127, 27, 10, "#6a3d50");
    label(context, text, x + 4, 129, "#fff0be", 8);
  }
  const playerX = 12 + phase / 12 * 246;
  const jump = Math.max(0, Math.sin(phase * Math.PI * 1.15)) * 13;
  drawHero(context, playerX, 126 - jump, frame % 2);
  const cakeX = 268 - phase / 12 * 32;
  colorRect(context, cakeX, 143, 21, 9, "#f4d2a0");
  colorRect(context, cakeX - 2, 140, 25, 4, "#ff83a6");
  for (let candle = 0; candle < 10; candle++) {
    colorRect(context, cakeX + candle * 2.2, 136, 1, 5, "#8de1c1");
    colorRect(context, cakeX + candle * 2.2, 134, 1, 2, "#ffdc62");
  }
  colorRect(context, 4, 184, 312, 13, "#0b0925");
  label(context, phase > 9 ? "BUILD PASSED! CAKE HAS NO DEPENDENCIES" : "10 ANS DE CODE... ENCORE EN BETA", 10, 187,
    phase > 9 ? "#90f4bf" : "#ffe1a0", 7);
}

const FPS_MAP = [
  "1111111111",
  "1000000001",
  "1011000101",
  "1000000101",
  "1000000001",
  "1011000011",
  "1000000001",
  "1000100001",
  "1000000001",
  "1111111111",
];

function drawBug(context: ArcadeDrawingContext, x: number, y: number, scale: number, frame: number): void {
  const pixel = (px: number, py: number, w: number, h: number, color: string) =>
    colorRect(context, x + px * scale, y + py * scale, w * scale, h * scale, color);
  pixel(6, 0, 6, 3, "#f7c75e");
  pixel(2, 3, 14, 4, "#d75b45");
  pixel(0, 7, 18, 9, "#843d65");
  pixel(3, 5, 4, 4, "#f6eee1");
  pixel(11, 5, 4, 4, "#f6eee1");
  pixel(4, 6, 2, 2, "#25213d");
  pixel(12, 6, 2, 2, "#25213d");
  pixel(5, 10, 8, 3, "#f0a35e");
  const leg = frame % 2 ? 1 : 0;
  pixel(-3, 8, 4, 2, "#d75b45");
  pixel(17, 8, 4, 2, "#d75b45");
  pixel(1 - leg, 15, 5, 2, "#d75b45");
  pixel(12 + leg, 15, 5, 2, "#d75b45");
}

function drawFps(context: ArcadeDrawingContext, time: number): void {
  const frame = proceduralFrame(time);
  const phase = ((time % 10) + 10) % 10;
  const playerX = 1.6 + Math.sin(time * .31) * .12;
  const playerY = 4.5 + Math.sin(time * .23) * .1;
  const angle = .015 + Math.sin(time * .4) * .12;
  const fov = 1.08;
  const columns = 160;
  const columnWidth = WIDTH / columns;
  const depths = new Float32Array(columns);
  colorRect(context, 0, 0, WIDTH, HEIGHT, "#21192b");
  colorRect(context, 0, 0, WIDTH, 96, "#241b38");
  colorRect(context, 0, 96, WIDTH, 104, "#493149");

  for (let column = 0; column < columns; column++) {
    const rayAngle = angle + (column / columns - .5) * fov;
    const dx = Math.cos(rayAngle), dy = Math.sin(rayAngle);
    let distance = .08, cell = "1";
    while (distance < 12) {
      const mapX = Math.floor(playerX + dx * distance);
      const mapY = Math.floor(playerY + dy * distance);
      cell = FPS_MAP[mapY]?.[mapX] ?? "1";
      if (cell !== "0") break;
      distance += .035;
    }
    const corrected = Math.max(.15, distance * Math.cos(rayAngle - angle));
    depths[column] = corrected;
    const wallHeight = Math.min(HEIGHT, 170 / corrected);
    const top = (HEIGHT - wallHeight) / 2;
    const shade = Math.max(.28, 1 - corrected / 11);
    const base = cell === "1" ? [210, 105, 75] : [132, 95, 169];
    const color = `rgb(${Math.floor(base[0] * shade)},${Math.floor(base[1] * shade)},${Math.floor(base[2] * shade)})`;
    colorRect(context, column * columnWidth, top, columnWidth + 1, wallHeight, color);
    if (column % 4 < 2) colorRect(context, column * columnWidth, top + wallHeight * .35,
      columnWidth + 1, 1, `rgba(255,215,155,${shade * .35})`);
  }

  const bugX = 6.7, bugY = 4.5;
  const bugAngle = Math.atan2(bugY - playerY, bugX - playerX) - angle;
  const bugDistance = Math.hypot(bugX - playerX, bugY - playerY);
  const screenX = WIDTH / 2 + Math.tan(bugAngle) / Math.tan(fov / 2) * WIDTH / 2;
  const bugScale = Math.min(4, 62 / bugDistance);
  for (let column = Math.max(0, Math.floor(screenX - 12 * bugScale)); column < Math.min(columns, Math.ceil(screenX + 12 * bugScale)); column++) {
    if (depths[column] > bugDistance) {
      const x = column * columnWidth;
      drawBug(context, x, 96 - bugScale * 8, bugScale, frame);
    }
  }

  colorRect(context, 4, 5, 312, 16, "#100d20");
  label(context, "TOULOUSE BUG HUNT '95", 10, 9, "#ffcb75", 9);
  label(context, "CAPITOLE // GARONNE", 191, 10, "#abe4cd", 7);
  colorRect(context, 4, 177, 312, 19, "#100d20");
  label(context, `HP 03   AMMO ${phase < 1 ? "09" : "08"}   BUGS ${Math.floor(phase / 2)}`, 10, 183, "#f7e5b2", 7);
  label(context, "PAUSE: CASSOULET BREAK", 190, 183, "#a9e8d1", 6);

  const bob = Math.sin(time * 7) * 2;
  colorRect(context, 255, 143 + bob, 42, 10, "#b86b3f");
  colorRect(context, 261, 140 + bob, 31, 8, "#e0a05d");
  colorRect(context, 257, 144 + bob, 38, 3, "#ffe09a");
  colorRect(context, 287, 146 + bob, 12, 5, "#f4d9a1");
  if (phase < .22) {
    colorRect(context, 276, 125, 16, 13, "#fff3ad");
    colorRect(context, 282, 120, 5, 5, "#ff925f");
  }
}

export class ArcadeProceduralMedia implements ArcadeScreenMedia {
  readonly offset = 0;
  readonly aspectRatio = WIDTH / HEIGHT;
  readonly videoHeight = HEIGHT;
  readonly texture: DynamicTexture;
  readonly poster: DynamicTexture;
  readonly game: ProceduralArcadeGame;
  frame = -1;
  private readonly context: ArcadeDrawingContext;
  private disposed = false;

  constructor(scene: Scene, game: ProceduralArcadeGame) {
    this.game = game;
    this.texture = new DynamicTexture(`Arcade / ${game} procedural screen`,
      { width: WIDTH, height: HEIGHT }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    const context: ArcadeDrawingContext = this.texture.getContext();
    context.imageSmoothingEnabled = false;
    this.context = context;
    this.texture.wrapU = this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.poster = this.texture;
    this.update(0);
  }

  update(time: number): void {
    if (this.disposed) return;
    const frame = proceduralFrame(time);
    if (frame === this.frame) return;
    this.frame = frame;
    const frameTime = frame / FRAME_RATE;
    if (this.game === "devfest-10") drawAnniversary(this.context, frameTime);
    else drawFps(this.context, frameTime);
    this.texture.update();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.texture.dispose();
  }
}
