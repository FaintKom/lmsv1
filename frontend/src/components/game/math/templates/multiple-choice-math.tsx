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
 question: string; // supports KaTeX: "What is $\\frac{3}{4} + \\frac{1}{2}$?"
 choices: Choice[];
 explanation: string; // shown after answering
 difficulty?: string;
 standard?: string; // e.g. "SAT.Algebra.1" or "CCSS.7.RP.3"
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
 <div className="rounded-lg border border-border-strong bg-surface-2 px-5 py-4 ">
 <div className="text-base font-medium text-ink-700 ">
 {containsMath(cfg.question) ? <MathRenderer content={cfg.question} /> : cfg.question}
 </div>
 {false && cfg.standard && (
 <span className="mt-2 inline-block rounded bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary ">
 {cfg.standard}
 </span>
 )}
 </div>

 {/* Choices */}
 <div className="space-y-2">
 {cfg.choices.map((choice, i) => {
 const isThis = selected === i;
 let borderClass = "border-border-strong ";
 let bgClass = "bg-paper-2 ";

 if (submitted) {
 if (choice.correct) {
 borderClass = "border-primary ";
 bgClass = "bg-success-soft ";
 } else if (isThis && !choice.correct) {
 borderClass = "border-danger ";
 bgClass = "bg-danger-soft ";
 }
 } else if (isThis) {
 borderClass = "border-primary ";
 bgClass = "bg-success-soft ";
 }

 return (
 <button
 key={i}
 onClick={() => !submitted && setSelected(i)}
 disabled={submitted}
 className={`flex w-full items-center gap-4 rounded-lg border-2 px-5 py-4 text-left transition-all ${borderClass} ${bgClass} ${
 !submitted ? "$1:border-primary " : ""
 }`}
 >
 <span
 className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
 submitted && choice.correct
 ? "bg-primary text-white"
 : submitted && isThis && !choice.correct
 ? "bg-danger text-white"
 : isThis
 ? "bg-primary text-white"
 : "bg-ink-100 text-text-muted "
 }`}
 >
 {labels[i]}
 </span>
 <span className="text-sm font-medium text-ink-700 ">
 {containsMath(choice.text) ? <MathRenderer content={choice.text} /> : choice.text}
 </span>
 {submitted && choice.correct && (
 <span className="ml-auto text-xs font-semibold text-primary ">
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
 <div className={`rounded-lg border p-4 ${
 isCorrect
 ? "border-primary-soft bg-success-soft "
 : "border-warning bg-sun-50 "
 }`}>
 <p className={`text-xs font-semibold mb-1 ${isCorrect ? "text-primary " : "text-warning-fg "}`}>
 {isCorrect ? "Correct!" : "Not quite"}
 </p>
 <p className="text-sm text-ink-700 ">
 {cfg.explanation}
 </p>
 </div>
 )}
 </div>
 );
}
