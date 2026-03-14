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
  // Shuffle right column
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
      <div className="grid grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-2">
          {pairs.map((p) => (
            <button
              key={p.left}
              onClick={() => handleLeftClick(p.left)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                activeLeft === p.left
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : selected[p.left]
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-700 hover:border-indigo-300"
              }`}
            >
              {p.left}
              {selected[p.left] && (
                <span className="mt-1 block text-xs text-emerald-500">
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
                  ? "border-slate-100 bg-slate-50 text-slate-400"
                  : activeLeft
                    ? "border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                    : "border-slate-200 text-slate-500"
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
        className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Submit Answer
      </button>
    </div>
  );
}
