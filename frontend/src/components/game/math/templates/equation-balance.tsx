"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface Term {
 id: string;
 value: number;
 label: string;
}

export default function EquationBalance({ config, onComplete }: MathTemplateProps) {
 const leftFixed = (config.left_fixed as number[]) || [5];
 const rightFixed = (config.right_fixed as number[]) || [2];
 const availableTerms = (config.available_terms as { value: number; label: string }[]) || [
 { value: 3, label: "3" },
 { value: 4, label: "4" },
 { value: 7, label: "7" },
 { value: 1, label: "1" },
 ];
 // `target_side` controls which pan(s) the student can drop terms onto.
 // 'right' preserves the pre-refactor behaviour; 'left' or 'both' are new.
 const targetSide = ((config.target_side as string) || "right") as "left" | "right" | "both";

 const [bank, setBank] = useState<Term[]>(
 availableTerms.map((t, i) => ({ id: `t${i}`, value: t.value, label: t.label }))
 );
 const [leftAdded, setLeftAdded] = useState<Term[]>([]);
 const [rightAdded, setRightAdded] = useState<Term[]>([]);
 const [checked, setChecked] = useState(false);

 const leftSum =
 leftFixed.reduce((a, b) => a + b, 0) + leftAdded.reduce((a, t) => a + t.value, 0);
 const rightSum =
 rightFixed.reduce((a, b) => a + b, 0) + rightAdded.reduce((a, t) => a + t.value, 0);
 const isBalanced = leftSum === rightSum;

 const addToSide = useCallback(
 (term: Term, side: "left" | "right") => {
 if (checked) return;
 setBank((prev) => prev.filter((t) => t.id !== term.id));
 if (side === "left") setLeftAdded((prev) => [...prev, term]);
 else setRightAdded((prev) => [...prev, term]);
 },
 [checked]
 );

 const removeFromSide = useCallback(
 (term: Term, side: "left" | "right") => {
 if (checked) return;
 if (side === "left") setLeftAdded((prev) => prev.filter((t) => t.id !== term.id));
 else setRightAdded((prev) => prev.filter((t) => t.id !== term.id));
 setBank((prev) => [...prev, term]);
 },
 [checked]
 );

 const handleCheck = () => {
 setChecked(true);
 if (isBalanced) {
 onComplete(true, 1.0);
 }
 };

 const handleReset = () => {
 setBank(availableTerms.map((t, i) => ({ id: `t${i}`, value: t.value, label: t.label })));
 setLeftAdded([]);
 setRightAdded([]);
 setChecked(false);
 };

 // Beam tilt angle based on balance
 const diff = leftSum - rightSum;
 const tiltAngle = Math.max(-15, Math.min(15, diff * 3));

 const helperText =
 targetSide === "left"
 ? "Add terms to the left side to balance the equation"
 : targetSide === "both"
 ? "Add terms to either side to balance the equation"
 : "Add terms to the right side to balance the equation";

 return (
 <div className="flex flex-col items-center gap-4">
 <p className="text-sm text-text-muted ">{helperText}</p>

 {/* Balance beam visualization */}
 <svg viewBox="0 0 400 180" width="100%" style={{ maxWidth: 400 }} className="overflow-visible">
 {/* Pivot */}
 <polygon points="200,170 190,145 210,145" fill="#64748b" />

 {/* Beam */}
 <g style={{ transform: `rotate(${tiltAngle}deg)`, transformOrigin: "200px 140px", transition: "transform 0.3s" }}>
 <rect x={40} y={136} width={320} height={8} rx={4}
 fill={checked ? (isBalanced ? "#22c55e" : "#ef4444") : "#94a3b8"} className="transition-colors" />

 {/* Left pan */}
 <rect x={50} y={105} width={120} height={30} rx={8}
 fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1.5} className=" " />
 <text x={110} y={125} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#334155" className="">
 {[...leftFixed, ...leftAdded.map((t) => t.value)].join(" + ") || "?"} = {leftSum}
 </text>

 {/* Right pan */}
 <rect x={230} y={105} width={120} height={30} rx={8}
 fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1.5} className=" " />
 <text x={290} y={125} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#334155" className="">
 {[...rightFixed, ...rightAdded.map((t) => t.value)].join(" + ") || "?"} = {rightSum}
 </text>
 </g>
 </svg>

 {/* Terms placed on the left pan (removable) */}
 {leftAdded.length > 0 && (
 <div className="flex flex-wrap gap-2">
 <span className="text-xs text-text-subtle self-center">Left:</span>
 {leftAdded.map((term) => (
 <button
 key={term.id}
 onClick={() => removeFromSide(term, "left")}
 disabled={checked}
 className="rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-semibold text-success-fg transition-colors hover:bg-danger-soft hover:text-danger-fg "
 >
 {term.label} &times;
 </button>
 ))}
 </div>
 )}

 {/* Terms placed on the right pan (removable) */}
 {rightAdded.length > 0 && (
 <div className="flex flex-wrap gap-2">
 <span className="text-xs text-text-subtle self-center">Right:</span>
 {rightAdded.map((term) => (
 <button
 key={term.id}
 onClick={() => removeFromSide(term, "right")}
 disabled={checked}
 className="rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-semibold text-success-fg transition-colors hover:bg-danger-soft hover:text-danger-fg "
 >
 {term.label} &times;
 </button>
 ))}
 </div>
 )}

 {/* Term bank — actions depend on target_side */}
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-xs text-text-subtle">Available:</span>
 {bank.map((term) =>
 targetSide === "both" ? (
 <div
 key={term.id}
 className="flex overflow-hidden rounded-lg border border-border-strong"
 >
 <button
 onClick={() => addToSide(term, "left")}
 disabled={checked}
 className="bg-ink-100 px-2 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-soft hover:text-success-fg"
 title="Add to left side"
 >
 ← {term.label}
 </button>
 <button
 onClick={() => addToSide(term, "right")}
 disabled={checked}
 className="border-l border-border-strong bg-ink-100 px-2 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-soft hover:text-success-fg"
 title="Add to right side"
 >
 {term.label} →
 </button>
 </div>
 ) : (
 <button
 key={term.id}
 onClick={() => addToSide(term, targetSide as "left" | "right")}
 disabled={checked}
 className="rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-primary-soft hover:text-success-fg "
 >
 +{term.label}
 </button>
 )
 )}
 {bank.length === 0 && !checked && (
 <span className="text-xs text-text-subtle italic">All terms placed</span>
 )}
 </div>

 <div className="flex gap-2">
 <Button variant="outline" size="sm" onClick={handleReset}>
 Reset
 </Button>
 <Button size="sm" onClick={handleCheck} disabled={checked && isBalanced}>
 {checked && isBalanced ? "Balanced!" : "Check"}
 </Button>
 </div>

 {checked && !isBalanced && (
 <p className="text-xs text-danger-fg">
 Not balanced yet. Left = {leftSum}, Right = {rightSum}. Difference: {Math.abs(diff)}
 </p>
 )}
 </div>
 );
}
