"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface PuzzleCell {
 value: number | null; // null = blank (student fills)
 isBlank: boolean;
}

export default function ArithmeticPuzzle({ config, onComplete }: MathTemplateProps) {
 // Config: equations like "_ + 3 = 7" represented as cells
 const equations = (config.equations as {
 cells: { value: number | null; display: string }[];
 answer: number;
 blankIndex: number;
 }[]) || [
 { cells: [{ value: null, display: "_" }, { value: null, display: "+" }, { value: 3, display: "3" }, { value: null, display: "=" }, { value: 7, display: "7" }], answer: 4, blankIndex: 0 },
 { cells: [{ value: 8, display: "8" }, { value: null, display: "-" }, { value: null, display: "_" }, { value: null, display: "=" }, { value: 5, display: "5" }], answer: 3, blankIndex: 2 },
 { cells: [{ value: null, display: "_" }, { value: null, display: "×" }, { value: 4, display: "4" }, { value: null, display: "=" }, { value: 12, display: "12" }], answer: 3, blankIndex: 0 },
 ];

 const [answers, setAnswers] = useState<Record<number, string>>(
 Object.fromEntries(equations.map((_, i) => [i, ""]))
 );
 const [checked, setChecked] = useState(false);
 const [results, setResults] = useState<boolean[]>([]);

 const handleChange = useCallback((eqIdx: number, value: string) => {
 setChecked(false);
 setAnswers((prev) => ({ ...prev, [eqIdx]: value }));
 }, []);

 const handleCheck = () => {
 const res = equations.map((eq, i) => {
 const userVal = parseInt(answers[i], 10);
 return !isNaN(userVal) && userVal === eq.answer;
 });
 setResults(res);
 setChecked(true);
 if (res.every(Boolean)) {
 onComplete(true, 1.0);
 }
 };

 return (
 <div className="flex flex-col items-center gap-6">
 <p className="text-sm text-text-muted ">
 Fill in the missing numbers
 </p>

 <div className="space-y-4">
 {equations.map((eq, eqIdx) => (
 <div
 key={eqIdx}
 className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
 checked
 ? results[eqIdx]
 ? "border-green-300 bg-success-soft "
 : "border-danger bg-danger-soft "
 : "border-border-strong bg-surface-2 "
 }`}
 >
 {eq.cells.map((cell, cellIdx) => {
 if (cellIdx === eq.blankIndex) {
 // This is the blank to fill
 return (
 <input
 key={cellIdx}
 type="number"
 value={answers[eqIdx]}
 onChange={(e) => handleChange(eqIdx, e.target.value)}
 disabled={checked && results[eqIdx]}
 className={`w-14 rounded-lg border-2 bg-paper-2 px-2 py-1.5 text-center text-lg font-bold outline-none transition-colors ${
 checked
 ? results[eqIdx]
 ? "border-green-300 text-success-fg "
 : "border-danger text-danger-fg "
 : "border-green-300 text-success-fg focus:border-primary "
 }`}
 placeholder="?"
 />
 );
 }
 // Regular cell (number or operator)
 return (
 <span
 key={cellIdx}
 className={`text-lg font-bold ${
 cell.display === "+" || cell.display === "-" || cell.display === "×" || cell.display === "÷" || cell.display === "="
 ? "text-text-subtle "
 : "text-ink-700 "
 }`}
 >
 {cell.display}
 </span>
 );
 })}

 {checked && !results[eqIdx] && (
 <span className="ml-2 text-xs text-danger-fg">= {eq.answer}</span>
 )}
 </div>
 ))}
 </div>

 <Button onClick={handleCheck} disabled={checked && results.every(Boolean)}>
 {checked && results.every(Boolean) ? "All Correct!" : "Check Answers"}
 </Button>
 </div>
 );
}
