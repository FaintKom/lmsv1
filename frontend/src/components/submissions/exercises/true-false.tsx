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
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{statement}</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setSelected(true)}
          aria-pressed={selected === true}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-4 text-lg font-semibold transition-colors ${
            selected === true
              ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300"
              : "border-slate-200 text-slate-600 hover:border-emerald-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-emerald-500/50"
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
              ? "border-red-400 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-500/20 dark:text-red-300"
              : "border-slate-200 text-slate-600 hover:border-red-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-red-500/50"
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
