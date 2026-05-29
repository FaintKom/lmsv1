"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Flag } from "lucide-react";
import type { SATQuestion } from "./sat-question-bank";

interface ReviewScreenProps {
 moduleNumber: 1 | 2;
 totalModules: number;
 questions: SATQuestion[];
 answers: Record<string, string | null>;
 flagged: Set<number>;
 onGoToQuestion: (index: number) => void;
 onSubmitModule: () => void;
 onCancel: () => void;
}

export default function SATReviewScreen({
 moduleNumber,
 totalModules,
 questions,
 answers,
 flagged,
 onGoToQuestion,
 onSubmitModule,
 onCancel,
}: ReviewScreenProps) {
 const [confirmSubmit, setConfirmSubmit] = useState(false);

 const total = questions.length;
 const answeredCount = questions.filter(
 (q) => answers[q.id] !== null && answers[q.id] !== undefined
 ).length;
 const unansweredCount = total - answeredCount;
 const flaggedCount = flagged.size;

 const handleSubmitClick = () => {
 if (confirmSubmit) {
 onSubmitModule();
 } else {
 setConfirmSubmit(true);
 }
 };

 return (
 <div className="fixed inset-0 z-[101] flex flex-col bg-paper-2 ">
 {/* Header */}
 <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
 <h1 className="text-lg font-semibold text-white">
 Review &mdash; Module {moduleNumber} of {totalModules}
 </h1>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto px-6 py-6">
 {/* Summary row */}
 <div className="mb-6 flex flex-wrap items-center gap-6">
 <div className="flex items-center gap-2 text-primary ">
 <CheckCircle className="h-5 w-5" />
 <span className="text-sm font-medium">
 Answered: {answeredCount}/{total}
 </span>
 </div>
 <div
 className={`flex items-center gap-2 ${
 unansweredCount > 0
 ? "text-danger-fg "
 : "text-text-subtle "
 }`}
 >
 <AlertCircle className="h-5 w-5" />
 <span className="text-sm font-medium">
 Unanswered: {unansweredCount}
 </span>
 </div>
 <div
 className={`flex items-center gap-2 ${
 flaggedCount > 0
 ? "text-warning-fg "
 : "text-text-subtle "
 }`}
 >
 <Flag className="h-5 w-5" />
 <span className="text-sm font-medium">
 Flagged: {flaggedCount}
 </span>
 </div>
 </div>

 {/* Question grid */}
 <div className="grid grid-cols-5 gap-3 sm:grid-cols-6">
 {questions.map((q, i) => {
 const isAnswered =
 answers[q.id] !== null && answers[q.id] !== undefined;
 const isFlagged = flagged.has(i);

 return (
 <button
 key={q.id}
 onClick={() => onGoToQuestion(i)}
 className={`flex h-11 w-11 items-center justify-center rounded-pill text-sm font-semibold transition-colors
 ${
 isAnswered
 ? "bg-primary text-white hover:bg-primary-hover "
 : "border-2 border-danger text-danger-fg hover:bg-danger-soft "
 }
 ${
 isFlagged
 ? "ring-2 ring-amber-400 ring-offset-2 "
 : ""
 }
 `}
 >
 {i + 1}
 </button>
 );
 })}
 </div>

 {/* Unanswered warning */}
 {unansweredCount > 0 && (
 <div className="mt-6 rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg ">
 You have {unansweredCount} unanswered question
 {unansweredCount > 1 ? "s" : ""}. Unanswered questions are scored as
 incorrect.
 </div>
 )}
 </div>

 {/* Bottom buttons */}
 <div className="flex items-center justify-between border-t border-border-strong px-6 py-4 ">
 <button
 onClick={onCancel}
 className="rounded-lg border border-ink-300 px-5 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-2 "
 >
 Return to Questions
 </button>
 <button
 onClick={handleSubmitClick}
 className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
 confirmSubmit
 ? "bg-danger hover:bg-danger "
 : "bg-primary hover:bg-primary-hover "
 }`}
 >
 {confirmSubmit ? "Are you sure?" : "Submit Module"}
 </button>
 </div>
 </div>
 );
}
