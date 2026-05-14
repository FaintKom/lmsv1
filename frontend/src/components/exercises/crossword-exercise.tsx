"use client";
import { useState, useMemo, useCallback } from "react";

interface WordEntry {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
}

interface CrosswordConfig {
  grid_size?: number;
  words?: WordEntry[];
}

interface Props {
  config: CrosswordConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
}

interface CellData {
  letter: string;
  wordIndices: number[];
  number?: number;
}

export default function CrosswordExercise({ config, onSubmit }: Props) {
  const words = config.words || [];
  const gridSize = config.grid_size || 10;

  const { grid, numberedCells } = useMemo(() => {
    const g: (CellData | null)[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => null)
    );
    const nums: { row: number; col: number; num: number }[] = [];
    let num = 1;

    words.forEach((w, wi) => {
      const existing = nums.find((n) => n.row === w.row && n.col === w.col);
      if (!existing) {
        nums.push({ row: w.row, col: w.col, num });
      }
      const wordNum = existing ? existing.num : num;
      if (!existing) num++;

      for (let i = 0; i < w.word.length; i++) {
        const r = w.direction === "down" ? w.row + i : w.row;
        const c = w.direction === "across" ? w.col + i : w.col;
        if (r < gridSize && c < gridSize) {
          if (!g[r][c]) {
            g[r][c] = { letter: "", wordIndices: [wi] };
          } else {
            g[r][c]!.wordIndices.push(wi);
          }
          if (i === 0) g[r][c]!.number = wordNum;
        }
      }
    });
    return { grid: g, numberedCells: nums };
  }, [words, gridSize]);

  const [inputs, setInputs] = useState<string[][]>(() =>
    Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => "")
    )
  );
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback(
    (row: number, col: number, val: string) => {
      if (submitted) return;
      const ch = val.slice(-1).toUpperCase();
      setInputs((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = ch;
        return next;
      });
    },
    [submitted]
  );

  const handleSubmit = () => {
    const wordAnswers: Record<string, string> = {};
    words.forEach((w, wi) => {
      let answer = "";
      for (let i = 0; i < w.word.length; i++) {
        const r = w.direction === "down" ? w.row + i : w.row;
        const c = w.direction === "across" ? w.col + i : w.col;
        if (r < gridSize && c < gridSize) {
          answer += inputs[r][c] || "";
        }
      }
      wordAnswers[String(wi)] = answer;
    });
    setSubmitted(true);
    onSubmit({ words: wordAnswers });
  };

  const isCorrect = (wi: number) => {
    if (!submitted) return undefined;
    const w = words[wi];
    let answer = "";
    for (let i = 0; i < w.word.length; i++) {
      const r = w.direction === "down" ? w.row + i : w.row;
      const c = w.direction === "across" ? w.col + i : w.col;
      if (r < gridSize && c < gridSize) answer += inputs[r][c] || "";
    }
    return answer.toLowerCase() === w.word.toLowerCase();
  };

  const allFilled = words.every((w) => {
    for (let i = 0; i < w.word.length; i++) {
      const r = w.direction === "down" ? w.row + i : w.row;
      const c = w.direction === "across" ? w.col + i : w.col;
      if (r < gridSize && c < gridSize && !inputs[r][c]) return false;
    }
    return true;
  });

  if (!words.length) {
    return <p className="text-sm text-text-muted">No crossword words configured.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Grid */}
      <div className="overflow-auto">
        <div
          className="inline-grid gap-0 border border-border-strong"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              if (!cell) {
                return <div key={`${ri}-${ci}`} className="h-9 w-9 bg-ink-700" />;
              }
              const cellCorrect = submitted
                ? cell.wordIndices.some((wi) => isCorrect(wi))
                : undefined;
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={`relative h-9 w-9 border border-border ${
                    submitted && cellCorrect === true
                      ? "bg-success-soft"
                      : submitted && cellCorrect === false
                      ? "bg-danger-soft"
                      : "bg-paper-2"
                  }`}
                >
                  {cell.number && (
                    <span className="absolute left-0.5 top-0 text-[8px] font-bold text-text-muted leading-none">
                      {cell.number}
                    </span>
                  )}
                  <input
                    type="text"
                    maxLength={1}
                    value={inputs[ri][ci]}
                    onChange={(e) => handleChange(ri, ci, e.target.value)}
                    disabled={submitted}
                    className="absolute inset-0 w-full h-full bg-transparent text-center text-sm font-bold text-ink-700 uppercase outline-none focus:bg-primary/10 disabled:cursor-not-allowed"
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Clues */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-ink-700">Across</h4>
          <ul className="space-y-1">
            {words
              .map((w, i) => ({ ...w, idx: i }))
              .filter((w) => w.direction === "across")
              .map((w) => {
                const num = numberedCells.find((n) => n.row === w.row && n.col === w.col)?.num;
                const correct = isCorrect(w.idx);
                return (
                  <li
                    key={w.idx}
                    className={`text-xs ${
                      correct === true ? "text-success-fg font-medium" : correct === false ? "text-danger-fg" : "text-text-muted"
                    }`}
                  >
                    <span className="font-bold">{num}.</span> {w.clue}
                    {correct === true && " ✓"}
                    {correct === false && ` (${w.word})`}
                  </li>
                );
              })}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-ink-700">Down</h4>
          <ul className="space-y-1">
            {words
              .map((w, i) => ({ ...w, idx: i }))
              .filter((w) => w.direction === "down")
              .map((w) => {
                const num = numberedCells.find((n) => n.row === w.row && n.col === w.col)?.num;
                const correct = isCorrect(w.idx);
                return (
                  <li
                    key={w.idx}
                    className={`text-xs ${
                      correct === true ? "text-success-fg font-medium" : correct === false ? "text-danger-fg" : "text-text-muted"
                    }`}
                  >
                    <span className="font-bold">{num}.</span> {w.clue}
                    {correct === true && " ✓"}
                    {correct === false && ` (${w.word})`}
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allFilled}
          className="w-full rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check Crossword
        </button>
      )}

      {submitted && (
        <div
          className={`rounded-lg px-5 py-3 text-sm font-semibold ${
            words.every((_, i) => isCorrect(i))
              ? "bg-success-soft text-success-fg"
              : "bg-sun-50 text-warning-fg"
          }`}
        >
          {words.every((_, i) => isCorrect(i))
            ? "Perfect! All words correct!"
            : `${words.filter((_, i) => isCorrect(i)).length} of ${words.length} words correct.`}
        </div>
      )}
    </div>
  );
}
