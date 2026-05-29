"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface TrueFalseExerciseProps {
 statement: string;
 onSubmit: (answers: { answer: boolean }) => void;
}

export default function TrueFalseExercise({
 statement,
 onSubmit,
}: TrueFalseExerciseProps) {
 const [selected, setSelected] = useState<boolean | null>(null);

 return (
 <div>
 <div className="mb-6 rounded-lg border border-border-strong bg-paper-2 p-6 ">
 <p className="text-lg font-medium text-ink-700 ">{statement}</p>
 </div>

 <div className="flex gap-4">
 <button
 onClick={() => setSelected(true)}
 aria-pressed={selected === true}
 className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-4 text-lg font-semibold transition-colors ${
 selected === true
 ? "border-primary bg-success-soft text-success-fg "
 : "border-border-strong text-text-muted hover:border-primary "
 }`}
 >
 <Check className="h-5 w-5" />
 True
 </button>
 <button
 onClick={() => setSelected(false)}
 aria-pressed={selected === false}
 className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 py-4 text-lg font-semibold transition-colors ${
 selected === false
 ? "border-danger bg-danger-soft text-danger-fg "
 : "border-border-strong text-text-muted hover:border-danger "
 }`}
 >
 <X className="h-5 w-5" />
 False
 </button>
 </div>

 <button
 onClick={() => selected !== null && onSubmit({ answer: selected })}
 disabled={selected === null}
 className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 "
 >
 Submit Answer
 </button>
 </div>
 );
}
