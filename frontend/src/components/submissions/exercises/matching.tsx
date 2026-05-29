"use client";

import { useState } from "react";

interface Pair {
 left: string;
 right: string;
}

interface MatchingExerciseProps {
 pairs: Pair[];
 onSubmit: (answers: { pairs: Pair[] }) => void;
}

export default function MatchingExercise({ pairs, onSubmit }: MatchingExerciseProps) {
 const [shuffledRight] = useState(() =>
 [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5)
 );
 const [selected, setSelected] = useState<Record<string, string>>({});
 const [activeLeft, setActiveLeft] = useState<string | null>(null);

 const handleLeftClick = (left: string) => {
 setActiveLeft(left);
 };

 const handleRightClick = (right: string) => {
 if (activeLeft) {
 setSelected({ ...selected, [activeLeft]: right });
 setActiveLeft(null);
 }
 };

 const handleSubmit = () => {
 const result = pairs.map((p) => ({
 left: p.left,
 right: selected[p.left] || "",
 }));
 onSubmit({ pairs: result });
 };

 const usedRight = new Set(Object.values(selected));

 return (
 <div>
 <div className="grid grid-cols-2 gap-4 sm:gap-6" role="group" aria-label="Match items from left to right">
 {/* Left column */}
 <div className="space-y-2">
 {pairs.map((p) => (
 <button
 key={p.left}
 onClick={() => handleLeftClick(p.left)}
 aria-pressed={activeLeft === p.left}
 className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
 activeLeft === p.left
 ? "border-primary bg-success-soft text-success-fg "
 : selected[p.left]
 ? "border-primary bg-success-soft text-success-fg "
 : "border-border-strong text-ink-700 hover:border-primary "
 }`}
 >
 {p.left}
 {selected[p.left] && (
 <span className="mt-1 block text-xs text-primary ">
 → {selected[p.left]}
 </span>
 )}
 </button>
 ))}
 </div>

 {/* Right column */}
 <div className="space-y-2">
 {shuffledRight.map((right) => (
 <button
 key={right}
 onClick={() => handleRightClick(right)}
 disabled={!activeLeft}
 className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
 usedRight.has(right)
 ? "border-border bg-surface-2 text-text-subtle "
 : activeLeft
 ? "border-border-strong text-ink-700 hover:border-primary hover:bg-success-soft "
 : "border-border-strong text-text-muted "
 }`}
 >
 {right}
 </button>
 ))}
 </div>
 </div>

 <button
 onClick={handleSubmit}
 disabled={Object.keys(selected).length < pairs.length}
 className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 "
 >
 Submit Answer
 </button>
 </div>
 );
}
