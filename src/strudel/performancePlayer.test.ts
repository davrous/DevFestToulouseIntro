import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as core from "@strudel/core";
import * as mini from "@strudel/mini";
import { transpiler } from "@strudel/transpiler";
import { createPerformancePlayer } from "./performancePlayer";

beforeAll(async () => {
  mini.miniAllStrings();
  await core.evalScope(core, mini);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("integrated performance without editor rendering", () => {
  it("loads and replaces code using the real REPL without starting playback", async () => {
    const player = createPerformancePlayer('setcpm(150 / 4)\n$: s("bd*4")', {
      getTime: () => 0, defaultOutput: vi.fn(), transpiler,
    });
    try {
      await player.evaluate(false);
      expect(player.code).toBe('setcpm(150 / 4)\n$: s("bd*4")');
      expect(player.repl.scheduler.cps).toBe(.625);
      expect(player.repl.scheduler.started).toBe(false);
      expect(player.repl.state.pattern?.queryArc(0, 1)).toHaveLength(4);
      player.setCode('$: s("hh*8")');
      expect(player.repl.state.code).toBe(player.code);
      await player.evaluate(false);
      expect(player.repl.state.pattern?.queryArc(0, 1)).toHaveLength(8);
    } finally { player.dispose(); }
  });

  it("keeps audio scheduling and lifecycle hooks without any animation-frame loop", async () => {
    vi.useFakeTimers();
    const animationFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", animationFrame);
    const audio = vi.fn();
    const beforeEval = vi.fn();
    const beforeStart = vi.fn();
    const afterEval = vi.fn();
    const onToggle = vi.fn();
    const player = createPerformancePlayer('setcpm(150 / 4)\n$: s("bd*4")', {
      getTime: () => performance.now() / 1000, defaultOutput: audio, transpiler,
      beforeEval, beforeStart, afterEval, onToggle,
    });
    try {
      await player.evaluate();
      await vi.advanceTimersByTimeAsync(600);
      expect(beforeEval).toHaveBeenCalledOnce();
      expect(beforeStart).toHaveBeenCalledOnce();
      expect(afterEval).toHaveBeenCalledOnce();
      expect(onToggle).toHaveBeenCalledWith(true);
      expect(audio).toHaveBeenCalled();
      expect(player.repl.scheduler.started).toBe(true);
      expect(animationFrame).not.toHaveBeenCalled();
      await player.stop();
      const stoppedCount = audio.mock.calls.length;
      await vi.advanceTimersByTimeAsync(600);
      expect(audio).toHaveBeenCalledTimes(stoppedCount);
      expect(player.repl.scheduler.started).toBe(false);
      expect(onToggle).toHaveBeenLastCalledWith(false);
    } finally { player.dispose(); }
  });

  it("surfaces compilation errors through the normal REPL state callback", async () => {
    const report = vi.fn();
    const player = createPerformancePlayer("note(", {
      getTime: () => 0, defaultOutput: vi.fn(), transpiler,
      onUpdateState: (state) => { if (state.error) report(state.error.message); },
    });
    try {
      await player.evaluate(false);
      expect(report).toHaveBeenCalled();
      expect(player.repl.state.error).toBeDefined();
      expect(player.repl.state.pending).toBe(false);
      expect(player.repl.scheduler.started).toBe(false);
    } finally { player.dispose(); }
  });
});
