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
 <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
 <div className="absolute -right-4 -top-4 text-[80px] opacity-10 select-none">
 {"\u270D\uFE0F"}
 </div>
 <p className="text-sm font-medium text-success-soft mb-1">Conjugate the verb</p>
 <p className="text-3xl font-bold tracking-tight">{config.verb || "?"}</p>
 {config.tense && (
 <span className="mt-3 inline-block rounded-pill bg-paper-2/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
 {config.tense}
 </span>
 )}
 {config.language && (
 <span className="mt-3 ml-2 inline-block rounded-pill bg-paper-2/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
 {config.language}
 </span>
 )}
 </div>

 {/* Conjugation rows */}
 <div className="rounded-lg border border-border-strong bg-paper-2 shadow-sm overflow-hidden">
 {pronouns.map((pronoun, i) => {
 const isCorrect = submitted ? results[pronoun] : undefined;
 const rowBg =
 isCorrect === true
 ? "bg-success-soft "
 : isCorrect === false
 ? "bg-danger-soft "
 : i % 2 === 0
 ? "bg-paper-2 "
 : "bg-surface-2/60 ";

 return (
 <div
 key={pronoun}
 className={`flex items-center gap-4 px-4 py-3 transition-colors duration-200 ${rowBg} ${
 i > 0 ? "border-t border-border " : ""
 }`}
 >
 {/* Pronoun badge */}
 <div className="flex-shrink-0 w-24">
 <span className="inline-block rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-semibold text-success-fg ">
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
 className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 outline-none
 ${
 submitted && isCorrect === true
 ? "border-2 border-green-300 bg-success-soft text-success-fg "
 : submitted && isCorrect === false
 ? "border-2 border-danger bg-danger-soft text-danger-fg "
 : "border-2 border-border-strong bg-surface-2 text-ink-700 focus:border-primary focus:ring-2 focus:ring-green-500/20"
 }
 disabled:cursor-not-allowed
 `}
 />
 {/* Feedback icon */}
 {submitted && isCorrect === true && (
 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary text-lg">
 {"\u2713"}
 </span>
 )}
 {submitted && isCorrect === false && (
 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-danger-fg text-lg">
 {"\u2717"}
 </span>
 )}
 </div>

 {/* Show correct answer after wrong */}
 {submitted && isCorrect === false && (
 <div className="flex-shrink-0 text-xs text-danger-fg font-medium">
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
 className={`rounded-lg px-5 py-3 text-sm font-semibold ${
 correctCount === pronouns.length
 ? "bg-success-soft text-success-fg "
 : "bg-sun-50 text-warning-fg "
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
 className="w-full rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 $1:bg-primary-hover hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-md"
 >
 Check Answers
 </button>
 )}
 </div>
 );
}
