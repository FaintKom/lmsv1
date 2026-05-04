"use client";
import { useState, useMemo } from "react";

interface SentenceBuilderConfig {
  words?: string[];
  correct_order?: string[];
  distractors?: string[];
  instructions?: string;
}

interface Props {
  config: SentenceBuilderConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SentenceBuilderExercise({ config, onSubmit }: Props) {
  const allWords = useMemo(() => {
    const words = [...(config.correct_order || []), ...(config.distractors || [])];
    return shuffle(words);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pool, setPool] = useState<string[]>(allWords);
  const [sentence, setSentence] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const addWord = (word: string, index: number) => {
    if (submitted) return;
    setSentence((prev) => [...prev, word]);
    setPool((prev) => prev.filter((_, i) => i !== index));
  };

  const removeWord = (word: string, index: number) => {
    if (submitted) return;
    setPool((prev) => [...prev, word]);
    setSentence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    if (submitted) return;
    setPool(allWords);
    setSentence([]);
  };

  const handleSubmit = () => {
    // Local check
    const correct = config.correct_order || [];
    const match =
      sentence.length === correct.length &&
      sentence.every((w, i) => w === correct[i]);
    setIsCorrect(match);
    setSubmitted(true);
    onSubmit({ word_order: sentence });
  };

  return (
    <div className="space-y-5">
      {/* Instructions */}
      {config.instructions && (
        <div className="flex items-start gap-3 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-5 py-4">
          <span className="text-lg flex-shrink-0">{"\uD83D\uDCA1"}</span>
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            {config.instructions}
          </p>
        </div>
      )}

      {/* Sentence building area */}
      <div
        className={`min-h-[80px] rounded-2xl border-2 border-dashed p-5 transition-all duration-200 ${
          submitted && isCorrect === true
            ? "border-green-300 bg-green-50/50 dark:border-green-500/40 dark:bg-green-500/5"
            : submitted && isCorrect === false
            ? "border-coral-300 bg-coral-50/50 dark:border-coral-500/40 dark:bg-coral-500/5"
            : "border-green-200 dark:border-green-500/30 bg-green-50/30 dark:bg-green-500/5"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Your sentence
          </span>
          {submitted && isCorrect === true && (
            <span className="text-green-500 font-bold text-sm">{"\u2713"} Correct!</span>
          )}
          {submitted && isCorrect === false && (
            <span className="text-coral-500 font-bold text-sm">{"\u2717"} Not quite</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
          {sentence.length === 0 ? (
            <span className="text-sm text-ink-400 dark:text-ink-500 italic">
              Tap words below to build your sentence...
            </span>
          ) : (
            sentence.map((word, i) => (
              <button
                key={`s-${i}`}
                onClick={() => removeWord(word, i)}
                disabled={submitted}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm
                  ${
                    submitted
                      ? "bg-green-500 text-white cursor-default"
                      : "bg-green-600 text-white hover:bg-green-700 hover:shadow-md active:scale-95"
                  }
                `}
              >
                {word}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Correct answer reveal */}
      {submitted && isCorrect === false && config.correct_order && (
        <div className="rounded-2xl bg-ink-50 dark:bg-white/5 border border-ink-200 dark:border-white/10 px-5 py-3">
          <p className="text-xs font-semibold text-ink-400 mb-2">Correct order:</p>
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
            {config.correct_order.join(" ")}
          </p>
        </div>
      )}

      {/* Word pool */}
      <div className="rounded-2xl border border-ink-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">
          Available words
        </p>
        <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
          {pool.length === 0 ? (
            <span className="text-sm text-ink-400 italic">All words used</span>
          ) : (
            pool.map((word, i) => (
              <button
                key={`p-${i}`}
                onClick={() => addWord(word, i)}
                disabled={submitted}
                className="rounded-xl border-2 border-ink-200 dark:border-white/15 bg-white dark:bg-[#2A2A2A] px-4 py-2.5 text-sm font-semibold text-ink-700 dark:text-ink-200 transition-all duration-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 hover:shadow-sm dark:hover:border-green-500 dark:hover:bg-green-500/10 dark:hover:text-green-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {word}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      {!submitted && (
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={sentence.length === 0}
            className="flex-1 rounded-2xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-green-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Check Sentence
          </button>
          <button
            onClick={handleReset}
            disabled={sentence.length === 0}
            className="rounded-2xl border-2 border-ink-200 dark:border-white/15 px-5 py-3.5 text-sm font-semibold text-ink-700 dark:text-ink-300 transition-all duration-200 hover:bg-ink-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
