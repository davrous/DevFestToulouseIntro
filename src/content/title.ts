export const CELL = 28;
export const HEIGHT = 34;
export const ROOF_THICKNESS = 2.3;
export const TITLE_WIDTH = 47 * CELL;
export const TITLE_DEPTH = 16 * CELL;
export const SEED = "DEVFEST_TOULOUSE_2026";

const glyphs: Record<string, readonly string[]> = {
  D: ["11110", "11011", "11001", "11001", "11001", "11011", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  S: ["11111", "10000", "10000", "11111", "00001", "00001", "11111"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  O: ["01110", "11011", "10001", "10001", "10001", "11011", "01110"],
  U: ["10001", "10001", "10001", "10001", "10001", "11011", "01110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
};

export interface TitleCell {
  col: number;
  row: number;
  line: number;
  letter: number;
  x: number;
  z: number;
}

export function cellPosition(col: number, row: number): { x: number; z: number } {
  return { x: (col - 20) * CELL, z: (7.5 - row) * CELL };
}

export function createTitleCells(): TitleCell[] {
  const cells: TitleCell[] = [];
  ["DEVFEST", "TOULOUSE"].forEach((word, line) => {
    [...word].forEach((letter, index) => {
      glyphs[letter].forEach((pixels, localRow) => {
        [...pixels].forEach((pixel, localCol) => {
          if (pixel !== "1") return;
          const col = index * 6 + localCol - (line === 1 ? 3 : 0);
          const row = line * 9 + localRow;
          cells.push({ col, row, line, letter: index, ...cellPosition(col, row) });
        });
      });
    });
  });
  return cells;
}

export function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
