declare module "@strudel/core" {
  export interface Hap {
    whole: { begin: { valueOf(): number; toString(): string }; end: { valueOf(): number } } | null;
    value: unknown;
    context: { onTrigger?: HapTrigger; dominantTrigger?: boolean };
    duration: { valueOf(): number };
  }
  export type HapTrigger = (hap: Hap, currentTime: number, cps: number, targetTime: number) => void;
  export class Pattern {
    onTrigger(callback: HapTrigger, dominant?: boolean): Pattern;
    queryArc(begin: number, end: number): Hap[];
    filterHaps(predicate: (hap: Hap) => boolean): Pattern;
    late(cycles: number): Pattern;
    slow(cycles: number): Pattern;
    s(sound: string): Pattern;
    gain(value: number): Pattern;
    visual(event: string): Pattern;
  }
  export function pure(value: unknown): Pattern;
  export function stack(...patterns: Pattern[]): Pattern;
  export function isPattern(value: unknown): value is Pattern;
  export function register(name: string, fn: (value: unknown, pattern: Pattern) => Pattern, patternify?: boolean):
    (value: unknown, pattern: Pattern) => Pattern;
  export function evalScope(...modules: object[]): Promise<object[]>;
  export interface ReplState {
    error?: Error;
    started: boolean;
    pending: boolean;
    code: string;
    pattern?: Pattern;
  }
  export interface ReplOptions {
    getTime(): number;
    defaultOutput(hap: Hap, deadline: number, duration: number, cps: number, targetTime: number): unknown;
    transpiler: typeof import("@strudel/transpiler").transpiler;
    editPattern?(pattern: Pattern): Pattern;
    beforeEval?(options: { code: string }): Promise<unknown> | void;
    beforeStart?(): Promise<void> | void;
    onToggle?(started: boolean): void;
    onUpdateState?(state: ReplState): void;
    afterEval?(options: { code: string; pattern: Pattern }): void;
    onEvalError?(error: Error): void;
  }
  export interface Repl {
    evaluate(code: string, autostart?: boolean): Promise<Pattern | undefined>;
    stop(): void;
    setCode(code: string): void;
    scheduler: { cps: number; now(): number; started: boolean };
    state: ReplState;
  }
  export function repl(options: ReplOptions): Repl;
  export function getTrigger(options: {
    getTime(): number;
    defaultOutput(hap: Hap, deadline: number, duration: number, cps: number, targetTime: number): unknown;
  }): (hap: Hap, deadline: number, duration: number, cps: number, targetTime: number) => Promise<void>;
}

declare module "@strudel/mini" {
  import type { Pattern } from "@strudel/core";
  export function mini(source: string): Pattern;
  export function miniAllStrings(): void;
}

declare module "@strudel/tonal" {}
declare module "@strudel/transpiler" {
  import type { Pattern } from "@strudel/core";
  export const transpiler: (source: string, options?: object) => unknown;
  export function evaluate(source: string): Promise<{ pattern: Pattern }>;
}
declare module "@strudel/webaudio" {
  import type { Hap } from "@strudel/core";
  export function getAudioContext(): AudioContext;
  export function initAudio(): Promise<void>;
  export function loadWorklets(): Promise<void>;
  export function registerSynthSounds(): void;
  export function samples(map: Record<string, string[] | Record<string, string[]>>, baseUrl?: string): Promise<void>;
  export function loadBuffer(url: string, context: AudioContext, sound: string): Promise<AudioBuffer>;
  export function webaudioOutput(hap: Hap, deadline: number, duration: number, cps: number, targetTime: number): unknown;
}
declare module "@strudel/codemirror" {
  import type { Repl, ReplOptions } from "@strudel/core";
  export type ReplState = import("@strudel/core").ReplState;
  export class StrudelMirror {
    constructor(options: ReplOptions & { root: HTMLElement; initialCode: string; prebake(): Promise<unknown> });
    code: string;
    repl: Repl;
    drawer: { start(scheduler: Repl["scheduler"]): void; stop(): void };
    evaluate(autostart?: boolean): Promise<void>;
    stop(): Promise<void>;
    setCode(code: string): void;
    dispose(): void;
  }
}
declare module "*.strudel?raw" { const source: string; export default source; }
