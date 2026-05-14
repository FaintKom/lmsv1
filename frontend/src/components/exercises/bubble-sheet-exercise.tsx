"use client";
import { useState } from "react";

interface Question {
  number: number;
  options: string[];
  correct: string;
}

interface BubbleSheetConfig {
  questions?: Question[];
  num_options?: number;
  passing_score?: number;
}

interface Props {
  config: BubbleSheetConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
}

export default function BubbleSheetExercise({ config, onSubmit }: Props) {
  const questions = config.questions || [];
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  if (!questions.length) {
    return <p className="text-sm text-text-muted">No questions configured.</p>;
  }

  const handleSelect = (qIndex: number, option: string) => {
    if (submitted) return;
    setSelected((prev) => ({ ...prev, [String(qIndex)]: option }));
  };

  const handleSubmit = () => {
    const r: Record<string, boolean> = {};
    questions.forEach((q, i) => {
      const given = (selected[String(i)] || "").toUpperCase();
      const expected = (q.correct || "").toUpperCase();
      r[String(i)] = given === expected;
    });
    setResults(r);
    setSubmitted(true);
    onSubmit({ answers: selected });
  };

  const allAnswered = questions.every((_, i) => selected[String(i)] !== undefined);
  const correctCount = Object.values(results).filter(Boolean).length;
  const passingScore = config.passing_score ?? 70;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-2.5">
        <span className="text-sm font-semibold text-ink-700">Answer Sheet</span>
        <span className="text-xs text-text-muted">{questions.length} questions · Passing: {passingScore}%</span>
      </div>

      <div className="space-y-2">
        {questions.map((q, qi) => {
          const options = q.options || ["A", "B", "C", "D"];
          const isCorrect = submitted ? results[String(qi)] : undefined;
          return (
            <div
              key={qi}
              className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors ${
                isCorrect === true
                  ? "border-primary bg-success-soft"
                  : isCorrect === false
                  ? "border-danger bg-danger-soft"
                  : "border-border bg-paper-2"
              }`}
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                {q.number || qi + 1}
              </span>

              <div className="flex gap-2">
                {options.map((opt) => {
                  const isSelected = selected[String(qi)] === opt;
                  const isCorrectOption = submitted && opt.toUpperCase() === q.correct.toUpperCase();
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(qi, opt)}
                      disabled={submitted}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-150 ${
                        submitted && isCorrectOption
                          ? "border-primary bg-primary text-white"
                          : submitted && isSelected && !isCorrectOption
                          ? "border-danger bg-danger text-white"
                          : isSelected
                          ? "border-primary bg-primary text-white scale-110"
                          : "border-border-strong bg-paper-2 text-text-muted hover:border-ink-300 hover:bg-surface-2"
                      } disabled:cursor-not-allowed`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {submitted && isCorrect === true && <span className="ml-auto text-sm text-primary">✓</span>}
              {submitted && isCorrect === false && (
                <span className="ml-auto text-xs text-danger-fg">Correct: {q.correct}</span>
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="w-full rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Answers
        </button>
      ) : (
        <div
          className={`rounded-lg px-5 py-3 text-sm font-semibold ${
            (correctCount / questions.length) * 100 >= passingScore
              ? "bg-success-soft text-success-fg"
              : "bg-sun-50 text-warning-fg"
          }`}
        >
          {correctCount} of {questions.length} correct ({Math.round((correctCount / questions.length) * 100)}%)
          {(correctCount / questions.length) * 100 >= passingScore ? " — Passed!" : ` — Need ${passingScore}% to pass.`}
        </div>
      )}
    </div>
  );
}
