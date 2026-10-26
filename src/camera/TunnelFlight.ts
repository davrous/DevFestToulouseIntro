import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CINEMA } from "../content/showBeats";
import { clamp, smootherstep, smoothstep } from "../engine/Timeline";
import journey from "../audio/violasJourney.json";

export const TUNNEL_ORIGIN = new Vector3(0, -1400, 0);
export const TUNNEL_RADIUS = 8.3;
export const TUNNEL_LEAD_OUT = 180;

const points: Vector3[] = [];
const corridorLength = 660;
const bendRadius = 75;
for (let index = 0; index <= 360; index++) {
  const z = index / 360 * corridorLength;
  const weave = smootherstep((z - 30) / 85) * (1 - smootherstep((z - corridorLength + 130) / 130));
  points.push(new Vector3(
    weave * (12 * Math.sin(z * .018) + 3 * Math.sin(z * .04)),
    weave * (9 * Math.sin(z * .022) + 3 * Math.sin(z * .035)), z).add(TUNNEL_ORIGIN));
}
export const TUNNEL_RIGHT_TURN_INDEX = points.length - 1;
for (let index = 1; index <= 64; index++) {
  const angle = index / 64 * Math.PI / 2;
  points.push(new Vector3(bendRadius * (1 - Math.cos(angle)), 0, corridorLength + bendRadius * Math.sin(angle)).add(TUNNEL_ORIGIN));
}
for (let index = 1; index <= 48; index++) {
  points.push(new Vector3(bendRadius + index / 48 * TUNNEL_LEAD_OUT, 0, corridorLength + bendRadius).add(TUNNEL_ORIGIN));
}
export const TUNNEL_POINTS: readonly Vector3[] = points;
export const TUNNEL_DISTANCES = [0];
for (let index = 1; index < points.length; index++) {
  TUNNEL_DISTANCES.push(TUNNEL_DISTANCES[index - 1] + Vector3.Distance(points[index - 1], points[index]));
}
export const TUNNEL_LENGTH = TUNNEL_DISTANCES[TUNNEL_DISTANCES.length - 1];
export const TUNNEL_FLIGHT_LENGTH = TUNNEL_LENGTH - 45;
export const TUNNEL_EXIT_INDEX = TUNNEL_DISTANCES.findIndex((distance) => distance >= TUNNEL_FLIGHT_LENGTH - .000001);
const motionAccents = journey.kicks.filter(([time]) => time >= CINEMA.lens - 1 && time <= CINEMA.vortexEnd + 1);
const accentWidth = .18;

function rhythmicDistance(time: number): number {
  let distance = time - CINEMA.lens;
  for (const [onset, strength] of motionAccents) {
    distance += .32 * strength * accentWidth * (
      Math.atan((time - onset) / accentWidth) - Math.atan((CINEMA.lens - onset) / accentWidth));
  }
  return distance;
}
const totalRhythmicDistance = rhythmicDistance(CINEMA.vortexEnd);

export function tunnelTravelProgress(time: number): number {
  if (!Number.isFinite(time)) throw new RangeError("Tunnel flight time must be finite.");
  // Analytic integration follows measured attacks without frame-rate drift or moving the exit cue.
  return rhythmicDistance(clamp(time, CINEMA.lens, CINEMA.vortexEnd)) / totalRhythmicDistance;
}

export function tunnelPoint(distance: number): Vector3 {
  const at = clamp(distance, 0, TUNNEL_LENGTH);
  let low = 0, high = points.length - 1;
  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (TUNNEL_DISTANCES[middle] <= at) low = middle;
    else high = middle;
  }
  const progress = (at - TUNNEL_DISTANCES[low]) / (TUNNEL_DISTANCES[high] - TUNNEL_DISTANCES[low]);
  return Vector3.Lerp(points[low], points[high], progress);
}

export function tunnelFlightPose(time: number): { position: Vector3; target: Vector3; up: Vector3; fov: number; distance: number } {
  const progress = tunnelTravelProgress(time);
  const distance = TUNNEL_FLIGHT_LENGTH * progress;
  const position = tunnelPoint(distance);
  const target = tunnelPoint(distance + 24);
  const forward = target.subtract(position).normalize();
  const right = Vector3.Cross(Vector3.Up(), forward).normalize();
  const up = Vector3.Cross(forward, right).normalize();
  const next = tunnelPoint(distance + 36).subtract(target).normalize();
  const bank = clamp(Vector3.Cross(forward, next).y * -1.8, -.18, .18)
    + Math.sin(distance * .014) * .04 * smoothstep(progress / .05) * (1 - smoothstep((progress - .82) / .18));
  return { position, target, up: up.scale(Math.cos(bank)).add(right.scale(Math.sin(bank))),
    fov: 1.26 + .08 * Math.sin(progress * Math.PI), distance };
}
