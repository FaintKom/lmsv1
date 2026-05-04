"use client";
import { useState } from "react";

interface TableRow {
  pronoun: string;
  correct: string;
}

interface ConjugationConfig {
  verb?: string;
  tense?: string;
  language?: string;
  table?: TableRow[];
}

interface Props {
  config: ConjugationConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
}

export default function ConjugationExercise({ config, onSubmit }: Props) {
  const table = config.table || [];
  const pronouns = table.map((t) => t.pronoun);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    pronouns.forEach((p) => {
      init[p] = "";
    });
    return init;
  });

  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const handleChange = (pronoun: string, value: string) => {
    if (submitted) return;
    setValues((prev) => ({ ...prev, [pronoun]: value }));
  };

  const allFilled = pronouns.every((p) => values[p]?.trim());

  const handleCheck = () => {
    // Local check for immediate feedback
    const r: Record<string, boolean> = {};
    table.forEach((row) => {
      const given = (values[row.pronoun] || "").trim().toLowerCase();
      const expected = (row.correct || "").trim().toLowerCase();
      r[row.pronoun] = given === expected;
    });
    setResults(r);
    setSubmitted(true);
    onSubmit({ conjugations: values });
  };

  const correctCount = Object.values(results).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Verb header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
        <div className="absolute -right-4 -top-4 text-[80px] opacity-10 select-none">
          {"\u270D\uFE0F"}
        </div>
        <p className="text-sm font-medium text-green-100 mb-1">Conjugate the verb</p>
        <p className="text-3xl font-bold tracking-tight">{config.verb || "?"}</p>
        {config.tense && (
          <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {config.tense}
          </span>
        )}
        {config.language && (
          <span className="mt-3 ml-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {config.language}
          </span>
        )}
      </div>

      {/* Conjugation rows */}
      <div className="rounded-2xl border border-ink-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-sm overflow-hidden">
        {pronouns.map((pronoun, i) => {
          const isCorrect = submitted ? results[pronoun] : undefined;
          const rowBg =
            isCorrect === true
              ? "bg-green-50 dark:bg-green-500/10"
              : isCorrect === false
              ? "bg-coral-50 dark:bg-coral-500/10"
              : i % 2 === 0
              ? "bg-white dark:bg-[#1E1E1E]"
              : "bg-ink-50/60 dark:bg-white/[0.02]";

          return (
            <div
              key={pronoun}
              className={`flex items-center gap-4 px-4 py-3 transition-colors duration-200 ${rowBg} ${
                i > 0 ? "border-t border-ink-100 dark:border-white/5" : ""
              }`}
            >
              {/* Pronoun badge */}
              <div className="flex-shrink-0 w-24">
                <span className="inline-block rounded-xl bg-green-100 dark:bg-green-500/20 px-3 py-1.5 text-sm font-semibold text-green-700 dark:text-green-300">
                  {pronoun}
                </span>
              </div>

              {/* Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={values[pronoun] || ""}
                  onChange={(e) => handleChange(pronoun, e.target.value)}
                  placeholder="Type conjugation..."
                  disabled={submitted}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 outline-none
                    ${
                      submitted && isCorrect === true
                        ? "border-2 border-green-400 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-500/10 dark:text-green-300"
                        : submitted && isCorrect === false
                        ? "border-2 border-coral-300 bg-coral-50 text-coral-700 dark:border-coral-500 dark:bg-coral-500/10 dark:text-coral-300"
                        : "border-2 border-ink-200 dark:border-white/15 bg-ink-50 dark:bg-[#2A2A2A] text-ink-900 dark:text-ink-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    }
                    disabled:cursor-not-allowed
                  `}
                />
                {/* Feedback icon */}
                {submitted && isCorrect === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-lg">
                    {"\u2713"}
                  </span>
                )}
                {submitted && isCorrect === false && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-coral-500 text-lg">
                    {"\u2717"}
                  </span>
                )}
              </div>

              {/* Show correct answer after wrong */}
              {submitted && isCorrect === false && (
                <div className="flex-shrink-0 text-xs text-coral-500 dark:text-coral-300 font-medium">
                  {table.find((r) => r.pronoun === pronoun)?.correct}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result summary */}
      {submitted && (
        <div
          className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
            correctCount === pronouns.length
              ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
              : "bg-sun-50 text-sun-700 dark:bg-sun-500/10 dark:text-sun-400"
          }`}
        >
          {correctCount === pronouns.length
            ? "Perfect! All conjugations are correct!"
            : `${correctCount} of ${pronouns.length} correct. Keep practicing!`}
        </div>
      )}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleCheck}
          disabled={!allFilled}
          className="w-full rounded-2xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-green-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-md"
        >
          Check Answers
        </button>
      )}
    </div>
  );
}
