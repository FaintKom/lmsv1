"use client";

import { useState } from "react";

interface FillBlanksExerciseProps {
  textTemplate: string;
  blankCount: number;
  onSubmit: (answers: { blanks: string[] }) => void;
}

export default function FillBlanksExercise({
  textTemplate,
  blankCount,
  onSubmit,
}: FillBlanksExerciseProps) {
  const [answers, setAnswers] = useState<string[]>(Array(blankCount).fill(""));

  // Split template by {{blank}} markers
  const parts = textTemplate.split("{{blank}}");

  let blankIndex = 0;

  return (
    <div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-base leading-relaxed text-slate-700">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (() => {
              const idx = blankIndex++;
              return (
                <input
                  type="text"
                  value={answers[idx] || ""}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[idx] = e.target.value;
                    setAnswers(newAnswers);
                  }}
                  placeholder={`blank ${idx + 1}`}
                  className="mx-1 inline-block w-36 rounded-lg border-2 border-indigo-200 bg-indigo-50/50 px-3 py-1 text-center text-sm font-medium text-indigo-700 focus:border-indigo-400 focus:outline-none"
                />
              );
            })()}
          </span>
        ))}
      </div>

      <button
        onClick={() => onSubmit({ blanks: answers })}
        disabled={answers.some((a) => !a.trim())}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Submit Answer
      </button>
    </div>
  );
}
