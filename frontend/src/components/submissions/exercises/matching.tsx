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
                  ? "border-green-400 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-500/20 dark:text-green-300"
                  : selected[p.left]
                    ? "border-green-300 bg-green-50 text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300"
                    : "border-ink-200 text-ink-700 hover:border-green-300 dark:border-white/10 dark:text-ink-300 dark:hover:border-green-500/50"
              }`}
            >
              {p.left}
              {selected[p.left] && (
                <span className="mt-1 block text-xs text-green-500 dark:text-green-400">
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
                  ? "border-ink-100 bg-ink-50 text-ink-400 dark:border-white/5 dark:bg-white/5 dark:text-ink-500"
                  : activeLeft
                    ? "border-ink-200 text-ink-700 hover:border-green-300 hover:bg-green-50 dark:border-white/10 dark:text-ink-300 dark:hover:border-green-500/50 dark:hover:bg-green-500/10"
                    : "border-ink-200 text-ink-500 dark:border-white/10 dark:text-ink-400"
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
        className="mt-6 w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
      >
        Submit Answer
      </button>
    </div>
  );
}
