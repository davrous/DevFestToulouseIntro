import { isPattern, pure, register, stack, type Pattern, type Hap } from "@strudel/core";
import { epochNow, eventName, isShowCue, type AVEventName } from "../engine/avProtocol";
import type { StrudelEventTransport } from "../engine/StrudelEventTransport";

export interface OutputClock {
  currentTime: number;
  outputLatency?: number;
  baseLatency: number;
  getOutputTimestamp?(): { contextTime?: number; performanceTime?: number };
}

export function audioTimeToEpoch(targetTime: number, context: OutputClock): number {
  const stamp = context.getOutputTimestamp?.();
  if (stamp?.contextTime && stamp.performanceTime) {
    return performance.timeOrigin + stamp.performanceTime + (targetTime - stamp.contextTime) * 1000;
  }

  return epochNow() + (targetTime - context.currentTime + (context.outputLatency ?? context.baseLatency)) * 1000;
}

export function withSynchronizedStart(pattern: Pattern, launch: (targetTime: number) => Promise<void>): Pattern {
  const start = pure({}).filterHaps((hap) => !!hap.whole && hap.whole.begin.valueOf() === 0)
    .onTrigger((_hap, _time, _cps, targetTime) => launch(targetTime), true);
  return stack(pattern, start);
}

export function createVisualHelpers(transport: StrudelEventTransport, getContext: () => OutputClock) {
  let lastHat = -Infinity;
  let rateStart = 0;
  let rateCount = 0;
  let warningAt = -Infinity;
  let sent = 0;

  const output = (name: AVEventName) => (hap: Hap, _currentTime: number, cps: number, targetTime: number) => {
    if (!hap.whole) return;
    if (!Number.isFinite(targetTime) || !Number.isFinite(cps) || cps <= 0) {
      throw new Error("Strudel visual output requires a scheduled onset and positive cycle rate.");
    }
    const scheduledTime = audioTimeToEpoch(targetTime, getContext());
    if (name === "hat" && scheduledTime - lastHat < 45) return;
    const now = epochNow();
    if (now - rateStart >= 1000) { rateStart = now; rateCount = 0; }
    if (++rateCount > 120) {
      if (now - warningAt > 3000) {
        warningAt = now;
        console.warn("AV sync limited to 120 selected events/second; use fewer visual accents.");
      }
      return;
    }
    if (name === "hat") lastHat = scheduledTime;
    const value = hap.value;
    const level = value && typeof value === "object" && "velocity" in value ? value.velocity : 1;
    const velocity = typeof level === "number" && Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 1;
    const cycle = hap.whole.begin.valueOf();
    transport.setTiming(cycle, cps);
    transport.send({
      event: name, velocity, cycle, cps, scheduledTime,
      id: `${transport.senderId}:${transport.playbackSession}:${name}:${hap.whole.begin.toString()}`,
    });
    sent++;
  };

  // The REPL transpiler turns quoted strings into mini-notation Patterns.
  const label = (input: AVEventName | Pattern): AVEventName => {
    if (!isPattern(input)) return eventName(input);
    const first = input.queryArc(0, 1);
    const next = input.queryArc(1, 2);
    if (first.length !== 1 || next.length !== 1 || Number(first[0].duration) !== 1 || Number(next[0].duration) !== 1
      || first[0].value !== next[0].value) throw new TypeError("AV event names must be constant strings.");
    return eventName(first[0].value);
  };
  const visual = (name: AVEventName | Pattern, pattern: Pattern = pure({})): Pattern =>
    pattern.onTrigger(output(label(name)), true);
  const audioAndVisual = (pattern: Pattern, name: AVEventName | Pattern): Pattern =>
    pattern.onTrigger(output(label(name)), false);
  const cue = (name: AVEventName | Pattern, rhythm: Pattern = pure({})): Pattern => {
    const value = label(name);
    if (!isShowCue(value)) throw new TypeError("cue() requires a show cue, not a drum event.");
    return visual(value, rhythm);
  };
  const cueAt = (name: AVEventName | Pattern, cycle: number): Pattern => {
    if (!Number.isFinite(cycle) || cycle < 0) throw new RangeError("cueAt() requires a non-negative cycle.");
    return cue(name, pure({}).late(cycle).filterHaps((hap) =>
      !!hap.whole && Math.abs(hap.whole.begin.valueOf() - cycle) < 1e-7));
  };
  const patternVisual = register("visual", (name, pattern) => audioAndVisual(pattern, eventName(name)));
  return { visual, audioAndVisual, cue, cueAt, patternVisual, get sent() { return sent; } };
}
