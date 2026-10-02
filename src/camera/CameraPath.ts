import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CELL, cellPosition } from "../content/title";
import { clamp, smootherstep, smoothstep } from "../engine/Timeline";

interface Keyframe { time: number; col: number; row: number; y: number }

// The entire internal route stays inside the first D. The audience never sees its plan.
const keyframes: Keyframe[] = [
  { time: 0, col: .12, row: 5.05, y: 8 },
  { time: 15, col: .04, row: 4.45, y: 9 },
  { time: 30, col: .0, row: 3.3, y: 11 },
  { time: 44, col: .03, row: 1.6, y: 12 },
  { time: 56, col: .15, row: .1, y: 14 },
  { time: 68, col: 1.5, row: .02, y: 15 },
  { time: 81, col: 2.9, row: .1, y: 11 },
  { time: 90, col: 3.05, row: .9, y: 9 },
  { time: 100, col: 3.94, row: 1.18, y: 9 },
  { time: 114, col: 4.0, row: 2.9, y: 13 },
  { time: 127, col: 4.0, row: 4.85, y: 17 },
  { time: 137, col: 3.1, row: 5.05, y: 16 },
  { time: 146, col: 3.0, row: 5.94, y: 12 },
  { time: 155, col: 2.04, row: 6.0, y: 11 },
  { time: 163, col: 2.0, row: 6.15, y: 11 },
];

const points = keyframes.map(({ col, row, y }) => {
  const { x, z } = cellPosition(col, row);
  return new Vector3(x, y, z);
});

export const EXIT = points[points.length - 1].clone();
export const TITLE_TARGET = new Vector3(0, 12, 0);

export function interiorPosition(time: number): Vector3 {
  let index = 0;
  while (index < keyframes.length - 2 && time > keyframes[index + 1].time) index++;
  const t = clamp((time - keyframes[index].time) / (keyframes[index + 1].time - keyframes[index].time));
  return Vector3.CatmullRom(
    points[Math.max(0, index - 1)], points[index], points[index + 1],
    points[Math.min(points.length - 1, index + 2)], t,
  );
}

export interface CameraPose { position: Vector3; target: Vector3; fov: number; reveal: number }

export function cameraPose(time: number, aspect = 16 / 9): CameraPose {
  const local = interiorPosition(Math.min(time, 163));
  const ahead = interiorPosition(Math.min(time + 2.4, 158));
  const turn = smoothstep((time - 150) / 13);
  const backIntoRoom = EXIT.add(new Vector3(0, 3, CELL * 1.8));
  const localTarget = Vector3.Lerp(ahead, backIntoRoom, turn);
  if (time < 163) {
    return { position: local, target: localTarget, fov: .99 + .055 * smoothstep((time - 90) / 50), reveal: 0 };
  }

  const retreat = smootherstep((time - 163) / 14);
  const rise = smootherstep((time - 164) / 12);
  const center = smoothstep((time - 166) / 10);
  // Narrow windows need more distance, not cropped letters.
  const framing = Math.max(1, (16 / 9) / aspect);
  const finalPosition = new Vector3(0, 1110 * framing, -755 * framing);
  const position = new Vector3(
    EXIT.x + (finalPosition.x - EXIT.x) * center,
    EXIT.y + (finalPosition.y - EXIT.y) * rise,
    EXIT.z + (finalPosition.z - EXIT.z) * retreat,
  );
  const target = Vector3.Lerp(backIntoRoom, TITLE_TARGET, center);
  return { position, target, fov: 1.045 - .255 * smoothstep((time - 166) / 10), reveal: retreat };
}
