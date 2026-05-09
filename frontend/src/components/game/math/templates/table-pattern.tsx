"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

export default function TablePattern({ config, onComplete }: MathTemplateProps) {
 const xValues = (config.x_values as number[]) || [1, 2, 3, 4, 5, 6];
 const yValues = (config.y_values as (number | null)[]) || [3, 5, null, 9, null, 13]; // null = blank
 const ruleLabel = (config.rule_label as string) || "";
 const ruleAnswer = (config.rule_answer as string) || "";
 const xHeader = (config.x_header as string) || "x";
 const yHeader = (config.y_header as string) || "f(x)";
 const tolerance = (config.tolerance as number) || 0.01;

 const [userValues, setUserValues] = useState<Record<number, string>>({});
 const [userRule, setUserRule] = useState("");
 const [checked, setChecked] = useState(false);
 const [cellResults, setCellResults] = useState<Record<number, boolean>>({});
 const [ruleCorrect, setRuleCorrect] = useState(false);

 const handleChange = (idx: number, val: string) => {
 setChecked(false);
 setUserValues((prev) => ({ ...prev, [idx]: val }));
 };

 const handleCheck = () => {
 const res: Record<number, boolean> = {};
 let correct = 0;
 let total = 0;

 // Check blank cells
 const answers = (config.answers as Record<number, number>) || {};
 for (let i = 0; i < yValues.length; i++) {
 if (yValues[i] === null) {
 total++;
 const expected = answers[i];
 const userVal = parseFloat(userValues[i] || "");
 const ok = expected !== undefined && !isNaN(userVal) && Math.abs(userVal - expected) <= tolerance;
 res[i] = ok;
 if (ok) correct++;
 }
 }

 // Check rule if asked
 let ruleOk = true;
 if (ruleLabel && ruleAnswer) {
 total++;
 ruleOk = userRule.trim().toLowerCase().replace(/\s/g, "") === ruleAnswer.toLowerCase().replace(/\s/g, "");
 if (ruleOk) correct++;
 }

 setCellResults(res);
 setRuleCorrect(ruleOk);
 setChecked(true);
 const score = total > 0 ? correct / total : 0;
 if (correct === total) onComplete(true, 1.0);
 else if (correct > 0) onComplete(false, score);
 };

 return (
 <div className="flex flex-col items-center gap-5">
 {/* Table */}
 <div className="overflow-x-auto rounded-lg border border-border-strong ">
 <table className="border-collapse">
 <thead>
 <tr>
 <th className="border-b border-r border-border-strong bg-success-soft px-6 py-3 text-sm font-bold text-success-fg ">
 {xHeader}
 </th>
 {xValues.map((x, i) => (
 <th key={i} className="border-b border-border-strong bg-surface-2 px-5 py-3 text-center text-sm font-semibold text-ink-700 ">
 {x}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 <tr>
 <td className="border-r border-border-strong bg-success-soft px-6 py-3 text-sm font-bold text-success-fg ">
 {yHeader}
 </td>
 {yValues.map((y, i) => (
 <td key={i} className="border-border-strong px-2 py-2 text-center ">
 {y !== null ? (
 <span className="text-sm font-semibold text-ink-700 ">{y}</span>
 ) : (
 <input
 type="number"
 value={userValues[i] || ""}
 onChange={(e) => handleChange(i, e.target.value)}
 disabled={checked && cellResults[i]}
 className={`w-14 rounded-lg border-2 px-2 py-2 text-center text-sm font-bold outline-none transition-colors ${
 checked
 ? cellResults[i]
 ? "border-primary bg-success-soft text-success-fg "
 : "border-danger bg-danger-soft text-danger-fg "
 : "border-primary bg-paper-2 text-success-fg focus:border-primary "
 }`}
 placeholder="?"
 />
 )}
 </td>
 ))}
 </tr>
 </tbody>
 </table>
 </div>

 {/* Rule input */}
 {ruleLabel && (
 <div className="flex items-center gap-3">
 <label className="text-sm font-medium text-text-muted ">{ruleLabel}</label>
 <input
 type="text"
 value={userRule}
 onChange={(e) => { setUserRule(e.target.value); setChecked(false); }}
 disabled={checked && ruleCorrect}
 placeholder="e.g. 2x + 1"
 className={`w-40 rounded-lg border-2 px-4 py-2 text-center text-sm font-bold outline-none transition-colors ${
 checked
 ? ruleCorrect
 ? "border-primary bg-success-soft text-success-fg "
 : "border-danger bg-danger-soft text-danger-fg "
 : "border-primary bg-paper-2 text-success-fg focus:border-primary "
 }`}
 />
 </div>
 )}

 <Button onClick={handleCheck} disabled={checked && Object.values(cellResults).every(Boolean) && (!ruleLabel || ruleCorrect)}>
 {checked && Object.values(cellResults).every(Boolean) && (!ruleLabel || ruleCorrect) ? "Correct!" : "Check Answers"}
 </Button>

 {checked && !(Object.values(cellResults).every(Boolean) && (!ruleLabel || ruleCorrect)) && (
 <p className="text-xs text-text-muted">Look for the pattern between x and f(x) values.</p>
 )}
 </div>
 );
}
