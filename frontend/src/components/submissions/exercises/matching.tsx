"use client";

import { useState } from "react";

interface Pair {
  left: string;
  right: string;
}

interface MatchingExerciseProps {
  pairs: Pair[];
  onSubmit: (answers: { pairs: Pair[] }) => void;
}

export default function MatchingExercise({ pairs, onSubmit }: MatchingExerciseProps) {
  const [shuffledRight] = useState(() =>
    [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5)
  );
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  const handleLeftClick = (left: string) => {
    setActiveLeft(left);
  };

  const handleRightClick = (right: string) => {
    if (activeLeft) {
      setSelected({ ...selected, [activeLeft]: right });
      setActiveLeft(null);
    }
  };

  const handleSubmit = () => {
    const result = pairs.map((p) => ({
      left: p.left,
      right: selected[p.left] || "",
    }));
    onSubmit({ pairs: result });
  };

  const usedRight = new Set(Object.values(selected));

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6" role="group" aria-label="Match items from left to right">
        {/* Left column */}
        <div className="space-y-2">
          {pairs.map((p) => (
            <button
              key={p.left}
              onClick={() => handleLeftClick(p.left)}
              aria-pressed={activeLeft === p.left}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                activeLeft === p.left
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-300"
                  : selected[p.left]
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-200 text-slate-700 hover:border-indigo-300 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-500/50"
              }`}
            >
              {p.left}
              {selected[p.left] && (
                <span className="mt-1 block text-xs text-emerald-500 dark:text-emerald-400">
                  → {selected[p.left]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          {shuffledRight.map((right) => (
            <button
              key={right}
              onClick={() => handleRightClick(right)}
              disabled={!activeLeft}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                usedRight.has(right)
                  ? "border-slate-100 bg-slate-50 text-slate-400 dark:border-white/5 dark:bg-white/5 dark:text-slate-500"
                  : activeLeft
                    ? "border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10"
                    : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400"
              }`}
            >
              {right}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={Object.keys(selected).length < pairs.length}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
      >
        Submit Answer
      </button>
    </div>
  );
}
