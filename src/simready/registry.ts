export const SIMREADY_ASSETS = {
  pongPaddle: { title: "Pong paddle", rotation: [Math.PI / 2, 0, Math.PI / 2] },
  pongBall: { title: "Pong ball", rotation: [0, 0, 0] },
  croissant: { title: "Croissant (not a chocolatine)", rotation: [0, 0, 0] },
  cassouletCan: { title: "Beans can / cassoulet mountain", rotation: [0, 0, 0] },
  donut: { title: "Donut portal", rotation: [0, 0, 0] },
  smallRobot: { title: "Small mobile robot", rotation: [0, 0, 0] },
  forklift: { title: "Orange forklift", rotation: [0, Math.PI / 2, 0] },
  robotArm: { title: "Robotic arm", rotation: [0, 0, 0] },
  snackVendingMachine: { title: "Developer snack vending machine", rotation: [0, -Math.PI / 2, 0] },
} as const;

export type SimReadyAssetId = keyof typeof SIMREADY_ASSETS;

export function isSimReadyAssetId(value: string): value is SimReadyAssetId {
  return Object.hasOwn(SIMREADY_ASSETS, value);
}

export interface SimReadyReport {
  id: SimReadyAssetId;
  source: string;
  revision: string;
  license: string;
  sourceUrl: string;
  bytes: number;
  triangles: number;
  meshes: number;
  materials: number;
  textures: number;
  dimensions: number[];
  warnings: string[];
}

export function parseReports(input: unknown): Map<SimReadyAssetId, SimReadyReport> {
  if (!input || typeof input !== "object" || !("assets" in input) || !Array.isArray(input.assets)) {
    throw new Error("Invalid SimReady manifest: assets array required.");
  }
  const reports = new Map<SimReadyAssetId, SimReadyReport>();
  for (const entry of input.assets) {
    if (!entry || typeof entry !== "object") throw new Error("Invalid SimReady asset report.");
    const { id, source, revision, license, sourceUrl, bytes, triangles, meshes, materials, textures, dimensions, warnings } = entry;
    if (typeof id !== "string" || !isSimReadyAssetId(id) || reports.has(id)
      || ![source, revision, license, sourceUrl].every((value) => typeof value === "string")
      || ![bytes, triangles, meshes, materials, textures].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)
      || !Array.isArray(dimensions) || dimensions.length !== 3
      || !dimensions.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)
      || !Array.isArray(warnings) || !warnings.every((value) => typeof value === "string")) {
      throw new Error(`Invalid SimReady report fields for ${String(id)}.`);
    }
    reports.set(id, { id, source, revision, license, sourceUrl, bytes, triangles, meshes, materials, textures, dimensions, warnings });
  }
  return reports;
}
