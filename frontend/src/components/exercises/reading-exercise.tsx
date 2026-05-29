"use client";
import { useState } from "react";

interface ReadingOption {
 id: string;
 text: string;
 is_correct?: boolean;
}

interface ReadingQuestion {
 question?: string;
 text?: string;
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
 <div className="rounded-lg border border-border-strong bg-paper-2 shadow-sm overflow-hidden">
 <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-surface-2 ">
 <span className="text-lg">{"\uD83D\uDCD6"}</span>
 <span className="text-xs font-semibold uppercase tracking-wider text-text-muted ">
 Reading Passage
 </span>
 </div>
 <div className="p-5 max-h-[320px] overflow-y-auto">
 <div className="text-[15px] leading-[1.8] text-ink-700 whitespace-pre-wrap font-[Georgia,serif]">
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
 className={`h-2.5 rounded-pill transition-all duration-300 ${
 i === currentQ
 ? "w-8 bg-primary"
 : submitted && results[String(i)] === true
 ? "w-2.5 bg-primary"
 : submitted && results[String(i)] === false
 ? "w-2.5 bg-danger-soft"
 : answers[String(i)]?.trim()
 ? "w-2.5 bg-primary-soft"
 : "w-2.5 bg-ink-200 "
 }`}
 />
 ))}
 </div>
 <span className="text-xs font-medium text-text-subtle">
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
 <div className="rounded-lg border border-border-strong bg-paper-2 shadow-sm p-5 space-y-4">
 {/* Question text */}
 <div className="flex items-start gap-3">
 <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-pill bg-primary-soft text-sm font-bold text-primary ">
 {qi + 1}
 </span>
 <p className="text-[15px] font-medium text-ink-700 pt-1">
 {q.question || q.text}
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
 className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all duration-200
 ${
 isCorrectOption
 ? "border-primary bg-success-soft text-success-fg "
 : isWrongSelection
 ? "border-danger bg-danger-soft text-danger-fg "
 : isSelected
 ? "border-primary bg-success-soft text-text shadow-sm"
 : "border-border-strong text-ink-700 hover:border-primary hover:bg-success-soft/50 "
 }
 disabled:cursor-default
 `}
 >
 <div className="flex items-center justify-between">
 <span>{opt.text}</span>
 {isCorrectOption && (
 <span className="text-primary font-bold">{"\u2713"}</span>
 )}
 {isWrongSelection && (
 <span className="text-danger-fg font-bold">{"\u2717"}</span>
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
 className={`w-full rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all duration-200 outline-none
 ${
 submitted && results[String(qi)] === true
 ? "border-primary bg-success-soft text-success-fg "
 : submitted && results[String(qi)] === false
 ? "border-danger bg-danger-soft text-danger-fg "
 : "border-border-strong bg-surface-2 text-ink-700 focus:border-primary focus:ring-2 focus:ring-primary/20"
 }
 disabled:cursor-not-allowed
 `}
 />
 {submitted && results[String(qi)] === false && q.correct_answer && (
 <p className="mt-2 text-xs text-danger-fg font-medium">
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
 className="rounded-lg border-2 border-border-strong px-5 py-3 text-sm font-semibold text-text-muted transition-all duration-200 hover:bg-surface-2 "
 >
 {"\u2190"} Previous
 </button>
 )}

 {totalQuestions > 1 && currentQ < totalQuestions - 1 && (
 <button
 onClick={() => setCurrentQ((p) => p + 1)}
 className="rounded-lg border-2 border-primary-soft px-5 py-3 text-sm font-semibold text-primary transition-all duration-200 hover:bg-success-soft "
 >
 Next {"\u2192"}
 </button>
 )}

 {!submitted && (currentQ === totalQuestions - 1 || totalQuestions <= 1) && (
 <button
 onClick={handleSubmit}
 disabled={!allAnswered}
 className="flex-1 rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Submit Answers
 </button>
 )}
 </div>

 {/* Result summary */}
 {submitted && (
 <div
 className={`rounded-lg px-5 py-3 text-sm font-semibold ${
 correctCount === totalQuestions
 ? "bg-success-soft text-success-fg "
 : "bg-sun-50 text-warning-fg "
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
