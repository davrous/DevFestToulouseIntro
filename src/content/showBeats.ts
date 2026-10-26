import { HEIGHT, ROOF_THICKNESS } from "./title";

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
  crtSync: 59.4,
  crtSyncEnd: 59.7,
  davidStart: 66,
  davidGate: 76,
  davidEnd: 83,
  reels: 77,
  popcornTip: 77.55,
  popcorn: 78.1,
  popcornEnd: 84.5,
  camera: 74,
  lens: 76.8,
  auditoriumEnd: 87.6,
  vortexEnd: 95.6,
  projector: 88.8,
  space: 90.6,
  digital: 95,
} as const;

export const LEVEL_COMPLETE = { start: 46.3, end: CINEMA.clap, height: 26, width: 18 } as const;
export const BRIDGE_CLOSE = { start: 168, end: 172.5 } as const;
export const CASSOULET_SIGN = { time: 127, start: 117, end: 125, height: 14, width: 14, lateral: 0 } as const;
export const CASSOULET_INSTALL = {
  start: CASSOULET_SIGN.start, typingEnd: CASSOULET_SIGN.start + .9,
  complete: CASSOULET_SIGN.end - .6, gigabytes: 4.8,
} as const;
export const CASSOULET_PILE = {
  start: CASSOULET_INSTALL.complete, end: 134, count: 64, size: 2.1,
  releaseInterval: .065, spawnHeight: 13, step: 1 / 60,
  crateWidth: 6, crateHeight: 7.2,
} as const;
export const BUFFER_OVERFLOW = {
  anchor: 116, start: 107, spill: 110.7, signEnd: 114.3, end: 116.7,
  height: 10, width: 12, count: 32, side: 1, yaw: Math.PI,
  fillInterval: .085, fallDuration: .4, extraFallDuration: .55,
  tankX: 4.5, tankFloor: 1.2, tankRim: 6,
} as const;
export const ASTRONAUT_CORNER = {
  anchor: 121.75, lateral: -8, height: 6.5, start: CINEMA.digital, end: 124.5,
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
  { label: "CAMERA LENS", time: CINEMA.lens - 3 },
  { label: "LENS VORTEX", time: CINEMA.lens + 1 },
  { label: "POPCORN", time: 78.2 },
  { label: "FILM REELS", time: 79 },
  { label: "PROJECTOR", time: CINEMA.projector + .3 },
  { label: "SPACE WARP", time: CINEMA.space + 1 },
  { label: "D ENTRY", time: 95 },
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
