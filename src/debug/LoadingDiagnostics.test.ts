import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { diagnosticRoute, DIAGNOSTIC_PROFILES, LoadingDiagnostics, readDiagnosticRuns } from "./LoadingDiagnostics";

function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("opt-in loading diagnostics", () => {
  it("does not select a profile for normal URLs and rejects unknown modes", () => {
    expect(diagnosticRoute("")).toBeUndefined();
    expect(diagnosticRoute("?simready=0")).toBeUndefined();
    expect(diagnosticRoute("?diagnostic=report")).toBe("report");
    for (const name of Object.keys(DIAGNOSTIC_PROFILES)) {
      expect(diagnosticRoute(`?diagnostic=${name}`)).toBe(name);
    }
    expect(() => diagnosticRoute("?diagnostic=typo")).toThrow("Unknown loading diagnostic");
  });

  it("isolates individual features and provides an explicitly minimal profile", () => {
    const fields = ["skipVideo", "skipCinema", "skipSimReady", "renderLite", "skipWarmup"] as const;
    expect(fields.every((field) => !DIAGNOSTIC_PROFILES.baseline[field])).toBe(true);
    expect(fields.every((field) => DIAGNOSTIC_PROFILES.minimal[field])).toBe(true);
    for (const name of ["no-video", "no-cinema", "no-simready", "render-lite", "no-warmup"] as const) {
      expect(fields.filter((field) => DIAGNOSTIC_PROFILES[name][field])).toHaveLength(1);
    }
  });

  it("retains previous attempts across reloads without creating a run when reading the report", () => {
    const target = storage(), time = () => "2026-10-28T18:00:00.000Z";
    const first = new LoadingDiagnostics("baseline", () => target, time);
    first.mark("physics:wasm:start");
    const second = new LoadingDiagnostics("no-video", () => target, time);
    second.mark("ready", "1280x720");
    const runs = readDiagnosticRuns(target);
    expect(runs.map((run) => run.profile)).toEqual(["no-video", "baseline"]);
    expect(runs[1].stages.at(-1)?.name).toBe("physics:wasm:start");
    expect(runs[0].stages.at(-1)).toEqual({ at: time(), name: "ready", detail: "1280x720" });
    expect(readDiagnosticRuns(target)).toEqual(runs);
  });

  it("bounds history and stage counts", () => {
    const target = storage();
    for (let i = 0; i < 10; i++) new LoadingDiagnostics("baseline", () => target);
    const latest = new LoadingDiagnostics("minimal", () => target);
    for (let i = 0; i < 120; i++) latest.mark(`stage:${i}`);
    const runs = readDiagnosticRuns(target);
    expect(runs).toHaveLength(8);
    expect(runs[0].stages).toHaveLength(100);
    expect(runs[0].stages.at(-1)?.name).toBe("stage:119");
  });

  it("reports unavailable storage explicitly and still records stages in memory", () => {
    const diagnostics = new LoadingDiagnostics("baseline", () => { throw new Error("Storage blocked"); });
    diagnostics.mark("renderer:create");
    expect(diagnostics.storageError).toBe("Storage blocked");
    expect(diagnostics.run.stages.at(-1)?.name).toBe("renderer:create");
    expect(console.error).toHaveBeenCalled();
  });

  it("preserves a malformed existing journal instead of silently overwriting it", () => {
    const setItem = vi.fn(), target = { getItem: () => "{broken", setItem };
    const diagnostics = new LoadingDiagnostics("minimal", () => target);
    expect(diagnostics.storageError).toBeDefined();
    expect(setItem).not.toHaveBeenCalled();
    expect(() => readDiagnosticRuns(target)).toThrow();
  });

  it("surfaces quota failures and initialization failures without swallowing them", async () => {
    const target = { getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } };
    const diagnostics = new LoadingDiagnostics("no-cinema", () => target);
    expect(diagnostics.storageError).toBe("Quota exceeded");
    const error = new Error("Test model failure");
    await expect(diagnostics.step("assets:test", async () => { throw error; })).rejects.toBe(error);
    expect(diagnostics.run.stages.at(-1)).toMatchObject({ name: "assets:test:error", detail: error.message });
  });
});
