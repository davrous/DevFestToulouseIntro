import { routeAnchor } from "../camera/CameraPath";
import { CELL, cellPosition } from "../content/title";
import { CASSOULET_PILE, CASSOULET_SIGN, CINEMA, DEPLOY_ROCKET } from "../content/showBeats";
import { SPEAKERS } from "../content/speakers";
import { PONG_VOLLEY } from "../content/violin";

export const SIMREADY_GAGS = {
  pong: { title: "Retro Pong", flag: "enablePongGag", assets: ["pongPaddle", "pongBall"] },
  pastry: { title: "Toulouse pastry", flag: "enableToulouseEasterEggs", assets: ["croissant"] },
  cassoulet: { title: "Cassoulet can mountain", flag: "enableToulouseEasterEggs", assets: ["cassouletCan"] },
  launchArm: { title: "Rocket launch support arm", flag: "enableLaunchArm", assets: ["robotArm"] },
  vending: { title: "Developer snack machine", flag: "enableSnackVendingMachine", assets: ["snackVendingMachine", "croissant"] },
} as const;

export type SimReadyGagId = keyof typeof SIMREADY_GAGS;
export type SimReadyFlag = typeof SIMREADY_GAGS[SimReadyGagId]["flag"];
export type VectorSetting = [number, number, number];

const entryCell = cellPosition(2, 6);
export const VENDING_WALL = { x: entryCell.x, z: entryCell.z + CELL / 2 - .75, clearance: .02 } as const;

export interface GagSettings {
  position: VectorSetting;
  rotation: VectorSetting;
  scale: number;
  start: number;
  end: number;
  animation: { interaction: number; duration: number; bounce: number; flicker: number; displayDuration?: number };
}

export type SimReadyConfig = Record<SimReadyFlag, boolean> & {
  enabled: boolean;
  boundingBoxes: boolean;
  gags: Record<SimReadyGagId, GagSettings>;
};

function placement(anchorTime: number, lateral: number, height: number, start: number, end: number,
  interaction: number, duration = .6): GagSettings {
  const anchor = routeAnchor(anchorTime, lateral);
  return {
    position: [anchor.position.x, height, anchor.position.z], rotation: [0, anchor.yaw, 0],
    scale: 1, start, end, animation: { interaction, duration, bounce: .35, flicker: .2 },
  };
}

export function createSimReadyConfig(enabled = true): SimReadyConfig {
  const vending = placement(64, 0, .28, CINEMA.start, CINEMA.auditoriumEnd, 61.55, .4);
  vending.animation.displayDuration = 3.45;
  vending.position = [VENDING_WALL.x - CELL * .3, .28, VENDING_WALL.z - 4 - VENDING_WALL.clearance];
  vending.rotation = [0, 0, 0];
  const rocket = routeAnchor(DEPLOY_ROCKET.time, DEPLOY_ROCKET.lateral);
  const launchArm = placement(DEPLOY_ROCKET.time, 0, .28, CINEMA.digital, 159, DEPLOY_ROCKET.launch, .6);
  launchArm.position = [rocket.position.x - 7, .02, rocket.position.z + 1];
  launchArm.rotation = [0, 0, 0];
  return {
    enabled, boundingBoxes: false,
    enablePongGag: true, enableToulouseEasterEggs: true,
    enableLaunchArm: true, enableSnackVendingMachine: true,
    gags: {
      pong: placement(SPEAKERS[0].gateTime, 0, PONG_VOLLEY.centerY, PONG_VOLLEY.start, PONG_VOLLEY.end, PONG_VOLLEY.shot),
      pastry: placement(33.5, 6.5, 8.3, 27, 31.5, 30),
      cassoulet: placement(CASSOULET_SIGN.time + 4, -8.5, .02, CASSOULET_PILE.start, CASSOULET_PILE.end, 127.052),
      launchArm,
      vending,
    },
  };
}

export function isSimReadyGagId(value: string): value is SimReadyGagId {
  return Object.hasOwn(SIMREADY_GAGS, value);
}

export function validateGagSettings(settings: GagSettings): void {
  if (![...settings.position, ...settings.rotation, settings.scale, settings.start, settings.end,
    ...Object.values(settings.animation)].every(Number.isFinite)
    || settings.scale <= 0 || settings.start < 0 || settings.end <= settings.start
    || settings.end > 159 || settings.animation.duration <= 0 || settings.animation.bounce < 0
    || settings.animation.flicker < 0 || settings.animation.interaction < settings.start
    || settings.animation.interaction >= settings.end
    || (settings.animation.displayDuration !== undefined
      && (!Number.isFinite(settings.animation.displayDuration) || settings.animation.displayDuration <= 0
        || settings.animation.interaction + settings.animation.displayDuration > settings.end))) {
    throw new RangeError("Invalid SimReady placement, visibility window or animation settings.");
  }
}
