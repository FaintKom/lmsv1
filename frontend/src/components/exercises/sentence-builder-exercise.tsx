"use client";
import { useState, useMemo } from "react";

interface SentenceBuilderConfig {
 words?: string[];
 correct_order?: string[];
 distractors?: string[];
 // word_bank is what the backend ships to students — pre-shuffled pool of
 // the correct words + distractors. `correct_order` is stripped from the
 // student-facing response so the answer can't be read off the wire, which
 // means without word_bank the only words available would be distractors.
 word_bank?: string[];
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
 // Prefer the server-provided `word_bank` (already includes correct words +
 // distractors, pre-shuffled). Fall back to `correct_order + distractors`
 // for admin previews where the answer hasn't been stripped.
 if (config.word_bank && config.word_bank.length > 0) {
 return shuffle(config.word_bank);
 }
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
 <div className="flex items-start gap-3 rounded-lg bg-success-soft border border-primary-soft px-5 py-4">
 <span className="text-lg flex-shrink-0">{"\uD83D\uDCA1"}</span>
 <p className="text-sm font-medium text-success-fg ">
 {config.instructions}
 </p>
 </div>
 )}

 {/* Sentence building area */}
 <div
 className={`min-h-[80px] rounded-lg border-2 border-dashed p-5 transition-all duration-200 ${
 submitted && isCorrect === true
 ? "border-primary bg-success-soft/50 "
 : submitted && isCorrect === false
 ? "border-danger bg-danger-soft/50 "
 : "border-primary-soft bg-success-soft/30 "
 }`}
 >
 <div className="flex items-center gap-2 mb-3">
 <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
 Your sentence
 </span>
 {submitted && isCorrect === true && (
 <span className="text-primary font-bold text-sm">{"\u2713"} Correct!</span>
 )}
 {submitted && isCorrect === false && (
 <span className="text-danger-fg font-bold text-sm">{"\u2717"} Not quite</span>
 )}
 </div>
 <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
 {sentence.length === 0 ? (
 <span className="text-sm text-text-subtle italic">
 Tap words below to build your sentence...
 </span>
 ) : (
 sentence.map((word, i) => (
 <button
 key={`s-${i}`}
 onClick={() => removeWord(word, i)}
 disabled={submitted}
 className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm
 ${
 submitted
 ? "bg-primary text-white cursor-default"
 : "bg-primary text-white hover:bg-primary-hover hover:shadow-md active:scale-95"
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
 <div className="rounded-lg bg-surface-2 border border-border-strong px-5 py-3">
 <p className="text-xs font-semibold text-text-subtle mb-2">Correct order:</p>
 <p className="text-sm font-medium text-ink-700 ">
 {config.correct_order.join(" ")}
 </p>
 </div>
 )}

 {/* Word pool */}
 <div className="rounded-lg border border-border-strong bg-paper-2 shadow-sm p-5">
 <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle mb-3">
 Available words
 </p>
 <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
 {pool.length === 0 ? (
 <span className="text-sm text-text-subtle italic">All words used</span>
 ) : (
 pool.map((word, i) => (
 <button
 key={`p-${i}`}
 onClick={() => addWord(word, i)}
 disabled={submitted}
 className="rounded-lg border-2 border-border-strong bg-paper-2 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-all duration-200 hover:border-primary hover:bg-success-soft hover:text-success-fg hover:shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
 className="flex-1 rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Check Sentence
 </button>
 <button
 onClick={handleReset}
 disabled={sentence.length === 0}
 className="rounded-lg border-2 border-border-strong px-5 py-3.5 text-sm font-semibold text-text-muted transition-all duration-200 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Reset
 </button>
 </div>
 )}
 </div>
 );
}
