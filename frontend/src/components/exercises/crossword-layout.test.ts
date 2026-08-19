import { describe, expect, it } from "vitest";
import { buildCrosswordLayout, type PlacedWord } from "./crossword-layout";

/** Rebuild the letter grid and fail on any cell holding two letters. */
function lettersOf(placed: PlacedWord[]): Map<string, string> {
  const grid = new Map<string, string>();
  for (const p of placed) {
    for (let i = 0; i < p.word.length; i++) {
      const r = p.direction === "down" ? p.row + i : p.row;
      const c = p.direction === "across" ? p.col + i : p.col;
      const key = `${r}:${c}`;
      const prev = grid.get(key);
      expect(prev === undefined || prev === p.word[i]).toBe(true);
      grid.set(key, p.word[i]);
    }
  }
  return grid;
}

function inBounds(placed: PlacedWord[], size: number): boolean {
  return placed.every((p) => {
    const endRow = p.direction === "down" ? p.row + p.word.length - 1 : p.row;
    const endCol = p.direction === "across" ? p.col + p.word.length - 1 : p.col;
    return p.row >= 0 && p.col >= 0 && endRow < size && endCol < size;
  });
}

describe("buildCrosswordLayout", () => {
  it("places six sharing words without conflicts and with crossings", () => {
    const { placed, unplaced } = buildCrosswordLayout(
      ["APPLE", "PEAR", "PLUM", "GRAPE", "MELON", "LEMON"],
      12,
    );
    expect(unplaced).toEqual([]);
    expect(placed).toHaveLength(6);
    expect(inBounds(placed, 12)).toBe(true);
    const cells = lettersOf(placed); // throws on letter conflict
    const totalLetters = placed.reduce((n, p) => n + p.word.length, 0);
    expect(cells.size).toBeLessThan(totalLetters); // at least one crossing
  });

  it("keeps a word that shares no letters, on its own row", () => {
    const { placed, unplaced } = buildCrosswordLayout(["AAA", "ZZZ"], 10);
    expect(unplaced).toEqual([]);
    expect(placed).toHaveLength(2);
    lettersOf(placed);
  });

  it("names the words that cannot fit instead of losing them", () => {
    const { placed, unplaced } = buildCrosswordLayout(["EXTRAORDINARY"], 5);
    expect(placed).toEqual([]);
    expect(unplaced).toEqual(["EXTRAORDINARY"]);
  });

  it("handles a single word", () => {
    const { placed, unplaced } = buildCrosswordLayout(["CAT"], 10);
    expect(unplaced).toEqual([]);
    expect(placed).toHaveLength(1);
    expect(placed[0].direction).toBe("across");
  });

  it("works in Cyrillic", () => {
    const { placed, unplaced } = buildCrosswordLayout(["КОШКА", "ОКНО", "НОРА"], 12);
    expect(unplaced).toEqual([]);
    expect(placed).toHaveLength(3);
    lettersOf(placed);
  });

  it("is deterministic — same input, same grid", () => {
    const a = buildCrosswordLayout(["APPLE", "PEAR", "PLUM"], 12);
    const b = buildCrosswordLayout(["APPLE", "PEAR", "PLUM"], 12);
    expect(a).toEqual(b);
  });
});
