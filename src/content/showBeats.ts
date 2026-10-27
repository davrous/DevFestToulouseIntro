import { CELL, HEIGHT, ROOF_THICKNESS, cellPosition } from "./title";

export const ARCADE_ENTRY = {
  start: 4.3, cross: 5.925, end: 5.925,
  panelFadeStart: 4.6, panelFadeEnd: 5.35,
} as const;

export const DEPLOY_ROCKET = {
  time: 148.5, lateral: -6, yaw: Math.PI, height: 18, width: 7,
  lookStart: 140, lookEnd: 151, launch: 144.6, impact: 146.8, end: 149.4,
  ceiling: HEIGHT - ROOF_THICKNESS / 2, particleCount: 240,
} as const;

export const ORBIT_LINK = {
  time: 153, depth: 12, start: 143, end: 166, height: 13, width: 14,
  lookStart: DEPLOY_ROCKET.impact, lookEnd: 157,
} as const;

export function rocketLift(time: number): number {
  const t = Math.max(0, Math.min(1, (time - DEPLOY_ROCKET.launch) / (DEPLOY_ROCKET.impact - DEPLOY_ROCKET.launch)));
  // Ease ignition, then coast so following the ascent does not whip the camera upward.
  const rise = t < .2 ? t * t / .36 : (t - .1) / .9;
  return (DEPLOY_ROCKET.ceiling - DEPLOY_ROCKET.height) * rise;
}

export const CINEMA = {
  clapperStart: 48.8,
  clapperClose: 50.85,
  clapperAnchor: 59,
  clap: 51.03,
  start: 51.18,
  crtSync: 59.2,
  crtSyncEnd: 59.9,
  davidStart: 66,
  davidGate: 76,
  davidEnd: 83,
  reels: 77,
  popcornTip: 77.55,
  popcorn: 78.1,
  popcornEnd: 84.5,
  camera: 80,
  lens: 80.45,
  lensAnchor: 86.3,
  auditoriumEnd: 87.6,
  tunnelRoomReady: 90,
  vortexExit: 92.8,
  vortexEnd: 94.2,
  projector: 88.8,
  space: 90.6,
  digital: 94.2,
} as const;

export const TERMINATOR = {
  start: 119.5, end: 134, walkStart: 119.5, walkEnd: 125.5,
  column: 4, row: 3, offsetX: 0, offsetZ: -16, height: 21.6,
  distance: 16, groundOffset: .65, lookStart: 120, lookEnd: 127, clip: "The Chase",
  hitsToDestroy: 12, fragments: 192,
} as const;

const cassouletPosterWall = cellPosition(3, 5);
export const CASSOULET_WALL_POSTER = {
  x: cassouletPosterWall.x - CELL / 2 + 2, y: 17, z: cassouletPosterWall.z,
  wallX: cassouletPosterWall.x - CELL / 2 + .75, yaw: -Math.PI / 2,
  width: 20, lookStart: 136.5, lookEnd: 144.4, lookIn: 4, lookOut: 3.8,
} as const;

export function terminatorPosition(time: number): { x: number; y: number; z: number } {
  const cell = cellPosition(TERMINATOR.column, TERMINATOR.row);
  const progress = Math.max(0, Math.min(1, (time - TERMINATOR.walkStart) / (TERMINATOR.walkEnd - TERMINATOR.walkStart)));
  return { x: cell.x + TERMINATOR.offsetX,
    y: TERMINATOR.height / 2 + TERMINATOR.groundOffset,
    z: cell.z + TERMINATOR.offsetZ + TERMINATOR.distance * progress };
}

export const LEVEL_COMPLETE = { start: 46.3, end: CINEMA.clap, height: 26, width: 18 } as const;
export const BRIDGE_CLOSE = { start: 168, end: 172.5 } as const;
export const CASSOULET_SIGN = { time: 127, start: 117, end: 125, height: 18, width: 14, lateral: 0 } as const;
export const CASSOULET_INSTALL = {
  start: CASSOULET_SIGN.start, typingEnd: CASSOULET_SIGN.start + .9,
  complete: CASSOULET_SIGN.end - .6, gigabytes: 4.8,
} as const;
export const CASSOULET_PILE = {
  start: CASSOULET_INSTALL.complete, end: 134, count: 64, size: 2.1,
  releaseInterval: .065, spawnHeight: 28, step: 1 / 60,
} as const;
export const BUFFER_OVERFLOW = {
  anchor: 116, start: 107, spill: 110.7, signEnd: 114.3, end: 116.7,
  height: 10, width: 12, count: 32, side: 1, yaw: Math.PI,
  fillInterval: .085, fallDuration: .4, extraFallDuration: .55,
  tankX: 4.5, tankFloor: 1.2, tankRim: 6,
} as const;
export const ASTRONAUT_CORNER = {
  anchor: 122, lateral: -8, height: 6.5, start: CINEMA.digital, end: 124.5,
  riseStart: 116.2, riseEnd: 118.4, finalScale: 2.56, gateTime: 122, gateLift: 3.2,
} as const;
export const CLAP_CRT = {
  start: CINEMA.clapperClose - .2,
  collapse: CINEMA.clap,
  collapsed: CINEMA.start - .045,
  reopen: CINEMA.start + .2,
  open: CINEMA.start + .68,
  end: CINEMA.start + 1,
  minimumHeight: .004,
} as const;

export const REHEARSAL_STOPS = [
  { label: "GAME", time: 0 },
  { label: "CLAPPERBOARD", time: 50 },
  { label: "CINEMA", time: 59 },
  { label: "MATRIX WALL", time: 61.8 },
  { label: "DAVID", time: 68 },
  { label: "POPCORN", time: 78.2 },
  { label: "FILM REELS", time: 79 },
  { label: "CAMERA LENS", time: CINEMA.lens - 2 },
  { label: "LENS VORTEX", time: CINEMA.lens + 1 },
  { label: "TUNNEL RIGHT TURN", time: 91.5 },
  { label: "D ENTRY", time: CINEMA.vortexEnd },
  { label: "VORTEX EXIT", time: CINEMA.vortexExit + .6 },
  { label: "ERIC", time: 99 },
  { label: "BUFFER FULL", time: BUFFER_OVERFLOW.spill - .3 },
  { label: "ASTRONAUT", time: 118 },
  { label: "NPM INSTALL", time: CASSOULET_INSTALL.start + 3 },
  { label: "D ESCALATION", time: 123 },
  { label: "CASSOULET DELIVERY", time: CASSOULET_INSTALL.complete },
  { label: "MITSURU", time: 130 },
  { label: "ROCKET LAUNCH", time: 144 },
  { label: "CEILING IMPACT", time: 146.9 },
  { label: "D CLIMAX", time: 147 },
  { label: "FINAL REVEAL", time: 163 },
] as const;
