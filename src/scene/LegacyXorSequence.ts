import { cellPosition } from "../content/title";
import { clamp, smoothstep } from "../engine/Timeline";

const exit = cellPosition(1, 9);
export const LEGACY_XOR = {
  impact: 38.2, wallEnd: 41.2, openStart: 42.6, end: 51.18,
  exitX: exit.x + 14, exitZ: exit.z, centerY: 16.1,
  halfWidth: 12.15, halfHeight: 15.1, thickness: 1.15,
} as const;

export interface LegacyXorSettings {
  enableLegacyWallAssembly: boolean;
  enableXorCpuGate: boolean;
  assemblyLead: number;
  stagger: number;
  assemblySpeed: number;
  labelMode: "all" | "minimal" | "none";
  wallMessage: "BUILD FAILED" | "LEGACY CODE";
  signalOffset: number;
  signalDuration: number;
  gateX: number;
  gateY: number;
  gateZ: number;
  gateYaw: number;
  gateScale: number;
  panelTravel: number;
  panelLift: number;
  hingeAngle: number;
  panelDepthTravel: number;
  openingDuration: number;
  emission: number;
  signalColor: string;
  copperColor: string;
  boundingBoxes: boolean;
  cameraPath: boolean;
  freeAperture: boolean;
  colliders: boolean;
}

export function legacyXorSettings(): LegacyXorSettings {
  return {
    enableLegacyWallAssembly: true, enableXorCpuGate: true,
    assemblyLead: 3.5, stagger: .11, assemblySpeed: 1,
    labelMode: "all", wallMessage: "BUILD FAILED",
    signalOffset: 0, signalDuration: 3.3,
    gateX: LEGACY_XOR.exitX, gateY: 0, gateZ: LEGACY_XOR.exitZ, gateYaw: Math.PI / 2,
    gateScale: 1, panelTravel: 3.25, panelLift: .65, hingeAngle: 78,
    panelDepthTravel: 6.2, openingDuration: 3.1,
    emission: 1.35, signalColor: "#17cfff", copperColor: "#ca9349",
    boundingBoxes: false, cameraPath: false, freeAperture: false, colliders: false,
  };
}

export const LEGACY_XOR_RANGES = {
  assemblyLead: [3.1, 3.8], stagger: [.06, .13], assemblySpeed: [.9, 1.4],
  signalOffset: [0, .4], signalDuration: [2.4, 3.5],
  gateX: [LEGACY_XOR.exitX - .15, LEGACY_XOR.exitX + .15],
  gateY: [-.05, .05], gateZ: [LEGACY_XOR.exitZ - .05, LEGACY_XOR.exitZ + .05],
  gateYaw: [Math.PI / 2 - .004, Math.PI / 2 + .004], gateScale: [.98, 1],
  panelTravel: [2.8, 3.3], panelLift: [.35, .7], hingeAngle: [76, 82],
  panelDepthTravel: [6.1, 6.5], openingDuration: [2.3, 3.2], emission: [.3, 2],
} as const;

export function validateLegacyXorSettings(settings: LegacyXorSettings): void {
  for (const key of Object.keys(LEGACY_XOR_RANGES) as Array<keyof typeof LEGACY_XOR_RANGES>) {
    const [min, max] = LEGACY_XOR_RANGES[key], value = settings[key];
    if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${key} must be between ${min} and ${max}.`);
  }
  if (settings.signalOffset + settings.signalDuration > 3.95) throw new RangeError("The signal must reach the lock before mechanical opening.");
  if (11 * settings.stagger + .9 / settings.assemblySpeed > settings.assemblyLead - .35) {
    throw new RangeError("Assembly must finish with a readable hold before impact.");
  }
  if (!["all", "minimal", "none"].includes(settings.labelMode)
    || !["BUILD FAILED", "LEGACY CODE"].includes(settings.wallMessage)) throw new RangeError("Unknown legacy wall label selection.");
  if (![settings.signalColor, settings.copperColor].every((color) => /^#[0-9a-f]{6}$/i.test(color))) {
    throw new RangeError("Circuit colors must be six-digit hexadecimal colors.");
  }
}

export function legacyXorState(time: number, settings: LegacyXorSettings) {
  if (!Number.isFinite(time)) throw new RangeError("Legacy/XOR time must be finite.");
  const signalStart = LEGACY_XOR.impact + settings.signalOffset;
  const arrival = signalStart + settings.signalDuration;
  return {
    signal: time >= arrival ? 1 : clamp((time - signalStart) / settings.signalDuration),
    signalActive: time >= signalStart,
    power: smoothstep((time - arrival) / .4),
    latch: smoothstep((time - (LEGACY_XOR.openStart - .4)) / .4),
    open: smoothstep((time - LEGACY_XOR.openStart) / settings.openingDuration),
    arrival,
  };
}
