import { clamp } from "../../engine/Timeline";
import type { ArcadeSettings } from "./config";

export const PINBALL_SLOPE = Math.atan(1 / 6);
export const PLAYFIELD_HEIGHT = .3355;
export const BALL_RADIUS = .009;
export const BUMPER_RADIUS = .023;
export const BUMPERS = [[-.075, -.11], [.065, -.145], [.075, .005]] as const;
export const FLIPPER_PIVOTS = [[-.095, .145], [.095, .145]] as const;
interface BallPoint { t: number; x: number; z: number; lift?: number; bumper?: number; flipper?: number }

export const PINBALL_ROUTE: readonly BallPoint[] = [
  { t: 0, x: .151, z: .263, lift: -.035 },
  { t: .65, x: .151, z: .235 },
  { t: 1.2, x: .151, z: -.205 },
  { t: 1.5, x: .09, z: -.218 },
  { t: 2, x: -.048, z: -.13, bumper: 0 },
  { t: 2.7, x: .118, z: -.048 },
  { t: 3.25, x: .087, z: -.121, bumper: 1 },
  { t: 4.15, x: -.03, z: .115, flipper: 0 },
  { t: 4.5, x: -.13, z: -.03 },
  { t: 5.1, x: .045, z: -.007, bumper: 2 },
  { t: 5.7, x: -.133, z: .075 },
  { t: 6.2, x: .03, z: .115, flipper: 1 },
  { t: 6.65, x: -.048, z: -.13, bumper: 0 },
  { t: 7.2, x: .125, z: -.205 },
  { t: 7.7, x: .092, z: -.125, bumper: 1 },
  { t: 8.5, x: -.03, z: .115, flipper: 0 },
  { t: 9.2, x: .045, z: -.007, bumper: 2 },
  { t: 10, x: -.125, z: .06 },
  { t: 10.6, x: .03, z: .115, flipper: 1 },
  { t: 11.2, x: -.048, z: -.13, bumper: 0 },
  { t: 12, x: .125, z: -.05 },
  { t: 12.25, x: .125, z: .075 },
  { t: 12.6, x: 0, z: .22 },
  { t: 13, x: 0, z: .27, lift: -.035 },
  { t: 13.45, x: .151, z: .28, lift: -.035 },
  { t: 14, x: .151, z: .263, lift: -.035 },
];

export interface PinballState {
  phase: number;
  balls: { x: number; z: number; lift: number }[];
  bumpers: number[];
  flippers: number[];
  score: number;
  label: string;
  multiball: boolean;
}

export function pinballState(): PinballState {
  return { phase: 0, balls: Array.from({ length: 3 }, () => ({ x: .151, z: .27, lift: -.035 })),
    bumpers: [0, 0, 0], flippers: [0, 0], score: 0, label: "FREE PLAY", multiball: false };
}

function routePosition(time: number, ball: PinballState["balls"][number]): void {
  let at = 0;
  while (at < PINBALL_ROUTE.length - 2 && time > PINBALL_ROUTE[at + 1].t) at++;
  const a = PINBALL_ROUTE[at], b = PINBALL_ROUTE[at + 1];
  const progress = clamp((time - a.t) / (b.t - a.t));
  ball.x = a.x + (b.x - a.x) * progress;
  ball.z = a.z + (b.z - a.z) * progress;
  ball.lift = (a.lift ?? 0) + ((b.lift ?? 0) - (a.lift ?? 0)) * progress;
}

function flipperStroke(delta: number, stroke: number): number {
  if (delta < -stroke || delta > .15) return 0;
  if (delta < 0) return clamp(1 + delta / stroke);
  return delta < .035 ? 1 : 1 - clamp((delta - .035) / .115);
}

export function samplePinball(time: number, offset: number, featured: boolean, settings: ArcadeSettings,
  state: PinballState = pinballState()): PinballState {
  const clock = (time - settings.pinballStart + offset) * settings.pinballSpeed;
  const phase = ((clock % settings.pinballCycle + settings.pinballCycle) % settings.pinballCycle) * 14 / settings.pinballCycle;
  state.phase = phase;
  state.multiball = featured && settings.enablePinballMultiball && phase >= settings.multiballTime && phase < 13;
  state.bumpers.fill(0); state.flippers.fill(0);
  let hits = 0;
  for (let ballIndex = 0; ballIndex < 3; ballIndex++) {
    const release = settings.multiballTime + (ballIndex - 1) * .6;
    const secondary = ballIndex > 0;
    const released = !secondary || (featured && settings.enablePinballMultiball && phase >= release);
    const ball = state.balls[ballIndex];
    if (!released) {
      ball.x = .151; ball.z = .27; ball.lift = -.035;
      continue;
    }
    const travelScale = Math.min(.875, (14 - release) / 7);
    const routeTime = secondary ? (phase - release) / travelScale : phase;
    if (secondary && routeTime > 6.2) {
      const progress = clamp((routeTime - 6.2) / .8);
      ball.x = .03 * (1 - progress);
      ball.z = .115 + .155 * progress;
      ball.lift = -.035 * clamp((progress - .8) * 5);
    } else routePosition(routeTime, ball);
    for (const point of PINBALL_ROUTE) {
      if (secondary && point.t > 6.2) continue;
      const rawDelta = routeTime - point.t;
      const delta = Math.abs(rawDelta) < 1e-8 ? 0 : rawDelta;
      if (point.bumper !== undefined) {
        if (delta >= 0) hits++;
        const pulse = delta >= 0 && delta < .24 ? 1 - delta / .24 : 0;
        state.bumpers[point.bumper] = Math.max(state.bumpers[point.bumper], pulse);
      }
      if (point.flipper !== undefined) {
        state.flippers[point.flipper] = Math.max(state.flippers[point.flipper], flipperStroke(delta, settings.flipperStroke));
      }
    }
  }
  state.score = 42000 + (Math.floor(clock / settings.pinballCycle) + 1) * 14 * settings.scoreStep + hits * settings.scoreStep;
  state.label = phase < 1 ? "FREE PLAY" : state.multiball && phase < settings.multiballTime + 2 ? "MULTIBALL!"
    : featured && phase >= settings.multiballTime + 2 && phase < 12.6 ? "HIGH SCORE / AI4FUN" : "AI4FUN";
  return state;
}
