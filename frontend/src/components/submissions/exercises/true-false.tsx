"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface TrueFalseExerciseProps {
  statement: string;
  onSubmit: (answers: { answer: boolean }) => void;
}

export default function TrueFalseExercise({
  statement,
  onSubmit,
}: TrueFalseExerciseProps) {
  const [selected, setSelected] = useState<boolean | null>(null);

  return (
    <div>
      <div className="mb-6 rounded-lg border border-ink-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <p className="text-lg font-medium text-ink-900 dark:text-ink-200">{statement}</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setSelected(true)}
          aria-pressed={selected === true}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-4 text-lg font-semibold transition-colors ${
            selected === true
              ? "border-green-400 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-500/20 dark:text-green-300"
              : "border-ink-200 text-ink-700 hover:border-green-300 dark:border-white/10 dark:text-ink-400 dark:hover:border-green-500/50"
          }`}
        >
          <Check className="h-5 w-5" />
          True
        </button>
        <button
          onClick={() => setSelected(false)}
          aria-pressed={selected === false}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-4 text-lg font-semibold transition-colors ${
            selected === false
              ? "border-coral-300 bg-coral-50 text-coral-700 dark:border-coral-500 dark:bg-coral-500/20 dark:text-coral-300"
              : "border-ink-200 text-ink-700 hover:border-coral-300 dark:border-white/10 dark:text-ink-400 dark:hover:border-coral-500/50"
          }`}
        >
          <X className="h-5 w-5" />
          False
        </button>
      </div>

      <button
        onClick={() => selected !== null && onSubmit({ answer: selected })}
        disabled={selected === null}
        className="mt-6 w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
      >
        Submit Answer
      </button>
    </div>
  );
}
