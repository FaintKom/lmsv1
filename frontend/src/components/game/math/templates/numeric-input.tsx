"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface NumericConfig {
  question: string;
  correct_answers: number[];    // multiple accepted (e.g., [6, 6.0])
  tolerance: number;            // e.g., 0.01 for exact, 0.1 for approximate
  allow_fraction: boolean;
  allow_decimal: boolean;
  explanation: string;
  hint?: string;
  standard?: string;
}

const DEFAULT_CONFIG: NumericConfig = {
  question: "If 3x - 7 = 14, what is the value of x?",
  correct_answers: [7],
  tolerance: 0.01,
  allow_fraction: true,
  allow_decimal: true,
  explanation: "Add 7 to both sides: 3x = 21. Divide by 3: x = 7.",
};

/** Parse a string that might be a fraction like "3/4" */
function parseAnswer(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try fraction
  const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const den = parseInt(fractionMatch[2]);
    if (den === 0) return null;
    return num / den;
  }

  // Try decimal
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

export default function NumericInput({ config, onComplete }: MathTemplateProps) {
  const cfg: NumericConfig = { ...DEFAULT_CONFIG, ...config } as NumericConfig;
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const parsed = parseAnswer(answer);
    if (parsed === null) return;

    const correct = cfg.correct_answers.some(
      (ca) => Math.abs(parsed - ca) <= cfg.tolerance
    );
    setSubmitted(true);
    setIsCorrect(correct);
    if (correct) onComplete(true, 1.0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && answer.trim()) handleSubmit();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Question */}
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/5">
        <p className="text-base font-medium text-slate-800 dark:text-slate-200">
          {cfg.question}
        </p>
        {cfg.standard && (
          <span className="mt-2 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            {cfg.standard}
          </span>
        )}
      </div>

      {/* Answer input */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Answer:
        </label>
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder={cfg.allow_fraction ? "e.g., 7 or 3/4" : "Enter a number"}
          className={`w-40 rounded-xl border-2 px-4 py-3 text-center text-xl font-bold outline-none transition-colors ${
            submitted
              ? isCorrect
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-red-400 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-500/10 dark:text-red-300"
              : "border-indigo-300 bg-white text-indigo-700 focus:border-indigo-500 dark:border-indigo-500 dark:bg-[#1E1E1E] dark:text-indigo-300"
          }`}
          autoFocus
        />
      </div>

      {/* Format hint */}
      {!submitted && (
        <p className="text-xs text-slate-400">
          {cfg.allow_fraction && cfg.allow_decimal
            ? "Enter a number, decimal, or fraction (e.g., 3/4)"
            : cfg.allow_fraction
              ? "Enter a number or fraction"
              : "Enter a number"}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!submitted ? (
          <>
            {cfg.hint && (
              <Button variant="outline" size="sm" onClick={() => setShowHint(true)}>
                Hint
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={!answer.trim()}>
              Check Answer
            </Button>
          </>
        ) : null}
      </div>

      {/* Hint */}
      {showHint && !submitted && cfg.hint && (
        <div className="w-full max-w-lg rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {cfg.hint}
        </div>
      )}

      {/* Result / Explanation */}
      {submitted && (
        <div className={`w-full max-w-lg rounded-xl border p-4 ${
          isCorrect
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
        }`}>
          <p className={`text-sm font-semibold mb-1 ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {isCorrect ? "Correct!" : `Incorrect. The answer is ${cfg.correct_answers[0]}`}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {cfg.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
