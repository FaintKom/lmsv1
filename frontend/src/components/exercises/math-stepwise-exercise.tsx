"use client";

// MVP stub for the `math_stepwise` exercise type.
//
// Real implementation lands in F4:
//   - mathlive equation editor for student step input
//   - per-step validation via POST /api/v1/math-validation/validate-step
//   - final-answer check via POST /api/v1/math-validation/check-answer
//
// Until then this stub renders the problem statement and a "submit final
// answer" flow so the exercise type can be wired end-to-end and the
// unified menu shows it as functional.

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MathStepwiseConfig {
 problem?: string;
 final_answer?: string;
 hints?: string[];
 validate_steps?: boolean;
 max_steps?: number;
}

// ─── Config editor (teacher view) ──────────────────────────────────────

export function MathStepwiseConfigEditor({
 config,
 onChange,
}: {
 config: Record<string, unknown>;
 onChange: (c: Record<string, unknown>) => void;
}) {
 const cfg = config as MathStepwiseConfig;
 const labelCls = "mb-1 block text-sm font-medium text-ink-700";
 const inputCls =
 "w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-ink-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

 return (
 <div className="space-y-4">
 <div>
 <label className={labelCls}>Problem (LaTeX supported)</label>
 <textarea
 rows={2}
 value={cfg.problem || ""}
 onChange={(e) => onChange({ ...config, problem: e.target.value })}
 placeholder="Solve for x: x^2 - 5x + 6 = 0"
 className={inputCls}
 />
 </div>
 <div>
 <label className={labelCls}>Expected final answer (LaTeX or plain)</label>
 <input
 type="text"
 value={cfg.final_answer || ""}
 onChange={(e) => onChange({ ...config, final_answer: e.target.value })}
 placeholder="x = 2 or x = 3"
 className={inputCls}
 />
 </div>
 <div>
 <label className="flex items-center gap-2 text-sm text-ink-700">
 <input
 type="checkbox"
 checked={cfg.validate_steps ?? true}
 onChange={(e) => onChange({ ...config, validate_steps: e.target.checked })}
 className="h-4 w-4 rounded border-ink-300 text-primary focus:ring-primary"
 />
 Validate each intermediate step (SymPy equivalence)
 </label>
 <p className="mt-1 text-xs text-text-muted">
 When off, only the final answer is checked. When on, every student
 step is verified against the previous one for algebraic equivalence.
 </p>
 </div>
 <div className="rounded-lg border border-border-strong bg-paper-2 p-3 text-xs text-text-muted">
 Full mathlive editor + per-step SymPy validation ship in F4 / F3
 of the 2026-05-13 feature push. Until then the student-side renderer
 accepts a plain-text final answer.
 </div>
 </div>
 );
}

// ─── Player (student view) ─────────────────────────────────────────────

export function MathStepwiseRenderer({
 exerciseId: _exerciseId,
 config,
 onSubmit,
}: {
 exerciseId: string;
 config: Record<string, unknown>;
 onSubmit: (body: Record<string, unknown>) => void;
}) {
 const cfg = config as MathStepwiseConfig;
 const [answer, setAnswer] = useState("");

 return (
 <div className="space-y-4">
 <div className="rounded-lg border border-border-strong bg-paper-2 p-4">
 <p className="mb-1 text-xs font-medium uppercase text-text-muted">Problem</p>
 <p className="text-base text-text">{cfg.problem || "(no problem set)"}</p>
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700">
 Your answer
 </label>
 <input
 type="text"
 value={answer}
 onChange={(e) => setAnswer(e.target.value)}
 placeholder="Type your final answer..."
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-ink-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
 />
 </div>
 <div className="flex justify-end">
 <Button
 size="sm"
 onClick={() =>
 onSubmit({ interactive_answers: { final_answer: answer.trim() } })
 }
 disabled={!answer.trim()}
 >
 Submit
 </Button>
 </div>
 </div>
 );
}
