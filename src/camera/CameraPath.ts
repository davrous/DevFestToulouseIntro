import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CELL, cellPosition } from "../content/title";
import { clamp, smootherstep, smoothstep } from "../engine/Timeline";
import { SPEAKERS } from "../content/speakers";
import { cueEnvelope } from "../content/cues";
import { CINEMA, DEPLOY_ROCKET, ORBIT_LINK, rocketLift } from "../content/showBeats";

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
  { time: CINEMA.start, col: 2.01, row: 8.65, y: 11.5 },
  { time: 58, col: 2.1, row: 8, y: 12 },
  { time: 61, col: 2.1, row: 7, y: 12 },
  { time: 65, col: 1.95, row: 6, y: 12 },
  { time: 68, col: .65, row: 6, y: 11 },
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
  { start: 44.8, end: CINEMA.clap, anchor: CINEMA.clapperAnchor, height: 12, fade: 3, weight: 1 },
  { start: CINEMA.camera, end: CINEMA.lens - .4, anchor: CINEMA.lens, height: 12.5 },
];

export function interiorPosition(time: number): Vector3 {
  let index = 0;
  while (index < keyframes.length - 2 && time > keyframes[index + 1].time) index++;
  const t = clamp((time - keyframes[index].time) / (keyframes[index + 1].time - keyframes[index].time));
  if (time >= 44 && time < 58) {
    const tangent = (at: number): Vector3 => {
      const before = points[at].subtract(points[at - 1]).scale(1 / (keyframes[at].time - keyframes[at - 1].time));
      const after = points[at + 1].subtract(points[at]).scale(1 / (keyframes[at + 1].time - keyframes[at].time));
      const slope = (a: number, b: number) => a * b <= 0 ? 0 : 2 * a * b / (a + b);
      return new Vector3(slope(before.x, after.x), slope(before.y, after.y), slope(before.z, after.z));
    };
    const duration = keyframes[index + 1].time - keyframes[index].time;
    // Limit tangents around the slow clap approach; Catmull-Rom overshoots near a near-stop.
    return Vector3.Hermite(points[index], tangent(index).scale(duration),
      points[index + 1], tangent(index + 1).scale(duration), t);
  }
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
    if (time >= 59 && time < 71) {
      const angle = -Math.PI / 2 * smoothstep((time - 60) / 6) * (1 - smoothstep((time - 66) / 5));
      const foyerHeading = local.add(new Vector3(Math.sin(angle), .03, Math.cos(angle)).scale(20));
      focusCamera(local, localTarget, foyerHeading, cueEnvelope(time, 59, 71, 1.5));
    }
    const speaker = SPEAKERS.find((speaker) => time >= speaker.startTime - 2 && time < speaker.gateTime - 2);
    if (speaker) {
      const focus = routeAnchor(speaker.gateTime, speaker.lateralOffset).position;
      focus.y = Math.min(25, focus.y + 6.5) - 1.5;
      const weight = cueEnvelope(time, speaker.startTime - 2, speaker.gateTime - 2, 3);
      focusCamera(local, localTarget, focus, weight * .92);
    } else {
      for (const cue of attentionCues) {
        if (time < cue.start || time >= cue.end) continue;
        const point = interiorPosition(cue.anchor);
        point.y = cue.height;
        const weight = cueEnvelope(time, cue.start, cue.end, cue.fade ?? Math.min(3, (cue.end - cue.start) / 2));
        focusCamera(local, localTarget, point, weight * (cue.weight ?? .85));
      }
    }
    if (time >= DEPLOY_ROCKET.lookStart && time < DEPLOY_ROCKET.lookEnd) {
      const focus = routeAnchor(DEPLOY_ROCKET.time, DEPLOY_ROCKET.lateral).position;
      focus.y = 10 + rocketLift(time) * 1.35;
      focusCamera(local, localTarget, focus,
        cueEnvelope(time, DEPLOY_ROCKET.lookStart, DEPLOY_ROCKET.lookEnd, 3.5, 2.5) * .9);
    }
    if (time >= ORBIT_LINK.lookStart && time < ORBIT_LINK.lookEnd) {
      const orbit = routeAnchor(ORBIT_LINK.time);
      const focus = orbit.position.add(new Vector3(
        Math.sin(orbit.yaw) * ORBIT_LINK.depth, 0, Math.cos(orbit.yaw) * ORBIT_LINK.depth));
      focus.y = ORBIT_LINK.height;
      focusCamera(local, localTarget, focus,
        cueEnvelope(time, ORBIT_LINK.lookStart, ORBIT_LINK.lookEnd, 3.5, 5) * .9);
    }
    const arcadePulse = .06 * cueEnvelope(time, 31, 34, .5);
    const warp = .08 * Math.max(cueEnvelope(time, 46, CINEMA.clapperStart, .7),
      cueEnvelope(time, CINEMA.projector, 99, 1.2));
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
