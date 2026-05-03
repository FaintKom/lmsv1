"use client";
import { useState } from "react";

interface ReadingOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

interface ReadingQuestion {
  question: string;
  type: "multiple_choice" | "text";
  options?: ReadingOption[];
  correct_answer?: string;
}

interface ReadingConfig {
  passage?: string;
  questions?: ReadingQuestion[];
}

interface Props {
  config: ReadingConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
}

export default function ReadingExercise({ config, onSubmit }: Props) {
  const questions = config.questions || [];
  const totalQuestions = questions.length;

  // For MC: store option id. For text: store the string.
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    questions.forEach((_, i) => {
      init[String(i)] = "";
    });
    return init;
  });

  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const handleSelectOption = (qi: number, optionId: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [String(qi)]: optionId }));
  };

  const handleTextChange = (qi: number, value: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [String(qi)]: value }));
  };

  const allAnswered = questions.every((_, i) => answers[String(i)]?.trim());

  const handleSubmit = () => {
    // Local grading for immediate feedback
    const r: Record<string, boolean> = {};
    questions.forEach((q, i) => {
      const studentAnswer = answers[String(i)];
      if (q.type === "multiple_choice" && q.options) {
        const correctOpt = q.options.find((o) => o.is_correct);
        r[String(i)] = correctOpt?.id === studentAnswer;
      } else if (q.type === "text") {
        const expected = (q.correct_answer || "").trim().toLowerCase();
        const given = (studentAnswer || "").trim().toLowerCase();
        r[String(i)] = given === expected;
      }
    });
    setResults(r);
    setSubmitted(true);
    onSubmit({ answers });
  };

  const correctCount = Object.values(results).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Passage card */}
      <div className="rounded-2xl border border-ink-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-ink-100 dark:border-white/5 bg-ink-50 dark:bg-white/[0.03]">
          <span className="text-lg">{"\uD83D\uDCD6"}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Reading Passage
          </span>
        </div>
        <div className="p-5 max-h-[320px] overflow-y-auto">
          <div className="text-[15px] leading-[1.8] text-ink-700 dark:text-ink-200 whitespace-pre-wrap font-[Georgia,serif]">
            {config.passage || "No passage provided."}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {totalQuestions > 1 && (
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === currentQ
                    ? "w-8 bg-green-500"
                    : submitted && results[String(i)] === true
                    ? "w-2.5 bg-green-400"
                    : submitted && results[String(i)] === false
                    ? "w-2.5 bg-coral-300"
                    : answers[String(i)]?.trim()
                    ? "w-2.5 bg-green-300"
                    : "w-2.5 bg-ink-200 dark:bg-white/15"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-ink-400">
            {currentQ + 1} / {totalQuestions}
          </span>
        </div>
      )}

      {/* Question card */}
      {questions.map((q, qi) => (
        <div
          key={qi}
          className={`transition-all duration-300 ${qi === currentQ ? "block" : "hidden"}`}
        >
          <div className="rounded-2xl border border-ink-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-sm p-5 space-y-4">
            {/* Question text */}
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 text-sm font-bold text-green-600 dark:text-green-400">
                {qi + 1}
              </span>
              <p className="text-[15px] font-medium text-ink-900 dark:text-ink-200 pt-1">
                {q.question}
              </p>
            </div>

            {/* Multiple choice options as selectable cards */}
            {q.type === "multiple_choice" && q.options ? (
              <div className="space-y-2.5 pl-11">
                {q.options.map((opt) => {
                  const isSelected = answers[String(qi)] === opt.id;
                  const isCorrectOption = submitted && opt.is_correct;
                  const isWrongSelection = submitted && isSelected && !opt.is_correct;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(qi, opt.id)}
                      disabled={submitted}
                      className={`w-full text-left rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200
                        ${
                          isCorrectOption
                            ? "border-green-400 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-500/10 dark:text-green-300"
                            : isWrongSelection
                            ? "border-coral-300 bg-coral-50 text-coral-700 dark:border-coral-500 dark:bg-coral-500/10 dark:text-coral-300"
                            : isSelected
                            ? "border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-500/15 dark:text-green-300 shadow-sm"
                            : "border-ink-200 dark:border-white/10 text-ink-700 dark:text-ink-300 hover:border-green-300 hover:bg-green-50/50 dark:hover:border-green-500/40 dark:hover:bg-green-500/5"
                        }
                        disabled:cursor-default
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt.text}</span>
                        {isCorrectOption && (
                          <span className="text-green-500 font-bold">{"\u2713"}</span>
                        )}
                        {isWrongSelection && (
                          <span className="text-coral-500 font-bold">{"\u2717"}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Text input */
              <div className="pl-11">
                <input
                  type="text"
                  value={answers[String(qi)] || ""}
                  onChange={(e) => handleTextChange(qi, e.target.value)}
                  placeholder="Type your answer..."
                  disabled={submitted}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 outline-none
                    ${
                      submitted && results[String(qi)] === true
                        ? "border-green-400 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-500/10 dark:text-green-300"
                        : submitted && results[String(qi)] === false
                        ? "border-coral-300 bg-coral-50 text-coral-700 dark:border-coral-500 dark:bg-coral-500/10 dark:text-coral-300"
                        : "border-ink-200 dark:border-white/15 bg-ink-50 dark:bg-[#2A2A2A] text-ink-900 dark:text-ink-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    }
                    disabled:cursor-not-allowed
                  `}
                />
                {submitted && results[String(qi)] === false && q.correct_answer && (
                  <p className="mt-2 text-xs text-coral-500 dark:text-coral-300 font-medium">
                    Correct answer: {q.correct_answer}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Navigation + Submit */}
      <div className="flex items-center gap-3">
        {totalQuestions > 1 && currentQ > 0 && (
          <button
            onClick={() => setCurrentQ((p) => p - 1)}
            className="rounded-2xl border-2 border-ink-200 dark:border-white/15 px-5 py-3 text-sm font-semibold text-ink-700 dark:text-ink-300 transition-all duration-200 hover:bg-ink-50 dark:hover:bg-white/5"
          >
            {"\u2190"} Previous
          </button>
        )}

        {totalQuestions > 1 && currentQ < totalQuestions - 1 && (
          <button
            onClick={() => setCurrentQ((p) => p + 1)}
            className="rounded-2xl border-2 border-green-200 dark:border-green-500/30 px-5 py-3 text-sm font-semibold text-green-600 dark:text-green-400 transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-500/10"
          >
            Next {"\u2192"}
          </button>
        )}

        {!submitted && (currentQ === totalQuestions - 1 || totalQuestions <= 1) && (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="flex-1 rounded-2xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-green-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Answers
          </button>
        )}
      </div>

      {/* Result summary */}
      {submitted && (
        <div
          className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
            correctCount === totalQuestions
              ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
              : "bg-sun-50 text-sun-700 dark:bg-sun-500/10 dark:text-sun-400"
          }`}
        >
          {correctCount === totalQuestions
            ? "Excellent! All answers are correct!"
            : `${correctCount} of ${totalQuestions} correct. Review the highlighted answers above.`}
        </div>
      )}
    </div>
  );
}
