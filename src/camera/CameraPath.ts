import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CELL, cellPosition } from "../content/title";
import { clamp, smootherstep, smoothstep } from "../engine/Timeline";
import { SPEAKERS } from "../content/speakers";
import { cueEnvelope } from "../content/cues";

interface Keyframe { time: number; col: number; row: number; y: number }

// Arcade boot in the T, then enter the D for a faster pass along its original circuit.
const keyframes: Keyframe[] = [
  { time: 0, col: -1, row: 15, y: 8 },
  { time: 10, col: -1, row: 13.6, y: 9 },
  { time: 20, col: -1, row: 12.1, y: 10 },
  { time: 28, col: -1, row: 10.7, y: 11 },
  { time: 34, col: -1, row: 9.3, y: 12 },
  { time: 39, col: 0, row: 9, y: 12 },
  { time: 44, col: 1, row: 9, y: 11 },
  { time: 49, col: 2, row: 9, y: 11 },
  { time: 53, col: 2.1, row: 8, y: 12 },
  { time: 57, col: 2.1, row: 7, y: 12 },
  { time: 61, col: 1.95, row: 6, y: 12 },
  { time: 65, col: .65, row: 6, y: 11 },
  { time: 70, col: .12, row: 5.05, y: 8 },
  { time: 76, col: .04, row: 4.45, y: 9 },
  { time: 82, col: 0, row: 3.3, y: 11 },
  { time: 89, col: .03, row: 1.6, y: 12 },
  { time: 95, col: .15, row: .1, y: 14 },
  { time: 102, col: 1.5, row: .02, y: 15 },
  { time: 109, col: 2.9, row: .1, y: 11 },
  { time: 115, col: 3.05, row: .9, y: 9 },
  { time: 121, col: 3.94, row: 1.18, y: 9 },
  { time: 128, col: 4, row: 2.3, y: 13 },
  { time: 135, col: 4, row: 3.8, y: 17 },
  { time: 140, col: 4, row: 4.85, y: 17 },
  { time: 144, col: 3.1, row: 5.05, y: 16 },
  { time: 148, col: 3.0, row: 5.94, y: 12 },
  { time: 153, col: 2.04, row: 6.0, y: 11 },
  { time: 159, col: 2.0, row: 6.15, y: 11 },
];

const points = keyframes.map(({ col, row, y }) => {
  const { x, z } = cellPosition(col, row);
  return new Vector3(x, y, z);
});

export const EXIT = points[points.length - 1].clone();
export const TITLE_TARGET = new Vector3(0, 12, 0);

const attentionCues = [
  { start: 4, end: 13, anchor: 16, height: 15 },
  { start: 41, end: 46, anchor: 47, height: 16 },
  { start: 89, end: 94, col: .15, row: -.39, height: 19 },
];

export function interiorPosition(time: number): Vector3 {
  let index = 0;
  while (index < keyframes.length - 2 && time > keyframes[index + 1].time) index++;
  const t = clamp((time - keyframes[index].time) / (keyframes[index + 1].time - keyframes[index].time));
  return Vector3.CatmullRom(
    points[Math.max(0, index - 1)], points[index], points[index + 1],
    points[Math.min(points.length - 1, index + 2)], t,
  );
}

export function routeAnchor(time: number, lateralOffset = 0): { position: Vector3; yaw: number } {
  const position = interiorPosition(time);
  const direction = interiorPosition(time + .8).subtract(interiorPosition(time - .8));
  const yaw = Math.atan2(direction.x, direction.z);
  position.x += Math.cos(yaw) * lateralOffset;
  position.z -= Math.sin(yaw) * lateralOffset;
  return { position, yaw };
}

export interface CameraPose { position: Vector3; target: Vector3; fov: number; reveal: number }

function focusCamera(position: Vector3, target: Vector3, focus: Vector3, weight: number): void {
  const forward = target.subtract(position).normalize();
  const toward = focus.subtract(position).normalize();
  target.copyFrom(Vector3.Lerp(forward, toward, weight).normalize().scale(20).add(position));
}

export function cameraPose(time: number, aspect = 16 / 9): CameraPose {
  const local = interiorPosition(Math.min(time, 159));
  const ahead = interiorPosition(Math.min(time + 2.4, 159));
  const turn = smoothstep((time - 147) / 12);
  const backIntoRoom = EXIT.add(new Vector3(0, 3, CELL * 1.8));
  const localTarget = Vector3.Lerp(ahead, backIntoRoom, turn);
  if (time < 159) {
    const speaker = SPEAKERS.find((speaker) => time >= speaker.startTime - 2 && time < speaker.gateTime - 2);
    if (speaker) {
      const focus = routeAnchor(speaker.gateTime, speaker.lateralOffset).position;
      focus.y = Math.min(25, focus.y + 6.5) - 1.5;
      const weight = cueEnvelope(time, speaker.startTime - 2, speaker.gateTime - 2, 3);
      focusCamera(local, localTarget, focus, weight * .92);
    } else {
      const cue = attentionCues.find((cue) => time >= cue.start && time < cue.end);
      if (cue) {
        const point = "anchor" in cue && cue.anchor !== undefined
          ? interiorPosition(cue.anchor)
          : new Vector3(cellPosition(cue.col!, cue.row!).x, 0, cellPosition(cue.col!, cue.row!).z);
        point.y = cue.height;
        const weight = cueEnvelope(time, cue.start, cue.end, Math.min(3, (cue.end - cue.start) / 2));
        focusCamera(local, localTarget, point, weight * .85);
      }
    }
    const arcadePulse = .06 * cueEnvelope(time, 31, 34, .5);
    const warp = .08 * cueEnvelope(time, 47, 61, 2);
    return { position: local, target: localTarget,
      fov: .99 + .055 * smoothstep((time - 90) / 50) + arcadePulse + warp, reveal: 0 };
  }

  const retreat = smootherstep((time - 159) / 12);
  const rise = smootherstep((time - 160) / 11);
  const center = smoothstep((time - 161) / 10);
  // Narrow windows need more distance, not cropped letters.
  const framing = Math.max(1, (16 / 9) / aspect);
  const finalPosition = new Vector3(0, 1110 * framing, -755 * framing);
  const position = new Vector3(
    EXIT.x + (finalPosition.x - EXIT.x) * center,
    EXIT.y + (finalPosition.y - EXIT.y) * rise,
    EXIT.z + (finalPosition.z - EXIT.z) * retreat,
  );
  const target = Vector3.Lerp(backIntoRoom, TITLE_TARGET, center);
  return { position, target, fov: 1.045 - .255 * smoothstep((time - 161) / 10), reveal: retreat };
}
