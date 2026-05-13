"use client";

// math_stepwise exercise type — F4 of the 2026-05-13 feature push.
//
// Teacher view (MathStepwiseConfigEditor):
//   - Plain-text problem + final-answer fields
//   - "Auto-generate steps" button calls /math-validation/steps to seed
//     the expected-step hints sequence
//   - validate_steps toggle: when on, each student step is checked for
//     algebraic equivalence with the previous step via SymPy
//
// Student view (MathStepwiseRenderer):
//   - mathlive <math-field> equation editor for each step
//   - Per-step validation against the previous accepted step (or the
//     original problem expression) -> green check / red cross
//   - Final-answer submission checks /math-validation/check-answer
//   - Submits to the exercise's standard /submit endpoint with both
//     the trace and a boolean correctness flag

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, X, Plus, Loader2, Trash2, Sparkles } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface MathStepwiseConfig {
 problem?: string; // initial expression (LHS of equation, or full eq)
 final_answer?: string; // expected final answer e.g. "x = 2 or x = 3"
 expected_steps?: string[]; // optional teacher-supplied hint steps
 hints?: string[];
 validate_steps?: boolean;
 max_steps?: number;
 variable?: string; // default "x"
}

// mathlive web component registration (idempotent).
let mathliveLoaded = false;
async function ensureMathlive(): Promise<void> {
 if (mathliveLoaded || typeof window === "undefined") return;
 try {
 await import("mathlive");
 mathliveLoaded = true;
 } catch {
 // mathlive not installed yet; component falls back to <input>
 }
}

// Use the web component element as JSX. Cast through unknown to avoid
// JSX intrinsic-element typing complaints across React versions.
type MathFieldProps = {
 ref?: React.Ref<HTMLElement>;
 onInput?: () => void;
 onBlur?: () => void;
 style?: React.CSSProperties;
};
const MathField = "math-field" as unknown as React.FC<MathFieldProps>;

// Lift a math-field value (LaTeX) -> ASCII-ish expression SymPy can parse.
// Mathlive exposes `getValue("ascii-math")` which is good enough for
// elementary algebra (x^2, sqrt, fractions). Falls back to raw value.
function fieldValue(el: HTMLElement | null): string {
 if (!el) return "";
 const anyEl = el as unknown as { getValue?: (fmt: string) => string; value?: string };
 if (typeof anyEl.getValue === "function") {
 try {
 return anyEl.getValue("ascii-math") || anyEl.value || "";
 } catch {
 return anyEl.value || "";
 }
 }
 return anyEl.value || "";
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

 const [generating, setGenerating] = useState(false);

 const generateSteps = async () => {
 if (!cfg.problem) {
 toast.error("Enter a problem first");
 return;
 }
 setGenerating(true);
 try {
 const { data } = await apiClient.post("/math-validation/steps", {
 equation: cfg.problem,
 variable: cfg.variable || "x",
 });
 const steps = (data.steps as Array<{ expression: string }>).map((s) => s.expression);
 onChange({ ...config, expected_steps: steps });
 toast.success(`Generated ${steps.length} step${steps.length === 1 ? "" : "s"}`);
 } catch {
 toast.error("Step generation failed (check expression syntax)");
 } finally {
 setGenerating(false);
 }
 };

 return (
 <div className="space-y-4">
 <div>
 <label className={labelCls}>Problem (plain text: x^2 - 5x + 6 = 0)</label>
 <textarea
 rows={2}
 value={cfg.problem || ""}
 onChange={(e) => onChange({ ...config, problem: e.target.value })}
 placeholder="Solve for x: x^2 - 5x + 6 = 0"
 className={inputCls}
 />
 <p className={`mt-1 text-xs text-text-muted`}>
 Caret <code>^</code> = power. Implicit multiplication OK (<code>5x</code>).
 LaTeX preview shows under the field for students.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className={labelCls}>Variable to solve for</label>
 <input
 type="text"
 value={cfg.variable || "x"}
 onChange={(e) => onChange({ ...config, variable: e.target.value })}
 className={inputCls}
 maxLength={3}
 />
 </div>
 <div>
 <label className={labelCls}>Max student steps</label>
 <input
 type="number"
 value={cfg.max_steps ?? 10}
 onChange={(e) => onChange({ ...config, max_steps: Number(e.target.value) || 10 })}
 min={1}
 max={50}
 className={inputCls}
 />
 </div>
 </div>

 <div>
 <label className={labelCls}>Expected final answer</label>
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

 <div className="rounded-lg border border-border-strong bg-paper-2 p-3">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium text-text">Expected steps (hint sequence)</span>
 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={generating || !cfg.problem}
 onClick={generateSteps}
 >
 {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
 Auto-generate via SymPy
 </Button>
 </div>
 {(cfg.expected_steps || []).length === 0 ? (
 <p className="text-xs text-text-muted">
 Empty — students will simply work to the final answer. Generate to
 give them a canonical move-to-zero → factor → solve trace.
 </p>
 ) : (
 <ol className="list-decimal pl-5 space-y-1 text-sm text-text">
 {(cfg.expected_steps || []).map((s, i) => (
 <li key={i}>
 <code className="rounded bg-ink-100 px-1.5 py-0.5">{s}</code>
 </li>
 ))}
 </ol>
 )}
 </div>
 </div>
 );
}

// ─── Player (student view) ─────────────────────────────────────────────

interface StepRow {
 value: string; // ASCII math from the field
 status: "pending" | "ok" | "bad";
 note?: string;
}

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
 const [steps, setSteps] = useState<StepRow[]>([{ value: "", status: "pending" }]);
 const [finalAnswer, setFinalAnswer] = useState("");
 const [checking, setChecking] = useState(false);
 const [mlReady, setMlReady] = useState(false);
 const fieldRefs = useRef<Array<HTMLElement | null>>([]);

 useEffect(() => {
 void ensureMathlive().then(() => setMlReady(true));
 }, []);

 // Get the "previous expression" for step i — either the immediately
 // previous student step (if validate_steps) or the original problem.
 const prevExpression = (i: number): string => {
 if (i === 0) {
 // Strip "= 0" from problem if present so we compare to the canonical
 // form. Backend's _are_equivalent handles symmetry.
 const p = (cfg.problem || "").split("=")[0].trim();
 return p;
 }
 return steps[i - 1].value;
 };

 const validateStep = async (i: number) => {
 const newExpr = steps[i].value;
 if (!newExpr) return;
 if (!(cfg.validate_steps ?? true)) {
 // Validation disabled — accept the step.
 setSteps((s) => s.map((row, idx) => (idx === i ? { ...row, status: "ok" } : row)));
 return;
 }
 try {
 const { data } = await apiClient.post("/math-validation/validate-step", {
 prev_expression: prevExpression(i),
 new_expression: newExpr,
 });
 setSteps((s) =>
 s.map((row, idx) =>
 idx === i
 ? { ...row, status: data.equivalent ? "ok" : "bad", note: data.note }
 : row
 )
 );
 } catch {
 setSteps((s) =>
 s.map((row, idx) =>
 idx === i ? { ...row, status: "bad", note: "Cannot parse" } : row
 )
 );
 }
 };

 const addStep = () => {
 const max = cfg.max_steps ?? 10;
 if (steps.length >= max) {
 toast.error(`Maximum ${max} steps`);
 return;
 }
 setSteps((s) => [...s, { value: "", status: "pending" }]);
 };
 const removeStep = (i: number) => {
 setSteps((s) => s.filter((_, idx) => idx !== i));
 };

 const submitFinal = async () => {
 const expected = (cfg.final_answer || "").trim();
 if (!finalAnswer.trim()) {
 toast.error("Enter your final answer");
 return;
 }
 if (!expected) {
 // No expected answer set — just submit the trace.
 onSubmit({
 interactive_answers: {
 final_answer: finalAnswer,
 steps: steps.map((s) => s.value),
 },
 });
 return;
 }
 setChecking(true);
 try {
 const { data } = await apiClient.post("/math-validation/check-answer", {
 student: finalAnswer,
 expected,
 variable: cfg.variable || "x",
 });
 onSubmit({
 interactive_answers: {
 final_answer: finalAnswer,
 steps: steps.map((s) => s.value),
 correct: data.correct,
 },
 });
 if (data.correct) {
 toast.success("Correct!");
 } else {
 toast.error("Final answer is incorrect");
 }
 } catch {
 toast.error("Cannot check answer (parse error)");
 } finally {
 setChecking(false);
 }
 };

 return (
 <div className="space-y-4">
 <div className="rounded-lg border border-border-strong bg-paper-2 p-4">
 <p className="mb-1 text-xs font-medium uppercase text-text-muted">Problem</p>
 <p className="text-base text-text">{cfg.problem || "(no problem set)"}</p>
 </div>

 <div className="space-y-2">
 <p className="text-sm font-medium text-text">Your steps</p>
 {steps.map((step, i) => (
 <div key={i} className="flex items-start gap-2">
 <span className="mt-3 w-6 text-right text-xs text-text-muted">{i + 1}.</span>
 <div className="flex-1">
 {mlReady ? (
 <MathField
 ref={(el: HTMLElement | null) => {
 fieldRefs.current[i] = el;
 }}
 onInput={() => {
 const v = fieldValue(fieldRefs.current[i]);
 setSteps((s) =>
 s.map((row, idx) =>
 idx === i ? { ...row, value: v, status: "pending" } : row
 )
 );
 }}
 onBlur={() => void validateStep(i)}
 style={{
 width: "100%",
 padding: "8px",
 border: "1px solid var(--border-strong, #d1d5db)",
 borderRadius: "0.5rem",
 fontSize: "1rem",
 }}
 />
 ) : (
 // Fallback while mathlive loads / before npm install
 <input
 type="text"
 value={step.value}
 onChange={(e) =>
 setSteps((s) =>
 s.map((row, idx) =>
 idx === i ? { ...row, value: e.target.value, status: "pending" } : row
 )
 )
 }
 onBlur={() => void validateStep(i)}
 placeholder="Type your step..."
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-ink-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
 />
 )}
 {step.note && step.status === "bad" && (
 <p className="mt-1 text-xs text-danger-fg">{step.note}</p>
 )}
 </div>
 <div className="mt-3 flex items-center gap-1">
 {step.status === "ok" && <Check className="h-4 w-4 text-success-fg" />}
 {step.status === "bad" && <X className="h-4 w-4 text-danger-fg" />}
 {steps.length > 1 && (
 <button
 onClick={() => removeStep(i)}
 className="rounded p-1 text-text-subtle hover:bg-ink-100"
 title="Remove step"
 >
 <Trash2 className="h-3 w-3" />
 </button>
 )}
 </div>
 </div>
 ))}
 <Button type="button" size="sm" variant="outline" onClick={addStep}>
 <Plus className="h-3 w-3" />
 Add step
 </Button>
 </div>

 <div className="rounded-lg border border-border-strong bg-paper-2 p-4">
 <label className="mb-1 block text-sm font-medium text-ink-700">
 Final answer
 </label>
 <input
 type="text"
 value={finalAnswer}
 onChange={(e) => setFinalAnswer(e.target.value)}
 placeholder="e.g. x = 2 or x = 3"
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-ink-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
 />
 <p className="mt-1 text-xs text-text-muted">
 Multiple solutions: separate with &quot;or&quot;, comma, or semicolon.
 </p>
 </div>

 <div className="flex justify-end">
 <Button size="sm" onClick={submitFinal} disabled={checking || !finalAnswer.trim()}>
 {checking && <Loader2 className="h-3 w-3 animate-spin" />}
 Submit
 </Button>
 </div>
 </div>
 );
}
