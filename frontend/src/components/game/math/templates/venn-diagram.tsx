"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

// One source of truth for circle colors so the legend can't drift.
const COLOR_A = "#6366f1"; // indigo
const COLOR_B = "#f59e0b"; // amber
const COLOR_NEITHER = "#94a3b8"; // slate

interface VennConfig {
 set_a_label: string;
 set_b_label: string;
 total: number;
 // Regions: A only, B only, A∩B, neither. `intersection` is canonical;
 // legacy seed data may carry `both` — aliased below.
 regions: { a_only: number | null; b_only: number | null; intersection: number | null; neither: number | null };
 answers: Record<string, number>;
 use_intersection?: boolean; // when false, circles do not overlap
}

const DEFAULT: VennConfig = {
 set_a_label: "Math Club",
 set_b_label: "Science Club",
 total: 40,
 regions: { a_only: 12, b_only: null, intersection: 8, neither: null },
 answers: { b_only: 10, neither: 10 },
 use_intersection: true,
};

export default function VennDiagram({ config, onComplete }: MathTemplateProps) {
 const raw = (config as Partial<VennConfig> & { regions?: Record<string, number | null> }) || {};
 // Accept legacy `both` key in regions / answers as an alias for `intersection`.
 const rawRegions = (raw.regions || {}) as Record<string, number | null>;
 const rawAnswers = (raw.answers || {}) as Record<string, number>;
 const cfg: VennConfig = {
 ...DEFAULT,
 ...raw,
 regions: {
 ...DEFAULT.regions,
 ...rawRegions,
 intersection:
 rawRegions.intersection !== undefined
 ? rawRegions.intersection
 : rawRegions.both !== undefined
 ? rawRegions.both
 : DEFAULT.regions.intersection,
 } as VennConfig["regions"],
 answers: {
 ...rawAnswers,
 ...(rawAnswers.both !== undefined && rawAnswers.intersection === undefined
 ? { intersection: rawAnswers.both }
 : {}),
 },
 };
 const { set_a_label, set_b_label, total, regions, answers } = cfg;
 const useIntersection = cfg.use_intersection !== false;

 const [userValues, setUserValues] = useState<Record<string, string>>({});
 const [checked, setChecked] = useState(false);
 const [results, setResults] = useState<Record<string, boolean>>({});

 const handleChange = (key: string, val: string) => {
 setChecked(false);
 setUserValues((prev) => ({ ...prev, [key]: val }));
 };

 const handleCheck = () => {
 const res: Record<string, boolean> = {};
 let correct = 0;
 let total_blanks = 0;
 for (const [key, expected] of Object.entries(answers)) {
 total_blanks++;
 const userVal = parseInt(userValues[key] || "", 10);
 const ok = !isNaN(userVal) && userVal === expected;
 res[key] = ok;
 if (ok) correct++;
 }
 setResults(res);
 setChecked(true);
 if (correct === total_blanks) onComplete(true, 1.0);
 else if (correct > 0) onComplete(false, correct / total_blanks);
 };

 const regionKeys = (
 useIntersection
 ? (["a_only", "intersection", "b_only", "neither"] as const)
 : (["a_only", "b_only", "neither"] as const)
 );
 const regionLabels: Record<string, string> = {
 a_only: `Only ${set_a_label}`,
 b_only: `Only ${set_b_label}`,
 intersection: "Both",
 neither: "Neither",
 };

 // Geometry: when intersection is on, circles overlap; when off, they sit
 // apart with a small gap so the layout still reads as two sets.
 const cxA = useIntersection ? 170 : 130;
 const cxB = useIntersection ? 290 : 330;
 const radius = useIntersection ? 100 : 90;
 const aOnlyX = useIntersection ? 90 : 90;
 const intersectionX = 190;
 const bOnlyX = useIntersection ? 290 : 290;
 const labelAx = useIntersection ? 110 : 80;
 const labelBx = useIntersection ? 310 : 320;

 const renderValue = (key: string) => {
 const val = regions[key as keyof typeof regions];
 if (val !== null) return (
 <span className="text-lg font-bold text-ink-700 ">{val}</span>
 );
 return (
 <input
 type="number"
 value={userValues[key] || ""}
 onChange={(e) => handleChange(key, e.target.value)}
 disabled={checked && results[key]}
 className={`w-14 rounded-lg border-2 px-2 py-1.5 text-center text-lg font-bold outline-none ${
 checked
 ? results[key]
 ? "border-primary bg-success-soft text-success-fg "
 : "border-danger bg-danger-soft text-danger-fg "
 : "border-primary bg-paper-2 text-success-fg "
 }`}
 placeholder="?"
 />
 );
 };

 return (
 <div className="flex flex-col items-center gap-5">
 {/* Venn diagram SVG */}
 <svg viewBox="0 0 460 300" width="100%" style={{ maxWidth: 460 }}
 className="rounded-lg border border-border-strong bg-paper-2 ">
 {/* Background rect representing "universe" */}
 <rect x={10} y={10} width={440} height={280} rx={12} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 3" />
 <text x={230} y={30} textAnchor="middle" fontSize={12} fill="#94a3b8">Total: {total}</text>

 {/* Circle A */}
 <circle cx={cxA} cy={155} r={radius} fill={COLOR_A} opacity={0.12} stroke={COLOR_A} strokeWidth={2.5} />
 <text x={labelAx} y={80} fontSize={13} fill={COLOR_A} fontWeight="bold">{set_a_label}</text>

 {/* Circle B */}
 <circle cx={cxB} cy={155} r={radius} fill={COLOR_B} opacity={0.12} stroke={COLOR_B} strokeWidth={2.5} />
 <text x={labelBx} y={80} fontSize={13} fill={COLOR_B} fontWeight="bold">{set_b_label}</text>

 {/* A only value */}
 <foreignObject x={aOnlyX} y={125} width={80} height={50}>
 <div className="flex h-full items-center justify-center">{renderValue("a_only")}</div>
 </foreignObject>

 {/* Intersection value — only rendered when intersection is on */}
 {useIntersection && (
 <foreignObject x={intersectionX} y={125} width={80} height={50}>
 <div className="flex h-full items-center justify-center">{renderValue("intersection")}</div>
 </foreignObject>
 )}

 {/* B only value */}
 <foreignObject x={bOnlyX} y={125} width={80} height={50}>
 <div className="flex h-full items-center justify-center">{renderValue("b_only")}</div>
 </foreignObject>

 {/* Neither value */}
 <foreignObject x={370} y={230} width={80} height={50}>
 <div className="flex h-full items-center justify-center">{renderValue("neither")}</div>
 </foreignObject>
 <text x={410} y={228} textAnchor="middle" fontSize={10} fill="#94a3b8">Neither</text>
 </svg>

 {/* Legend — inline backgrounds match the SVG circle colors exactly */}
 <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
 {regionKeys.map((key) => {
 const bg =
 key === "a_only"
 ? { backgroundColor: COLOR_A }
 : key === "b_only"
 ? { backgroundColor: COLOR_B }
 : key === "intersection"
 ? {
 background: `linear-gradient(90deg, ${COLOR_A} 0%, ${COLOR_A} 50%, ${COLOR_B} 50%, ${COLOR_B} 100%)`,
 }
 : { backgroundColor: COLOR_NEITHER };
 return (
 <span key={key} className="flex items-center gap-1.5">
 <span
 className="inline-block h-2.5 w-2.5 rounded-full border border-ink-300"
 style={bg}
 />
 {regionLabels[key]}
 </span>
 );
 })}
 </div>

 <Button onClick={handleCheck} disabled={checked && Object.values(results).every(Boolean)}>
 {checked && Object.values(results).every(Boolean) ? "Correct!" : "Check Answers"}
 </Button>

 {checked && !Object.values(results).every(Boolean) && (
 <p className="text-xs text-text-muted">All regions must add up to {total}.</p>
 )}
 </div>
 );
}
