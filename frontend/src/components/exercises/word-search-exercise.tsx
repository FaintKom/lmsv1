"use client";
import { useState, useMemo, useCallback } from "react";

interface WordSearchConfig {
  grid_size?: number;
  words?: string[];
}

interface Props {
  config: WordSearchConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
}

interface Cell {
  letter: string;
  row: number;
  col: number;
}

function generateGrid(size: number, words: string[]): string[][] {
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "")
  );
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [0, -1],
    [1, -1],
  ];

  for (const word of words) {
    const upper = word.toUpperCase();
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const maxR = size - (dir[0] === 1 ? upper.length : 1);
      const maxC = dir[1] === 1 ? size - upper.length : dir[1] === -1 ? size - 1 : size - 1;
      const minC = dir[1] === -1 ? upper.length - 1 : 0;
      if (maxR < 0 || maxC < minC) continue;
      const r = Math.floor(Math.random() * (maxR + 1));
      const c = minC + Math.floor(Math.random() * (maxC - minC + 1));

      let fits = true;
      for (let i = 0; i < upper.length; i++) {
        const nr = r + dir[0] * i;
        const nc = c + dir[1] * i;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) { fits = false; break; }
        if (grid[nr][nc] && grid[nr][nc] !== upper[i]) { fits = false; break; }
      }
      if (fits) {
        for (let i = 0; i < upper.length; i++) {
          grid[r + dir[0] * i][c + dir[1] * i] = upper[i];
        }
        placed = true;
      }
    }
  }

  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = alpha[Math.floor(Math.random() * 26)];
    }
  }
  return grid;
}

export default function WordSearchExercise({ config, onSubmit }: Props) {
  const words = config.words || [];
  const gridSize = config.grid_size || 10;

  const grid = useMemo(() => generateGrid(gridSize, words), [gridSize, words]);

  const [selecting, setSelecting] = useState(false);
  const [selStart, setSelStart] = useState<Cell | null>(null);
  const [selEnd, setSelEnd] = useState<Cell | null>(null);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const getCellsBetween = useCallback(
    (start: Cell, end: Cell): Cell[] => {
      const dr = end.row === start.row ? 0 : end.row > start.row ? 1 : -1;
      const dc = end.col === start.col ? 0 : end.col > start.col ? 1 : -1;
      if (dr === 0 && dc === 0) return [start];
      const dist = Math.max(Math.abs(end.row - start.row), Math.abs(end.col - start.col));
      const cells: Cell[] = [];
      for (let i = 0; i <= dist; i++) {
        const r = start.row + dr * i;
        const c = start.col + dc * i;
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
          cells.push({ letter: grid[r][c], row: r, col: c });
        }
      }
      return cells;
    },
    [grid, gridSize]
  );

  const handlePointerDown = (row: number, col: number) => {
    if (submitted) return;
    setSelecting(true);
    const cell = { letter: grid[row][col], row, col };
    setSelStart(cell);
    setSelEnd(cell);
  };

  const handlePointerMove = (row: number, col: number) => {
    if (!selecting || submitted) return;
    setSelEnd({ letter: grid[row][col], row, col });
  };

  const handlePointerUp = () => {
    if (!selecting || !selStart || !selEnd || submitted) { setSelecting(false); return; }
    setSelecting(false);
    const cells = getCellsBetween(selStart, selEnd);
    const selected = cells.map((c) => c.letter).join("");
    const reversed = [...cells].reverse().map((c) => c.letter).join("");

    const matchWord = words.find(
      (w) => w.toUpperCase() === selected || w.toUpperCase() === reversed
    );

    if (matchWord && !foundWords.has(matchWord.toLowerCase())) {
      const newFound = new Set(foundWords);
      newFound.add(matchWord.toLowerCase());
      setFoundWords(newFound);
      const newHighlighted = new Set(highlightedCells);
      cells.forEach((c) => newHighlighted.add(`${c.row}-${c.col}`));
      setHighlightedCells(newHighlighted);
    }
    setSelStart(null);
    setSelEnd(null);
  };

  const currentSelection = useMemo(() => {
    if (!selecting || !selStart || !selEnd) return new Set<string>();
    const cells = getCellsBetween(selStart, selEnd);
    return new Set(cells.map((c) => `${c.row}-${c.col}`));
  }, [selecting, selStart, selEnd, getCellsBetween]);

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit({ found_words: Array.from(foundWords) });
  };

  const allFound = words.every((w) => foundWords.has(w.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {words.map((w) => {
          const found = foundWords.has(w.toLowerCase());
          return (
            <span
              key={w}
              className={`rounded-pill border px-3 py-1 text-xs font-medium transition-all ${
                found
                  ? "border-primary bg-success-soft text-success-fg line-through"
                  : "border-border-strong bg-paper-2 text-ink-700"
              }`}
            >
              {w}
            </span>
          );
        })}
      </div>

      <p className="text-xs text-text-muted">
        {foundWords.size} of {words.length} found. Click and drag to select words.
      </p>

      <div
        className="overflow-auto select-none touch-none"
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="inline-grid gap-0 rounded-lg border border-border-strong overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {grid.map((row, ri) =>
            row.map((letter, ci) => {
              const key = `${ri}-${ci}`;
              const isHighlighted = highlightedCells.has(key);
              const isSelecting = currentSelection.has(key);
              return (
                <div
                  key={key}
                  onPointerDown={() => handlePointerDown(ri, ci)}
                  onPointerEnter={() => handlePointerMove(ri, ci)}
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
                    isHighlighted
                      ? "bg-primary text-white"
                      : isSelecting
                      ? "bg-info-soft text-info-fg"
                      : "bg-paper-2 text-ink-700 hover:bg-surface-2"
                  }`}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={foundWords.size === 0}
          className="w-full rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allFound ? "Submit — All Found!" : `Submit (${foundWords.size}/${words.length})`}
        </button>
      ) : (
        <div
          className={`rounded-lg px-5 py-3 text-sm font-semibold ${
            allFound ? "bg-success-soft text-success-fg" : "bg-sun-50 text-warning-fg"
          }`}
        >
          {allFound
            ? "Perfect! All words found!"
            : `${foundWords.size} of ${words.length} words found.`}
        </div>
      )}
    </div>
  );
}
