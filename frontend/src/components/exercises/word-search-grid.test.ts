import { describe, expect, it } from "vitest";
import { generateWordSearchGrid, seedFromWords } from "./word-search-grid";

const WORDS = ["APPLE", "PEAR", "PLUM", "GRAPE"];

/** Every direction the player can select in. */
const DIRS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: -1, dc: 1 },
];

function findWord(grid: string[][], word: string): boolean {
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const { dr, dc } of DIRS) {
        let ok = true;
        for (let i = 0; i < word.length && ok; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size || grid[rr][cc] !== word[i]) ok = false;
        }
        if (ok) return true;
      }
    }
  }
  return false;
}

describe("generateWordSearchGrid", () => {
  it("hides every word where the player can find it", () => {
    const { grid, placedWords, skipped } = generateWordSearchGrid(WORDS, 12, 42);
    expect(skipped).toEqual([]);
    expect(placedWords).toHaveLength(WORDS.length);
    for (const w of WORDS) expect(findWord(grid, w)).toBe(true);
  });

  it("same seed → same grid; different seed → different grid", () => {
    const a = generateWordSearchGrid(WORDS, 12, 42);
    const b = generateWordSearchGrid(WORDS, 12, 42);
    const c = generateWordSearchGrid(WORDS, 12, 43);
    expect(a.grid).toEqual(b.grid);
    expect(a.grid).not.toEqual(c.grid);
  });

  it("skips a word longer than the grid instead of looping forever", () => {
    const { placedWords, skipped } = generateWordSearchGrid(["EXTRAORDINARY", "CAT"], 5, 1);
    expect(skipped).toEqual(["EXTRAORDINARY"]);
    expect(placedWords).toEqual(["CAT"]);
  });

  it("fills every cell", () => {
    const { grid } = generateWordSearchGrid(WORDS, 10, 7);
    expect(grid.flat().every((ch) => typeof ch === "string" && ch.length === 1)).toBe(true);
  });

  it("seedFromWords is stable and order-sensitive", () => {
    expect(seedFromWords(WORDS)).toBe(seedFromWords([...WORDS]));
    expect(seedFromWords(WORDS)).not.toBe(seedFromWords([...WORDS].reverse()));
  });
});
