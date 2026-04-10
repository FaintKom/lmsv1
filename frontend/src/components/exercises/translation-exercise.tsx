"use client";
import { useState } from "react";

interface TranslationConfig {
  source_text?: string;
  source_language?: string;
  target_language?: string;
  hints?: string[];
  accepted_answers?: string[];
  case_sensitive?: boolean;
}

interface Props {
  config: TranslationConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
}

const LANG_FLAGS: Record<string, string> = {
  en: "\uD83C\uDDEC\uD83C\uDDE7",
  es: "\uD83C\uDDEA\uD83C\uDDF8",
  fr: "\uD83C\uDDEB\uD83C\uDDF7",
  de: "\uD83C\uDDE9\uD83C\uDDEA",
  it: "\uD83C\uDDEE\uD83C\uDDF9",
  pt: "\uD83C\uDDF5\uD83C\uDDF9",
  ru: "\uD83C\uDDF7\uD83C\uDDFA",
  ja: "\uD83C\uDDEF\uD83C\uDDF5",
  ko: "\uD83C\uDDF0\uD83C\uDDF7",
  zh: "\uD83C\uDDE8\uD83C\uDDF3",
  ar: "\uD83C\uDDF8\uD83C\uDDE6",
  hi: "\uD83C\uDDEE\uD83C\uDDF3",
  tr: "\uD83C\uDDF9\uD83C\uDDF7",
  pl: "\uD83C\uDDF5\uD83C\uDDF1",
  nl: "\uD83C\uDDF3\uD83C\uDDF1",
  uk: "\uD83C\uDDFA\uD83C\uDDE6",
};

function getLangLabel(code?: string): string {
  if (!code) return "?";
  return code.charAt(0).toUpperCase() + code.slice(1);
}

function getLangFlag(code?: string): string {
  if (!code) return "\uD83C\uDF10";
  return LANG_FLAGS[code.toLowerCase()] || "\uD83C\uDF10";
}

export default function TranslationExercise({ config, onSubmit }: Props) {
  const [answer, setAnswer] = useState("");
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const maxLen = 500;
  const charCount = answer.length;

  const toggleHint = (index: number) => {
    setRevealedHints((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    // Local check for immediate feedback
    const accepted = config.accepted_answers || [];
    const caseSensitive = config.case_sensitive ?? false;
    const studentAnswer = answer.trim();

    if (accepted.length > 0) {
      const match = accepted.some((a) =>
        caseSensitive ? a.trim() === studentAnswer : a.trim().toLowerCase() === studentAnswer.toLowerCase()
      );
      setIsCorrect(match);
    }

    setSubmitted(true);
    onSubmit({ translation: answer });
  };

  return (
    <div className="space-y-5">
      {/* Source text card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-sm overflow-hidden">
        {/* Language bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getLangFlag(config.source_language)}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {getLangLabel(config.source_language)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-xs">{"\u2192"}</span>
            <span className="text-lg">{getLangFlag(config.target_language)}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {getLangLabel(config.target_language)}
            </span>
          </div>
        </div>

        {/* Source text */}
        <div className="p-6">
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
            {config.source_text || "No text provided"}
          </p>
        </div>
      </div>

      {/* Translation input */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={answer}
            onChange={(e) => {
              if (!submitted && e.target.value.length <= maxLen) {
                setAnswer(e.target.value);
              }
            }}
            placeholder={`Type your ${getLangLabel(config.target_language)} translation...`}
            rows={3}
            disabled={submitted}
            className={`w-full rounded-2xl border-2 px-5 py-4 text-[15px] font-medium transition-all duration-200 outline-none resize-none
              ${
                submitted && isCorrect === true
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : submitted && isCorrect === false
                  ? "border-red-400 bg-red-50 text-red-800 dark:border-red-500 dark:bg-red-500/10 dark:text-red-300"
                  : "border-slate-200 dark:border-white/15 bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              }
              disabled:cursor-not-allowed
            `}
          />
          {/* Character count */}
          <span
            className={`absolute bottom-3 right-4 text-xs font-medium ${
              charCount > maxLen * 0.9 ? "text-amber-500" : "text-slate-300 dark:text-slate-600"
            }`}
          >
            {charCount}/{maxLen}
          </span>
        </div>

        {/* Feedback after submit */}
        {submitted && isCorrect === true && (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {"\u2713"} Great translation!
          </p>
        )}
        {submitted && isCorrect === false && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {"\u2717"} Not quite right
            </p>
            {config.accepted_answers && config.accepted_answers.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accepted: {config.accepted_answers[0]}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hints */}
      {config.hints && config.hints.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {"\uD83D\uDCA1"} Hints (tap to reveal)
          </p>
          <div className="flex flex-wrap gap-2">
            {config.hints.map((h, i) => (
              <button
                key={i}
                onClick={() => toggleHint(i)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  revealedHints.has(i)
                    ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30"
                    : "bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15"
                }`}
              >
                {revealedHints.has(i) ? h : `Hint ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="w-full rounded-2xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-green-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Translation
        </button>
      )}
    </div>
  );
}
