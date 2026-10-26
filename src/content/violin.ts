import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { clamp } from "../engine/Timeline";
import journey from "../audio/violasJourney.json";

export const VIOLIN_PATTERN = [
  "......oo.........", "......o#o........", "......##.........", ".....+##.........",
  "....+.##.........", "...+..##.........", "..+...##.........", ".+...o##o........",
  "+...oo||oo.......", ".+..o#||#o.......", "..+.oo||oo.......", "...+..||.........",
  "....+o||o........", ".....+||+........", "....oo||oo.......", "...ooo||ooo......",
  "...ooo||ooo......", "....oo||oo.......", ".....o||o........", "......##.........",
] as const;
export interface ViolinBit { col: number; row: number; seed: number; color: number }
export const VIOLIN_BITS: ViolinBit[] = VIOLIN_PATTERN.flatMap((line, row) => [...line].flatMap((pixel, col) =>
  pixel === "." ? [] : [{ col, row, seed: (col * 37 + row * 97) % 61 / 61,
    color: pixel === "+" || pixel === "|" ? 2 : pixel === "o" ? 1 : 0 }]));
export const VOXEL_COUNT = VIOLIN_BITS.length;
export const VIOLIN_FALL = { start: 22, end: 38, size: .425, scale: 1.25 } as const;
export const PONG_VOLLEY = { start: 17.4, shot: 21.35, end: 23.5, centerY: 8.08, planeZ: -1.2, radius: .35 } as const;

export function violinLocalPosition(bit: ViolinBit): Vector3 {
  return new Vector3((bit.col - 7.5) * .4 * VIOLIN_FALL.scale,
    PONG_VOLLEY.centerY + (11.5 - bit.row * .36 - PONG_VOLLEY.centerY) * VIOLIN_FALL.scale, 5);
}

const volleyTimes: number[] = [PONG_VOLLEY.start];
for (const [time] of journey.beats) {
  if (time > PONG_VOLLEY.start && time < PONG_VOLLEY.shot - .3 && time - volleyTimes[volleyTimes.length - 1] >= .35) {
    volleyTimes.push(time);
  }
}
volleyTimes.push(PONG_VOLLEY.shot);

export function pongRallyPosition(time: number): Vector3 {
  if (!Number.isFinite(time)) throw new RangeError("Pong time must be finite.");
  let index = 0;
  while (index < volleyTimes.length - 2 && time > volleyTimes[index + 1]) index++;
  const phase = clamp((time - volleyTimes[index]) / (volleyTimes[index + 1] - volleyTimes[index]));
  const side = index % 2 ? 1 : -1;
  const y0 = Math.sin(index * 1.17) * 1.55, y1 = Math.sin((index + 1) * 1.17) * 1.55;
  return new Vector3(side * 5.4 * (1 - 2 * phase), y0 + (y1 - y0) * phase, PONG_VOLLEY.planeZ);
}
