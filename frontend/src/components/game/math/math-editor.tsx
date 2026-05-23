"use client";

import { useState, useCallback, Suspense } from "react";
import { Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MATH_TEMPLATES, TEMPLATE_LIST } from "./template-registry";
import Editor from "@monaco-editor/react";

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
 {/* Template selector — compact dropdown to save vertical space */}
 <div>
 <label className="mb-2 block text-xs font-medium text-text-muted ">
 Template Type
 </label>
 <select
 value={templateType}
 onChange={(e) => updateConfig({ template_type: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm font-medium text-ink-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
 >
 {[...TEMPLATE_LIST, MATH_TEMPLATES.custom_html].map((tmpl) => (
 <option key={tmpl.type} value={tmpl.type}>
 {tmpl.label}
 </option>
 ))}
 </select>
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

function ArithmeticPuzzleConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div>
 <label className="mb-1 block text-xs text-text-muted">Equations (JSON)</label>
 <textarea
 value={JSON.stringify((config.equations as unknown[]) || [
 { cells: [{ value: null, display: "_" }, { value: null, display: "+" }, { value: 3, display: "3" }, { value: null, display: "=" }, { value: 7, display: "7" }], answer: 4, blankIndex: 0 },
 ], null, 2)}
 rows={8}
 onChange={(e) => { try { onChange({ ...config, equations: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs "
 />
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

function VennConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
 return (
 <div className="space-y-3">
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="mb-1 block text-xs text-text-muted">Set A Label</label>
 <input type="text" value={(config.set_a_label as string) || "Set A"} onChange={(e) => onChange({ ...config, set_a_label: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Set B Label</label>
 <input type="text" value={(config.set_b_label as string) || "Set B"} onChange={(e) => onChange({ ...config, set_b_label: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Total</label>
 <input type="number" value={(config.total as number) || 40} onChange={(e) => onChange({ ...config, total: parseInt(e.target.value) })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm " />
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Regions (JSON: null = blank)</label>
 <input type="text" value={JSON.stringify((config.regions as Record<string,number|null>) || {a_only:12,b_only:null,intersection:8,neither:null})}
 onChange={(e) => { try { onChange({ ...config, regions: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
 </div>
 <div>
 <label className="mb-1 block text-xs text-text-muted">Answers (JSON)</label>
 <input type="text" value={JSON.stringify((config.answers as Record<string,number>) || {b_only:10,neither:10})}
 onChange={(e) => { try { onChange({ ...config, answers: JSON.parse(e.target.value) }); } catch {} }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs " />
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
