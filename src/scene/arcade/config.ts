export const ARCADE_VIDEO_GAMES = ["pong", "donkey-kong", "super-mario"] as const;
export type ArcadeVideoGame = typeof ARCADE_VIDEO_GAMES[number];
export const PROCEDURAL_ARCADE_GAMES = ["devfest-10", "toulouse-fps"] as const;
export type ProceduralArcadeGame = typeof PROCEDURAL_ARCADE_GAMES[number];
export const ARCADE_GAMES = [...ARCADE_VIDEO_GAMES, ...PROCEDURAL_ARCADE_GAMES] as const;
export type ArcadeGame = typeof ARCADE_GAMES[number];
export type CabinetKind = "arcade" | "dance" | "pinball";

export function isProceduralArcadeGame(game: ArcadeGame): game is ProceduralArcadeGame {
  return game === "devfest-10" || game === "toulouse-fps";
}

export interface ScreenAssignment {
  cabinet: number;
  game: ArcadeGame;
  offset: number;
}

function defaultScreenAssignments(): ScreenAssignment[] {
  return [
    { cabinet: 0, game: "super-mario", offset: 1.3 },
    { cabinet: 1, game: "devfest-10", offset: 0 },
    { cabinet: 3, game: "super-mario", offset: 5.1 },
    { cabinet: 4, game: "toulouse-fps", offset: 0 },
  ];
}

export function arcadeSettings() {
  return {
    enableArcadeVideoScreens: true,
    enablePinballAttractMode: true,
    enablePinballMultiball: true,
    enableArcadeCrtEffect: true,
    videoBrightness: 1.15,
    scanlineStrength: .07,
    videoPolicy: "arcade-section" as "arcade-section" | "always",
    videoEnd: 49,
    assignments: defaultScreenAssignments(),
    pinballSpeed: 1,
    pinballStart: 3,
    pinballCycle: 14,
    flipperAngle: 48,
    flipperStroke: .075,
    bumperIntensity: 1.6,
    scoreStep: 1250,
    multiballTime: 7,
    pinballOffsets: [0, 5.6],
    trajectories: false,
    pivots: false,
    screenBounds: false,
  };
}
export type ArcadeSettings = ReturnType<typeof arcadeSettings>;

export const ARCADE_RANGES = {
  videoBrightness: [.2, 2], scanlineStrength: [0, .2], videoEnd: [25, 49],
  pinballSpeed: [.5, 1.5], pinballStart: [0, 8], pinballCycle: [13.5, 20],
  flipperAngle: [20, 65], flipperStroke: [.035, .15],
  bumperIntensity: [.3, 3], scoreStep: [100, 10000], multiballTime: [6.8, 8],
} as const;

export function validateArcadeSettings(settings: ArcadeSettings): void {
  for (const [key, [min, max]] of Object.entries(ARCADE_RANGES)) {
    const value = settings[key as keyof typeof ARCADE_RANGES];
    if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${key}: expected ${min}–${max}.`);
  }
  if (!["arcade-section", "always"].includes(settings.videoPolicy)) throw new RangeError("Unknown arcade video policy.");
  for (const assignment of settings.assignments) {
    if (![0, 1, 3, 4].includes(assignment.cabinet) || !ARCADE_GAMES.includes(assignment.game)
      || !Number.isFinite(assignment.offset)) throw new RangeError("Invalid arcade screen assignment.");
  }
  if (new Set(settings.assignments.map((entry) => entry.cabinet)).size !== settings.assignments.length) {
    throw new RangeError("A cabinet can only have one screen assignment.");
  }
  if (settings.pinballOffsets.length !== 2 || settings.pinballOffsets.some((offset) => !Number.isFinite(offset))) {
    throw new RangeError("Both pinballs require finite timeline offsets.");
  }
}
