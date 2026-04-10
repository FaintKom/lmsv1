"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MathRenderer, containsMath } from "@/components/common/math-renderer";
import type { MathTemplateProps } from "../template-registry";

interface Choice {
  text: string;
  correct: boolean;
  explanation?: string;
}

interface MCConfig {
  question: string;       // supports KaTeX: "What is $\\frac{3}{4} + \\frac{1}{2}$?"
  choices: Choice[];
  explanation: string;    // shown after answering
  difficulty?: string;
  standard?: string;      // e.g. "SAT.Algebra.1" or "CCSS.7.RP.3"
}

const DEFAULT_CONFIG: MCConfig = {
  question: "If 2x + 5 = 17, what is the value of x?",
  choices: [
    { text: "4", correct: false },
    { text: "6", correct: true },
    { text: "8", correct: false },
    { text: "12", correct: false },
  ],
  explanation: "Subtract 5 from both sides: 2x = 12. Divide by 2: x = 6.",
};

export default function MultipleChoiceMath({ config, onComplete }: MathTemplateProps) {
  const cfg: MCConfig = { ...DEFAULT_CONFIG, ...config } as MCConfig;
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected !== null && cfg.choices[selected]?.correct;

  const handleSubmit = () => {
    setSubmitted(true);
    if (isCorrect) {
      onComplete(true, 1.0);
    }
  };

  const labels = ["A", "B", "C", "D", "E"];

  return (
    <div className="flex flex-col gap-5">
      {/* Question */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/5">
        <div className="text-base font-medium text-slate-800 dark:text-slate-200">
          {containsMath(cfg.question) ? <MathRenderer content={cfg.question} /> : cfg.question}
        </div>
        {false && cfg.standard && (
          <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/20 dark:text-green-400">
            {cfg.standard}
          </span>
        )}
      </div>

      {/* Choices */}
      <div className="space-y-2">
        {cfg.choices.map((choice, i) => {
          const isThis = selected === i;
          let borderClass = "border-slate-200 dark:border-white/10";
          let bgClass = "bg-white dark:bg-white/5";

          if (submitted) {
            if (choice.correct) {
              borderClass = "border-emerald-400 dark:border-emerald-500";
              bgClass = "bg-emerald-50 dark:bg-emerald-500/10";
            } else if (isThis && !choice.correct) {
              borderClass = "border-red-400 dark:border-red-500";
              bgClass = "bg-red-50 dark:bg-red-500/10";
            }
          } else if (isThis) {
            borderClass = "border-green-400 dark:border-green-500";
            bgClass = "bg-green-50 dark:bg-green-500/10";
          }

          return (
            <button
              key={i}
              onClick={() => !submitted && setSelected(i)}
              disabled={submitted}
              className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all ${borderClass} ${bgClass} ${
                !submitted ? "hover:border-green-300 dark:hover:border-green-500/50" : ""
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                  submitted && choice.correct
                    ? "bg-emerald-500 text-white"
                    : submitted && isThis && !choice.correct
                      ? "bg-red-500 text-white"
                      : isThis
                        ? "bg-green-500 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                }`}
              >
                {labels[i]}
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {containsMath(choice.text) ? <MathRenderer content={choice.text} /> : choice.text}
              </span>
              {submitted && choice.correct && (
                <span className="ml-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Correct
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Submit / Explanation */}
      {!submitted ? (
        <Button onClick={handleSubmit} disabled={selected === null}>
          Check Answer
        </Button>
      ) : (
        <div className={`rounded-xl border p-4 ${
          isCorrect
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
        }`}>
          <p className={`text-xs font-semibold mb-1 ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {isCorrect ? "Correct!" : "Not quite"}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {cfg.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
