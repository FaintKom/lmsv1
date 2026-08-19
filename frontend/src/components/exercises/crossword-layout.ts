/**
 * Crossword auto-layout — a greedy crosser, not a solver.
 *
 * The first word goes through the middle; every next word is tried at
 * every shared letter with everything already placed, perpendicular to
 * the word it crosses. A candidate placement is rejected if any of its
 * cells would disagree with a letter already on the grid, or if a cell
 * that is NOT the crossing would touch a parallel neighbour (that is
 * what turns two words into an accidental third one). Words that cross
 * nothing are dropped onto free rows; words that fit nowhere are
 * returned in `unplaced` — the editor names them instead of losing them.
 *
 * Deterministic on purpose: same words + size → same grid, so tests can
 * assert exact shapes and the teacher's second click means "same grid".
 */

export interface PlacedWord {
  word: string;
  row: number;
  col: number;
  direction: "across" | "down";
}

export interface CrosswordLayout {
  placed: PlacedWord[];
  unplaced: string[];
}

type Grid = Map<string, string>;

const key = (r: number, c: number) => `${r}:${c}`;

function fits(
  grid: Grid,
  word: string,
  row: number,
  col: number,
  dir: "across" | "down",
  size: number,
  crossAt: number,
): boolean {
  const len = word.length;
  const endRow = dir === "down" ? row + len - 1 : row;
  const endCol = dir === "across" ? col + len - 1 : col;
  if (row < 0 || col < 0 || endRow >= size || endCol >= size) return false;

  // The cell just before and just after the word must be empty, or the
  // word visually merges with a neighbour into a longer non-word.
  const before = dir === "across" ? key(row, col - 1) : key(row - 1, col);
  const after = dir === "across" ? key(row, col + len) : key(row + len, col);
  if (grid.has(before) || grid.has(after)) return false;

  for (let i = 0; i < len; i++) {
    const r = dir === "down" ? row + i : row;
    const c = dir === "across" ? col + i : col;
    const existing = grid.get(key(r, c));
    if (existing !== undefined) {
      if (existing !== word[i]) return false;
      continue; // a true crossing — parallel-neighbour check not needed here
    }
    if (i === crossAt) return false; // the crossing cell must already hold the letter
    // A fresh cell may not touch anything sideways — that would spell
    // an unintended word along the perpendicular axis.
    const side1 = dir === "across" ? key(r - 1, c) : key(r, c - 1);
    const side2 = dir === "across" ? key(r + 1, c) : key(r, c + 1);
    if (grid.has(side1) || grid.has(side2)) return false;
  }
  return true;
}

function write(grid: Grid, p: PlacedWord): void {
  for (let i = 0; i < p.word.length; i++) {
    const r = p.direction === "down" ? p.row + i : p.row;
    const c = p.direction === "across" ? p.col + i : p.col;
    grid.set(key(r, c), p.word[i]);
  }
}

/** A free horizontal run for a word that crosses nothing, one empty row apart. */
function findFreeSpot(grid: Grid, len: number, size: number): { row: number; col: number } | null {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c + len <= size; c++) {
      let ok = true;
      for (let i = -1; i <= len && ok; i++) {
        // the run itself plus one cell of margin each side
        if (grid.has(key(r, c + i))) ok = false;
        // and the rows above/below, so it never glues to a neighbour
        if (grid.has(key(r - 1, c + i)) || grid.has(key(r + 1, c + i))) ok = false;
      }
      if (ok) return { row: r, col: c };
    }
  }
  return null;
}

export function buildCrosswordLayout(rawWords: string[], gridSize: number): CrosswordLayout {
  // Longest first: long words carry the most crossing letters, and a grid
  // grown from them accepts the short tail far more often than the reverse.
  const words = rawWords
    .map((w) => (w || "").trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const placed: PlacedWord[] = [];
  const unplaced: string[] = [];
  const grid: Grid = new Map();

  for (const word of words) {
    if (placed.length === 0) {
      if (word.length > gridSize) {
        unplaced.push(word);
        continue;
      }
      const first: PlacedWord = {
        word,
        row: Math.floor(gridSize / 2),
        col: Math.floor((gridSize - word.length) / 2),
        direction: "across",
      };
      placed.push(first);
      write(grid, first);
      continue;
    }

    let landed: PlacedWord | null = null;
    // Try every crossing with every already-placed word, in order — the
    // first legal one wins, which is what keeps the result deterministic.
    for (const host of placed) {
      const dir: "across" | "down" = host.direction === "across" ? "down" : "across";
      for (let hi = 0; hi < host.word.length && !landed; hi++) {
        for (let wi = 0; wi < word.length && !landed; wi++) {
          if (host.word[hi] !== word[wi]) continue;
          const crossRow = host.direction === "down" ? host.row + hi : host.row;
          const crossCol = host.direction === "across" ? host.col + hi : host.col;
          const row = dir === "down" ? crossRow - wi : crossRow;
          const col = dir === "across" ? crossCol - wi : crossCol;
          if (fits(grid, word, row, col, dir, gridSize, wi)) {
            landed = { word, row, col, direction: dir };
          }
        }
      }
      if (landed) break;
    }

    if (!landed && word.length <= gridSize) {
      const spot = findFreeSpot(grid, word.length, gridSize);
      if (spot) landed = { word, ...spot, direction: "across" };
    }

    if (landed) {
      placed.push(landed);
      write(grid, landed);
    } else {
      unplaced.push(word);
    }
  }

  return { placed, unplaced };
}
