/**
 * Word-search grid generation, deterministic.
 *
 * One pure function used by BOTH the editor and the player, so the
 * teacher sees exactly the grid the pupil gets. The layout is decided
 * entirely by (words, size, seed): the editor's "Regenerate" changes
 * the seed in the config, and a saved exercise renders the same grid on
 * every open. Exercises saved before seeds existed fall back to a hash
 * of their word list — stable too, just not chosen by anyone.
 */

export interface WordSearchGrid {
  grid: string[][];
  /** Words actually hidden in the grid, uppercased. */
  placedWords: string[];
  /** Words that did not fit (too long for the grid, or no room). */
  skipped: string[];
}

/** mulberry32 — tiny deterministic PRNG, good enough for letter grids. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable fallback seed for exercises saved before seeds existed. */
export function seedFromWords(words: string[]): number {
  let h = 2166136261;
  for (const ch of words.join(" ")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DIRECTIONS = [
  { dr: 0, dc: 1 }, // →
  { dr: 1, dc: 0 }, // ↓
  { dr: 1, dc: 1 }, // ↘
  { dr: -1, dc: 1 }, // ↗
];

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CYRILLIC = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";

export function generateWordSearchGrid(
  rawWords: string[],
  gridSize: number,
  seed: number,
): WordSearchGrid {
  const words = rawWords.map((w) => (w || "").trim().toUpperCase()).filter(Boolean);
  const rand = mulberry32(seed);
  const grid: (string | null)[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => null),
  );
  const placedWords: string[] = [];
  const skipped: string[] = [];

  for (const word of words) {
    if (word.length > gridSize) {
      skipped.push(word);
      continue;
    }
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const dir = DIRECTIONS[Math.floor(rand() * DIRECTIONS.length)];
      const maxR = dir.dr === 0 ? gridSize - 1 : gridSize - word.length;
      const minR = dir.dr === -1 ? word.length - 1 : 0;
      const maxC = dir.dc === 0 ? gridSize - 1 : gridSize - word.length;
      const r0 = minR + Math.floor(rand() * (maxR - minR + 1));
      const c0 = Math.floor(rand() * (maxC + 1));
      let ok = true;
      for (let i = 0; i < word.length && ok; i++) {
        const cell = grid[r0 + dir.dr * i][c0 + dir.dc * i];
        if (cell !== null && cell !== word[i]) ok = false;
      }
      if (!ok) continue;
      for (let i = 0; i < word.length; i++) {
        grid[r0 + dir.dr * i][c0 + dir.dc * i] = word[i];
      }
      placedWords.push(word);
      placed = true;
    }
    if (!placed) skipped.push(word);
  }

  // Filler letters from the words' own script, so a Cyrillic puzzle does
  // not give its answers away as the only Cyrillic letters on the board.
  const alphabet = /[А-ЯЁ]/.test(words.join("")) ? CYRILLIC : LATIN;
  const filled = grid.map((row) =>
    row.map((cell) => cell ?? alphabet[Math.floor(rand() * alphabet.length)]),
  );

  return { grid: filled, placedWords, skipped };
}
