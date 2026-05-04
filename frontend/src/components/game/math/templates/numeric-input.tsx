"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MathRenderer, containsMath } from "@/components/common/math-renderer";
import type { MathTemplateProps } from "../template-registry";

interface NumericConfig {
 question: string;
 correct_answers: number[]; // multiple accepted (e.g., [6, 6.0])
 tolerance: number; // e.g., 0.01 for exact, 0.1 for approximate
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
 <div className="w-full max-w-lg rounded-lg border border-border-strong bg-surface-2 px-5 py-4 ">
 <div className="text-base font-medium text-ink-700 ">
 {containsMath(cfg.question) ? <MathRenderer content={cfg.question} /> : cfg.question}
 </div>
 {false && cfg.standard && (
 <span className="mt-2 inline-block rounded bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary ">
 {cfg.standard}
 </span>
 )}
 </div>

 {/* Answer input */}
 <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
 <label className="text-sm font-medium text-text-muted ">
 Answer:
 </label>
 <input
 ref={inputRef}
 type="text"
 inputMode="decimal"
 value={answer}
 onChange={(e) => setAnswer(e.target.value)}
 onKeyDown={handleKeyDown}
 disabled={submitted}
 placeholder={cfg.allow_fraction ? "e.g., 7 or 3/4" : "Enter a number"}
 className={`w-full max-w-[200px] rounded-lg border-2 px-4 py-3 text-center text-xl font-bold outline-none transition-colors ${
 submitted
 ? isCorrect
 ? "border-green-300 bg-success-soft text-success-fg "
 : "border-danger bg-danger-soft text-danger-fg "
 : "border-green-300 bg-paper-2 text-success-fg focus:border-primary "
 }`}
 autoFocus
 />
 </div>

 {/* Format hint */}
 {!submitted && (
 <p className="text-xs text-text-subtle">
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
 <div className="w-full max-w-lg rounded-lg bg-sun-50 p-3 text-xs text-warning-fg ">
 {cfg.hint}
 </div>
 )}

 {/* Result / Explanation */}
 {submitted && (
 <div className={`w-full max-w-lg rounded-lg border p-4 ${
 isCorrect
 ? "border-primary-soft bg-success-soft "
 : "border-danger bg-danger-soft "
 }`}>
 <p className={`text-sm font-semibold mb-1 ${isCorrect ? "text-primary " : "text-danger-fg "}`}>
 {isCorrect ? "Correct!" : `Incorrect. The answer is ${cfg.correct_answers[0]}`}
 </p>
 <p className="text-sm text-ink-700 ">
 {cfg.explanation}
 </p>
 </div>
 )}
 </div>
 );
}
