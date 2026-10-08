import { repl, type ReplOptions } from "@strudel/core";
import type { StrudelMirror } from "@strudel/codemirror";

export type PerformancePlayer = Pick<StrudelMirror, "code" | "repl" | "evaluate" | "stop" | "setCode" | "dispose">;

export function createPerformancePlayer(initialCode: string, options: ReplOptions): PerformancePlayer {
  const playback = repl(options);
  let code = initialCode;
  playback.setCode(code);
  return {
    get code() { return code; },
    repl: playback,
    async evaluate(autostart = true) { await playback.evaluate(code, autostart); },
    async stop() { playback.stop(); },
    setCode(source) { code = source; playback.setCode(source); },
    dispose() { playback.stop(); },
  };
}
