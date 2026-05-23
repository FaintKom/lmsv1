"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { Check, ChevronDown, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MATH_TEMPLATES, TEMPLATE_LIST } from "./template-registry";
import Editor from "@monaco-editor/react";

/** Compact dropdown that lists math templates with their lucide icon. */
function TemplatePicker({
 value,
 onChange,
}: {
 value: string;
 onChange: (type: string) => void;
}) {
 const [open, setOpen] = useState(false);
 const wrapRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (!open) return;
 const onDown = (e: MouseEvent) => {
 if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
 setOpen(false);
 }
 };
 const onKey = (e: KeyboardEvent) => {
 if (e.key === "Escape") setOpen(false);
 };
 window.addEventListener("mousedown", onDown);
 window.addEventListener("keydown", onKey);
 return () => {
 window.removeEventListener("mousedown", onDown);
 window.removeEventListener("keydown", onKey);
 };
 }, [open]);

 const list = [...TEMPLATE_LIST, MATH_TEMPLATES.custom_html];
 const current = MATH_TEMPLATES[value] || MATH_TEMPLATES.coordinate_plane;
 const CurrentIcon = current.Icon;

 return (
 <div ref={wrapRef} className="relative">
 <button
 type="button"
 onClick={() => setOpen((o) => !o)}
 className="flex w-full items-center gap-2 rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-left text-sm font-medium text-ink-700 hover:border-ink-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
 aria-haspopup="listbox"
 aria-expanded={open}
 >
 <CurrentIcon className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
 <span className="flex-1 truncate">{current.label}</span>
 <ChevronDown className={`h-4 w-4 shrink-0 text-text-subtle transition-transform ${open ? "rotate-180" : ""}`} />
 </button>
 {open && (
 <div
 role="listbox"
 className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-border-strong bg-paper shadow-lg"
 >
 {list.map((t) => {
 const Icon = t.Icon;
 const selected = t.type === value;
 return (
 <button
 key={t.type}
 type="button"
 role="option"
 aria-selected={selected}
 onClick={() => {
 onChange(t.type);
 setOpen(false);
 }}
 className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
 selected
 ? "bg-primary-soft text-primary"
 : "text-ink-700 hover:bg-ink-100"
 }`}
 >
 <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
 <span className="flex-1 truncate">{t.label}</span>
 {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
 </button>
 );
 })}
 </div>
 )}
 </div>
 );
}

interface MathEditorProps {
 config: Record<string, unknown>;
 onConfigChange: (config: Record<string, unknown>) => void;
}

export default function MathEditor({ config, onConfigChange }: MathEditorProps) {
 const templateType = (config.template_type as string) || "coordinate_plane";
 const customHtml = (config.custom_html as string) || "";
 const instructions = (config.instructions as string) || "";
 const templateConfig = (config.template_config as Record<string, unknown>) || {};

 const [showPreview, setShowPreview] = useState(false);

 const updateConfig = useCallback(
 (updates: Partial<Record<string, unknown>>) => {
 onConfigChange({ ...config, ...updates });
 },
 [config, onConfigChange]
 );

 return (
 <div className="space-y-6">
 {/* Template selector — compact dropdown with icons */}
 <div>
 <label className="mb-2 block text-xs font-medium text-text-muted ">
 Template Type
 </label>
 <TemplatePicker
 value={templateType}
 onChange={(t) => updateConfig({ template_type: t })}
 />
 <p className="mt-1 text-xs text-text-subtle">
 {MATH_TEMPLATES[templateType]?.description}
 </p>
 </div>

 {/* Instructions */}
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">
 Instructions (shown to student)
 </label>
 <textarea
 value={instructions}
 onChange={(e) => updateConfig({ instructions: e.target.value })}
 rows={2}
 placeholder="Enter instructions for the student..."
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm "
 />
 </div>

 {/* Template-specific config */}
 {templateType === "custom_html" ? (
 <CustomHtmlEditor
 html={customHtml}
 onChange={(html) => updateConfig({ custom_html: html })}
 />
 ) : templateType === "coordinate_plane" ? (
 <CoordinatePlaneConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "number_line" ? (
 <NumberLineConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "visual_fractions" ? (
 <FractionsConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "equation_balance" ? (
 <EquationBalanceConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "arithmetic_puzzle" ? (
 <ArithmeticPuzzleConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "function_graph" ? (
 <FunctionGraphConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "equation_solver" ? (
 <EquationSolverConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "multiple_choice_math" ? (
 <MCMathConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "numeric_input" ? (
 <NumericInputConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "scatter_plot" ? (
 <ScatterPlotConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "two_way_table" ? (
 <TwoWayTableConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "card_sort" ? (
 <CardSortConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "table_pattern" ? (
 <TablePatternConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "inequality_graph" ? (
 <InequalityConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "graph_transform" ? (
 <GraphTransformConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : templateType === "venn_diagram" ? (
 <VennConfig config={templateConfig} onChange={(c) => updateConfig({ template_config: c })} />
 ) : null}

 {/* Preview */}
 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setShowPreview(!showPreview)}
 >
 <Eye className="mr-1.5 h-3.5 w-3.5" />
 {showPreview ? "Hide Preview" : "Preview"}
 </Button>
 </div>

 {showPreview && (
 <div className="rounded-lg border border-border-strong bg-surface-2 p-4 ">
 <TemplatePreview templateType={templateType} config={templateConfig} customHtml={customHtml} />
 </div>
 )}
 </div>
 );
}

// ─── Template Config Forms ──────────────────────────────────────────

function CoordinatePlaneConfig({
 config,
 onChange,
}: {
 config: Record<string, unknown>;
 onChange: (c: Record<string, unknown>) => void;
}) {
 const points = (config.target_points as { x: number; y: number }[]) || [{ x: 3, y: 2 }];
 const gridRange = (config.grid_range as number) || 6;

 return (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Grid Range (±)</label>
 <input type="number" min={3} max={20} value={gridRange}
 onChange={(e) => onChange({ ...config, grid_range: parseInt(e.target.value) || 6 })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Tolerance</label>
 <input type="number" step={0.1} min={0.1} max={2} value={(config.tolerance as number) || 0.5}
 onChange={(e) => onChange({ ...config, tolerance: parseFloat(e.target.value) || 0.5 })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Target Points</label>
 {points.map((p, i) => (
 <div key={i} className="mb-1.5 flex items-center gap-2">
 <span className="text-xs text-text-subtle">({i + 1})</span>
 <input type="number" value={p.x} placeholder="x"
 onChange={(e) => { const np = [...points]; np[i] = { ...np[i], x: parseFloat(e.target.value) || 0 }; onChange({ ...config, target_points: np }); }}
 className="w-20 rounded border border-border-strong px-2 py-1 text-sm " />
 <input type="number" value={p.y} placeholder="y"
 onChange={(e) => { const np = [...points]; np[i] = { ...np[i], y: parseFloat(e.target.value) || 0 }; onChange({ ...config, target_points: np }); }}
 className="w-20 rounded border border-border-strong px-2 py-1 text-sm " />
 {points.length > 1 && (
 <button onClick={() => onChange({ ...config, target_points: points.filter((_, j) => j !== i) })}
 className="text-xs text-danger-fg hover:text-danger-fg">&times;</button>
 )}
 </div>
 ))}
 <button onClick={() => onChange({ ...config, target_points: [...points, { x: 0, y: 0 }] })}
 className="text-xs text-primary hover:text-success-fg">+ Add point</button>
 </div>
 </div>
 );
}

function NumberLineConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Min</label>
 <input type="number" value={(config.range_min as number) ?? 0}
 onChange={(e) => onChange({ ...config, range_min: parseInt(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Max</label>
 <input type="number" value={(config.range_max as number) ?? 10}
 onChange={(e) => onChange({ ...config, range_max: parseInt(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Targets (comma-sep)</label>
 <input type="text" value={((config.targets as number[]) || [3, 7]).join(", ")}
 onChange={(e) => onChange({ ...config, targets: e.target.value.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n)) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Tick Interval</label>
 <input type="number" step={0.5} min={0.5} value={(config.tick_interval as number) || 1}
 onChange={(e) => onChange({ ...config, tick_interval: parseFloat(e.target.value) || 1 })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 );
}

function FractionsConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Numerator</label>
 <input type="number" min={1} value={(config.target_numerator as number) || 3}
 onChange={(e) => onChange({ ...config, target_numerator: parseInt(e.target.value) || 1 })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Denominator</label>
 <input type="number" min={2} value={(config.target_denominator as number) || 8}
 onChange={(e) => onChange({ ...config, target_denominator: parseInt(e.target.value) || 2 })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Display</label>
 <select value={(config.display_type as string) || "pie"}
 onChange={(e) => onChange({ ...config, display_type: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm ">
 <option value="pie">Pie</option>
 <option value="bar">Bar</option>
 </select>
 </div>
 </div>
 );
}

function EquationBalanceConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Left Side (comma-sep)</label>
 <input type="text" value={((config.left_fixed as number[]) || [5]).join(", ")}
 onChange={(e) => onChange({ ...config, left_fixed: e.target.value.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Right Side Fixed (comma-sep)</label>
 <input type="text" value={((config.right_fixed as number[]) || [2]).join(", ")}
 onChange={(e) => onChange({ ...config, right_fixed: e.target.value.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Available Terms (JSON array)</label>
 <input type="text"
 value={JSON.stringify((config.available_terms as unknown[]) || [{ value: 3, label: "3" }, { value: 4, label: "4" }])}
 onChange={(e) => { try { onChange({ ...config, available_terms: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 </div>
 );
}

/**
 * ArithmeticPuzzleConfig — methodist UI for arithmetic puzzle rows.
 *
 * Each row is "a OP b = result", where exactly one of {a, b, result} is the
 * blank the student must fill. Methodist sees three number inputs + an
 * operator dropdown + a "blank position" radio. We persist in the renderer's
 * canonical shape (`config.equations`) so no migration is needed.
 *
 * Also reads the legacy `config.rows` shape (used by older seeded
 * exercises) so existing configs can be opened, edited, and saved into the
 * canonical shape without dropping data.
 */
function ArithmeticPuzzleConfig({
 config,
 onChange,
}: {
 config: Record<string, unknown>;
 onChange: (c: Record<string, unknown>) => void;
}) {
 type BlankPos = "a" | "b" | "result";
 interface Row {
 a: number;
 op: "+" | "-" | "*" | "/";
 b: number;
 result: number;
 blank: BlankPos;
 }

 const OP_LABELS: Record<Row["op"], string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

 /** Compute the value at the blank cell from the other two known cells. */
 const fillBlankValue = (r: Row): number => {
 const { a, op, b, result, blank } = r;
 if (blank === "result") {
 if (op === "+") return a + b;
 if (op === "-") return a - b;
 if (op === "*") return a * b;
 if (op === "/") return b !== 0 ? Math.round(a / b) : 0;
 }
 if (blank === "a") {
 if (op === "+") return result - b;
 if (op === "-") return result + b;
 if (op === "*") return b !== 0 ? Math.round(result / b) : 0;
 if (op === "/") return result * b;
 }
 // blank === "b"
 if (op === "+") return result - a;
 if (op === "-") return a - result;
 if (op === "*") return a !== 0 ? Math.round(result / a) : 0;
 if (op === "/") return result !== 0 ? Math.round(a / result) : 0;
 return 0;
 };

 /** Decode existing config (canonical OR legacy) into editable rows. */
 const decode = (): Row[] => {
 const eqs = config.equations as
 | { cells: { value: number | null; display: string }[]; answer: number; blankIndex: number }[]
 | undefined;
 if (eqs && eqs.length) {
 return eqs.map((eq) => {
 const opSymbol = (eq.cells[1]?.display || "+") as string;
 const op: Row["op"] =
 opSymbol === "−" || opSymbol === "-" ? "-" :
 opSymbol === "×" || opSymbol === "*" || opSymbol === "x" ? "*" :
 opSymbol === "÷" || opSymbol === "/" || opSymbol === ":" ? "/" : "+";
 const aVal = eq.cells[0]?.value ?? null;
 const bVal = eq.cells[2]?.value ?? null;
 const rVal = eq.cells[4]?.value ?? null;
 const blank: BlankPos =
 eq.blankIndex === 0 ? "a" : eq.blankIndex === 2 ? "b" : "result";
 return {
 a: blank === "a" ? eq.answer : (aVal ?? 0),
 b: blank === "b" ? eq.answer : (bVal ?? 0),
 result: blank === "result" ? eq.answer : (rVal ?? 0),
 op,
 blank,
 };
 });
 }
 const legacy = config.rows as
 | { operands: (number | null)[]; operator: string; result: number | null }[]
 | undefined;
 if (legacy && legacy.length) {
 return legacy.map((r): Row => {
 const a = r.operands?.[0];
 const b = r.operands?.[1];
 const op: Row["op"] =
 r.operator === "-" ? "-" :
 r.operator === "*" || r.operator === "x" || r.operator === "×" ? "*" :
 r.operator === "/" || r.operator === ":" || r.operator === "÷" ? "/" : "+";
 const blank: BlankPos = a == null ? "a" : b == null ? "b" : "result";
 const row: Row = {
 a: a ?? 0,
 b: b ?? 0,
 result: r.result ?? 0,
 op,
 blank,
 };
 row[blank === "result" ? "result" : blank] = fillBlankValue(row);
 return row;
 });
 }
 return [
 { a: 7, op: "+", b: 5, result: 12, blank: "a" },
 { a: 15, op: "-", b: 3, result: 12, blank: "result" },
 ];
 };

 const rows: Row[] = decode();

 /** Persist `rows` into the renderer's canonical `equations` shape. */
 const persist = (next: Row[]) => {
 const equations = next.map((r) => {
 const blankIndex = r.blank === "a" ? 0 : r.blank === "b" ? 2 : 4;
 const answer = fillBlankValue(r);
 const aDisplay = r.blank === "a" ? "_" : String(r.a);
 const bDisplay = r.blank === "b" ? "_" : String(r.b);
 const rDisplay = r.blank === "result" ? "_" : String(r.result);
 const aVal = r.blank === "a" ? null : r.a;
 const bVal = r.blank === "b" ? null : r.b;
 const rVal = r.blank === "result" ? null : r.result;
 return {
 cells: [
 { value: aVal, display: aDisplay },
 { value: null, display: OP_LABELS[r.op] },
 { value: bVal, display: bDisplay },
 { value: null, display: "=" },
 { value: rVal, display: rDisplay },
 ],
 answer,
 blankIndex,
 };
 });
 const { rows: _legacy, ...rest } = config as Record<string, unknown> & { rows?: unknown };
 void _legacy;
 onChange({ ...rest, equations });
 };

 const updateRow = (i: number, patch: Partial<Row>) => {
 const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
 persist(next);
 };

 const addRow = () => persist([...rows, { a: 1, op: "+", b: 1, result: 2, blank: "result" }]);
 const removeRow = (i: number) => persist(rows.filter((_, j) => j !== i));

 const numCls =
 "w-16 rounded border border-border-strong bg-paper-2 px-2 py-1 text-sm text-center";

 return (
 <div className="space-y-3">
 <p className="text-xs text-text-subtle">
 Each row is an equation. Pick which cell the student must fill in (the blank).
 </p>
 <div className="space-y-2">
 {rows.map((r, i) => (
 <div
 key={i}
 className="flex flex-wrap items-center gap-2 rounded-lg border border-border-strong bg-paper-2 px-3 py-2"
 >
 <span className="w-8 text-xs font-semibold text-text-subtle">#{i + 1}</span>
 <input
 type="number"
 value={r.a}
 onChange={(e) => updateRow(i, { a: parseInt(e.target.value) || 0 })}
 className={numCls}
 disabled={r.blank === "a"}
 title={r.blank === "a" ? "Blank — auto-computed" : "Operand A"}
 />
 <select
 value={r.op}
 onChange={(e) => updateRow(i, { op: e.target.value as Row["op"] })}
 className="rounded border border-border-strong bg-paper-2 px-2 py-1 text-sm"
 >
 <option value="+">+</option>
 <option value="-">−</option>
 <option value="*">×</option>
 <option value="/">÷</option>
 </select>
 <input
 type="number"
 value={r.b}
 onChange={(e) => updateRow(i, { b: parseInt(e.target.value) || 0 })}
 className={numCls}
 disabled={r.blank === "b"}
 title={r.blank === "b" ? "Blank — auto-computed" : "Operand B"}
 />
 <span className="text-sm font-semibold text-text-muted">=</span>
 <input
 type="number"
 value={r.result}
 onChange={(e) => updateRow(i, { result: parseInt(e.target.value) || 0 })}
 className={numCls}
 disabled={r.blank === "result"}
 title={r.blank === "result" ? "Blank — auto-computed" : "Result"}
 />
 <div className="ml-2 flex items-center gap-2 text-xs text-text-muted">
 <span>Blank:</span>
 {(["a", "b", "result"] as const).map((pos) => (
 <label key={pos} className="flex items-center gap-1">
 <input
 type="radio"
 name={`blank-${i}`}
 checked={r.blank === pos}
 onChange={() => updateRow(i, { blank: pos })}
 className="h-3 w-3 accent-green-600"
 />
 {pos === "result" ? "result" : pos}
 </label>
 ))}
 </div>
 <span className="ml-auto text-[10px] text-text-subtle">
 answer = {fillBlankValue(r)}
 </span>
 <button
 type="button"
 onClick={() => removeRow(i)}
 className="rounded p-1 text-ink-300 hover:bg-danger-soft hover:text-danger-fg"
 title="Delete row"
 >
 ×
 </button>
 </div>
 ))}
 </div>
 <button
 type="button"
 onClick={addRow}
 className="text-xs font-medium text-primary hover:underline"
 >
 + Add equation
 </button>
 </div>
 );
}

// ─── Custom HTML Editor ─────────────────────────────────────────────

function FunctionGraphConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Function Type</label>
 <select value={(config.function_type as string) || "linear"} onChange={(e) => onChange({ ...config, function_type: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm ">
 <option value="linear">Linear (y = mx + b)</option>
 <option value="quadratic">Quadratic (y = ax² + bx + c)</option>
 <option value="exponential">Exponential (y = a·base^x + c)</option>
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Grid Range (±)</label>
 <input type="number" min={3} max={20} value={(config.grid_range as number) || 6}
 onChange={(e) => onChange({ ...config, grid_range: parseInt(e.target.value) || 6 })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Target Params (JSON)</label>
 <input type="text" value={JSON.stringify((config.target_params as Record<string, number>) || { m: 2, b: -1 })}
 onChange={(e) => { try { onChange({ ...config, target_params: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 </div>
 );
}

function EquationSolverConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Left Side</label>
 <input type="text" value={(config.initial_left as string) || "2x + 5"} onChange={(e) => onChange({ ...config, initial_left: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Right Side</label>
 <input type="text" value={(config.initial_right as string) || "17"} onChange={(e) => onChange({ ...config, initial_right: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Steps (JSON)</label>
 <textarea rows={5} value={JSON.stringify((config.steps as unknown[]) || [], null, 2)}
 onChange={(e) => { try { onChange({ ...config, steps: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Final Answer</label>
 <input type="text" value={(config.final_answer as string) || "x = 6"} onChange={(e) => onChange({ ...config, final_answer: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 );
}

function MCMathConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Question</label>
 <textarea rows={2} value={(config.question as string) || ""} onChange={(e) => onChange({ ...config, question: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Choices (JSON)</label>
 <textarea rows={4} value={JSON.stringify((config.choices as unknown[]) || [
 { text: "A", correct: false }, { text: "B", correct: true }, { text: "C", correct: false }, { text: "D", correct: false }
 ], null, 2)} onChange={(e) => { try { onChange({ ...config, choices: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Explanation</label>
 <textarea rows={2} value={(config.explanation as string) || ""} onChange={(e) => onChange({ ...config, explanation: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 );
}

function NumericInputConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Question</label>
 <textarea rows={2} value={(config.question as string) || ""} onChange={(e) => onChange({ ...config, question: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Correct Answers (comma-sep)</label>
 <input type="text" value={((config.correct_answers as number[]) || [7]).join(", ")}
 onChange={(e) => onChange({ ...config, correct_answers: e.target.value.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Tolerance</label>
 <input type="number" step={0.01} value={(config.tolerance as number) || 0.01}
 onChange={(e) => onChange({ ...config, tolerance: parseFloat(e.target.value) || 0.01 })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Explanation</label>
 <textarea rows={2} value={(config.explanation as string) || ""} onChange={(e) => onChange({ ...config, explanation: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 );
}

function ScatterPlotConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Mode</label>
 <select value={(config.mode as string) || "best_fit"} onChange={(e) => onChange({ ...config, mode: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm ">
 <option value="best_fit">Best Fit Line</option>
 <option value="correlation">Identify Correlation</option>
 <option value="read_value">Read a Value</option>
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Target Slope</label>
 <input type="number" step={0.1} value={(config.target_slope as number) ?? 1} onChange={(e) => onChange({ ...config, target_slope: parseFloat(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Target Intercept</label>
 <input type="number" step={0.5} value={(config.target_intercept as number) ?? 0} onChange={(e) => onChange({ ...config, target_intercept: parseFloat(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Data Points (JSON)</label>
 <textarea rows={3} value={JSON.stringify((config.points as unknown[]) || [{x:1,y:2},{x:2,y:4},{x:3,y:5}], null, 2)}
 onChange={(e) => { try { onChange({ ...config, points: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 </div>
 );
}

function TwoWayTableConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Row Headers (comma-sep)</label>
 <input type="text" value={((config.row_headers as string[]) || ["Boys","Girls","Total"]).join(", ")}
 onChange={(e) => onChange({ ...config, row_headers: e.target.value.split(",").map(s => s.trim()) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Column Headers (comma-sep)</label>
 <input type="text" value={((config.col_headers as string[]) || ["Soccer","Basketball","Total"]).join(", ")}
 onChange={(e) => onChange({ ...config, col_headers: e.target.value.split(",").map(s => s.trim()) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Cells (JSON, null = blank)</label>
 <textarea rows={4} value={JSON.stringify((config.cells as unknown[]) || [[12,null,25],[null,10,23],[20,null,48]], null, 2)}
 onChange={(e) => { try { onChange({ ...config, cells: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Answers (JSON: {"{"}&quot;r0c1&quot;: 13, ...{"}"})</label>
 <input type="text" value={JSON.stringify((config.answers as Record<string,number>) || {})}
 onChange={(e) => { try { onChange({ ...config, answers: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 </div>
 );
}

function CardSortConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Categories (JSON)</label>
 <textarea rows={3} value={JSON.stringify((config.categories as unknown[]) || [
 {id:"linear",label:"Linear",color:"#4C97FF"},{id:"quadratic",label:"Quadratic",color:"#FF8C1A"},{id:"exponential",label:"Exponential",color:"#40BF4A"}
 ], null, 2)} onChange={(e) => { try { onChange({ ...config, categories: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Cards (JSON: [{"{"} id, text, category {"}"}])</label>
 <textarea rows={5} value={JSON.stringify((config.cards as unknown[]) || [
 {id:"c1",text:"y = 2x + 3",category:"linear"},{id:"c2",text:"y = x² - 4",category:"quadratic"}
 ], null, 2)} onChange={(e) => { try { onChange({ ...config, cards: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 </div>
 );
}

function TablePatternConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">X Values (comma-sep)</label>
 <input type="text" value={((config.x_values as number[]) || [1,2,3,4,5]).join(", ")}
 onChange={(e) => onChange({ ...config, x_values: e.target.value.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Y Values (comma-sep, ? for blank)</label>
 <input type="text" value={((config.y_values as (number|null)[]) || [3,5,null,9,null]).map(v => v === null ? "?" : v).join(", ")}
 onChange={(e) => onChange({ ...config, y_values: e.target.value.split(",").map(s => s.trim() === "?" ? null : parseFloat(s.trim())) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Rule Label</label>
 <input type="text" value={(config.rule_label as string) || ""} placeholder="e.g. f(x) =" onChange={(e) => onChange({ ...config, rule_label: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Rule Answer</label>
 <input type="text" value={(config.rule_answer as string) || ""} placeholder="e.g. 2x+1" onChange={(e) => onChange({ ...config, rule_answer: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Answers (JSON: {"{"} index: value {"}"})</label>
 <input type="text" value={JSON.stringify((config.answers as Record<number,number>) || {})}
 onChange={(e) => { try { onChange({ ...config, answers: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 </div>
 );
}

function InequalityConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Slope</label>
 <input type="number" step={0.5} value={(config.slope as number) ?? 1} onChange={(e) => onChange({ ...config, slope: parseFloat(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Intercept</label>
 <input type="number" step={0.5} value={(config.intercept as number) ?? 0} onChange={(e) => onChange({ ...config, intercept: parseFloat(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Operator</label>
 <select value={(config.operator as string) || ">="} onChange={(e) => onChange({ ...config, operator: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm ">
 <option value=">">{">"}</option><option value=">=">{"\u2265"}</option>
 <option value="<">{"<"}</option><option value="<=">{"\u2264"}</option>
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Grid Range</label>
 <input type="number" min={3} max={10} value={(config.grid_range as number) || 6} onChange={(e) => onChange({ ...config, grid_range: parseInt(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 );
}

function GraphTransformConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Parent Function</label>
 <select value={(config.parent_function as string) || "x^2"} onChange={(e) => onChange({ ...config, parent_function: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm ">
 <option value="x^2">x²</option><option value="|x|">|x|</option>
 <option value="sqrt(x)">√x</option><option value="x^3">x³</option>
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Target H shift</label>
 <input type="number" step={0.5} value={(config.target_h as number) ?? 2} onChange={(e) => onChange({ ...config, target_h: parseFloat(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Target V shift</label>
 <input type="number" step={0.5} value={(config.target_v as number) ?? -1} onChange={(e) => onChange({ ...config, target_v: parseFloat(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Target stretch (a)</label>
 <input type="number" step={0.25} value={(config.target_a as number) ?? 1} onChange={(e) => onChange({ ...config, target_a: parseFloat(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 );
}

/**
 * VennConfig — methodist UI for the Venn diagram template.
 *
 * Per-region row layout instead of raw JSON:
 *   - Each of "A only" / "Both" / "B only" / "Neither" gets a "Blank for
 *     student" checkbox. When ticked the region shows two inputs:
 *       · expected answer (correct value), used to grade
 *       · the renderer shows a blank box to the student
 *     When unticked the region shows a single input for the value to
 *     display as-is in the diagram.
 *   - "Use intersection" toggle controls whether the diagram shows two
 *     overlapping circles (default) or two separate circles. When off
 *     the "Both" row is hidden.
 */
function VennConfig({
 config,
 onChange,
}: {
 config: Record<string, unknown>;
 onChange: (c: Record<string, unknown>) => void;
}) {
 type RegionKey = "a_only" | "intersection" | "b_only" | "neither";

 const setALabel = (config.set_a_label as string) || "Set A";
 const setBLabel = (config.set_b_label as string) || "Set B";
 const total = (config.total as number) ?? 40;
 const useIntersection = (config.use_intersection as boolean | undefined) !== false;

 // Normalise legacy `both` → `intersection` in incoming data on read.
 const rawRegions = ((config.regions as Record<string, number | null>) || {}) as Record<string, number | null>;
 const rawAnswers = ((config.answers as Record<string, number>) || {}) as Record<string, number>;
 const regions: Record<RegionKey, number | null> = {
 a_only: rawRegions.a_only !== undefined ? rawRegions.a_only : 12,
 intersection:
 rawRegions.intersection !== undefined
 ? rawRegions.intersection
 : rawRegions.both !== undefined
 ? rawRegions.both
 : 4,
 b_only: rawRegions.b_only !== undefined ? rawRegions.b_only : null,
 neither: rawRegions.neither !== undefined ? rawRegions.neither : null,
 };
 const answers: Record<string, number> = {
 ...rawAnswers,
 ...(rawAnswers.both !== undefined && rawAnswers.intersection === undefined
 ? { intersection: rawAnswers.both }
 : {}),
 };

 const writeRegion = (key: RegionKey, value: number | null) => {
 const next = { ...regions, [key]: value };
 onChange({ ...config, regions: next });
 };
 const toggleBlank = (key: RegionKey, blank: boolean) => {
 if (blank) {
 const nextAnswers = { ...answers };
 if (regions[key] !== null && !(key in nextAnswers)) nextAnswers[key] = regions[key] as number;
 writeRegion(key, null);
 onChange({ ...config, regions: { ...regions, [key]: null }, answers: nextAnswers });
 } else {
 const value = answers[key] ?? 0;
 const nextAnswers = { ...answers };
 delete nextAnswers[key];
 onChange({ ...config, regions: { ...regions, [key]: value }, answers: nextAnswers });
 }
 };
 const writeAnswer = (key: RegionKey, value: number) => {
 onChange({ ...config, answers: { ...answers, [key]: value } });
 };

 const visibleKeys: RegionKey[] = useIntersection
 ? ["a_only", "intersection", "b_only", "neither"]
 : ["a_only", "b_only", "neither"];

 const regionLabel: Record<RegionKey, string> = {
 a_only: `Only ${setALabel}`,
 intersection: "Both (intersection)",
 b_only: `Only ${setBLabel}`,
 neither: "Neither",
 };

 const inputCls =
 "w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm";

 return (
 <div className="space-y-4">
 {/* Labels + total */}
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Set A Label</label>
 <input
 type="text"
 value={setALabel}
 onChange={(e) => onChange({ ...config, set_a_label: e.target.value })}
 className={inputCls}
 />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Set B Label</label>
 <input
 type="text"
 value={setBLabel}
 onChange={(e) => onChange({ ...config, set_b_label: e.target.value })}
 className={inputCls}
 />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Total</label>
 <input
 type="number"
 value={total}
 onChange={(e) => onChange({ ...config, total: parseInt(e.target.value) || 0 })}
 className={inputCls}
 />
 </div>
 </div>

 {/* Intersection toggle */}
 <label className="flex items-center gap-2 text-sm text-ink-700">
 <input
 type="checkbox"
 checked={useIntersection}
 onChange={(e) => onChange({ ...config, use_intersection: e.target.checked })}
 className="h-4 w-4 accent-green-600"
 />
 Use intersection (overlap circles)
 <span className="text-xs text-text-subtle">
 — turn off to show two separate circles with no "Both" region
 </span>
 </label>

 {/* Per-region rows */}
 <div className="space-y-2">
 <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Regions
 </p>
 {visibleKeys.map((key) => {
 const blank = regions[key] === null;
 return (
 <div
 key={key}
 className="flex flex-wrap items-center gap-3 rounded-lg border border-border-strong bg-paper-2 px-3 py-2"
 >
 <span className="w-40 text-sm font-medium text-ink-700">
 {regionLabel[key]}
 </span>
 <label className="flex items-center gap-1.5 text-xs text-text-muted">
 <input
 type="checkbox"
 checked={blank}
 onChange={(e) => toggleBlank(key, e.target.checked)}
 className="h-3.5 w-3.5 accent-green-600"
 />
 Blank for student
 </label>
 {blank ? (
 <div className="flex items-center gap-1.5">
 <span className="text-xs text-text-subtle">Expected answer:</span>
 <input
 type="number"
 value={answers[key] ?? 0}
 onChange={(e) => writeAnswer(key, parseInt(e.target.value) || 0)}
 className="w-20 rounded border border-border-strong px-2 py-1 text-sm"
 />
 </div>
 ) : (
 <div className="flex items-center gap-1.5">
 <span className="text-xs text-text-subtle">Shown value:</span>
 <input
 type="number"
 value={regions[key] ?? 0}
 onChange={(e) => writeRegion(key, parseInt(e.target.value) || 0)}
 className="w-20 rounded border border-border-strong px-2 py-1 text-sm"
 />
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 );
}

function CustomHtmlEditor({ html, onChange }: { html: string; onChange: (h: string) => void }) {
 return (
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">
 Custom HTML/JS/CSS
 </label>
 <p className="mb-2 text-xs text-text-subtle">
 Use <code className="bg-ink-100 px-1 rounded ">window.LMS.reportResult({"{"} passed: true, score: 1.0 {"}"})</code> to submit the result.
 </p>
 <div className="h-[300px] rounded-lg border border-border-strong overflow-hidden ">
 <Editor
 height="100%"
 language="html"
 value={html}
 onChange={(v) => onChange(v || "")}
 theme="vs-light"
 options={{
 minimap: { enabled: false },
 fontSize: 13,
 lineNumbers: "on",
 wordWrap: "on",
 scrollBeyondLastLine: false,
 automaticLayout: true,
 }}
 />
 </div>
 </div>
 );
}

// ─── Template Preview ───────────────────────────────────────────────

function TemplatePreview({
 templateType,
 config,
 customHtml,
}: {
 templateType: string;
 config: Record<string, unknown>;
 customHtml: string;
}) {
 if (templateType === "custom_html") {
 const bridgeScript = `<script>
 window.LMS = { reportResult: function(r) { window.parent.postMessage({ type: 'lms-exercise-result', payload: r }, '*'); } };
 </script>`;
 const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:16px;}</style>${bridgeScript}</head><body>${customHtml}</body></html>`;
 return (
 <iframe srcDoc={srcdoc} sandbox="allow-scripts"
 className="h-[300px] w-full rounded-lg border border-border-strong " title="Preview" />
 );
 }

 const template = MATH_TEMPLATES[templateType];
 if (!template?.component) return <p className="text-sm text-text-subtle">No preview available</p>;

 const TemplateComponent = template.component;
 return (
 <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-text-subtle" /></div>}>
 <TemplateComponent config={config} onComplete={() => {}} />
 </Suspense>
 );
}
