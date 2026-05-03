"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface VennConfig {
  set_a_label: string;
  set_b_label: string;
  total: number;
  // Regions: A only, B only, A∩B, neither
  regions: { a_only: number | null; b_only: number | null; intersection: number | null; neither: number | null };
  answers: Record<string, number>;
}

const DEFAULT: VennConfig = {
  set_a_label: "Math Club",
  set_b_label: "Science Club",
  total: 40,
  regions: { a_only: 12, b_only: null, intersection: 8, neither: null },
  answers: { b_only: 10, neither: 10 },
};

export default function VennDiagram({ config, onComplete }: MathTemplateProps) {
  const cfg: VennConfig = { ...DEFAULT, ...(config as Partial<VennConfig>) };
  const { set_a_label, set_b_label, total, regions, answers } = cfg;

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

  const regionKeys = ["a_only", "intersection", "b_only", "neither"] as const;
  const regionLabels: Record<string, string> = {
    a_only: `Only ${set_a_label}`,
    b_only: `Only ${set_b_label}`,
    intersection: "Both",
    neither: "Neither",
  };

  const renderValue = (key: string) => {
    const val = regions[key as keyof typeof regions];
    if (val !== null) return (
      <span className="text-lg font-bold text-ink-700 dark:text-ink-200">{val}</span>
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
              ? "border-green-400 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-500/10 dark:text-green-300"
              : "border-coral-300 bg-coral-50 text-coral-700 dark:border-coral-500 dark:bg-coral-500/10 dark:text-coral-300"
            : "border-green-300 bg-white text-green-700 dark:border-green-500 dark:bg-[#1E1E1E] dark:text-green-300"
        }`}
        placeholder="?"
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Venn diagram SVG */}
      <svg viewBox="0 0 460 300" width="100%" style={{ maxWidth: 460 }}
        className="rounded-xl border border-ink-200 bg-white dark:border-white/10 dark:bg-[#1a1a2e]">
        {/* Background rect representing "universe" */}
        <rect x={10} y={10} width={440} height={280} rx={12} fill="none" stroke="#9aa39d" strokeWidth={1.5} strokeDasharray="6 3" />
        <text x={230} y={30} textAnchor="middle" fontSize={12} fill="#9aa39d">Total: {total}</text>

        {/* Circle A */}
        <circle cx={170} cy={155} r={100} fill="#0a8754" opacity={0.12} stroke="#0a8754" strokeWidth={2.5} />
        <text x={110} y={80} fontSize={13} fill="#0a8754" fontWeight="bold">{set_a_label}</text>

        {/* Circle B */}
        <circle cx={290} cy={155} r={100} fill="#f5b800" opacity={0.12} stroke="#f5b800" strokeWidth={2.5} />
        <text x={310} y={80} fontSize={13} fill="#f5b800" fontWeight="bold">{set_b_label}</text>

        {/* A only value */}
        <foreignObject x={90} y={125} width={80} height={50}>
          <div className="flex h-full items-center justify-center">{renderValue("a_only")}</div>
        </foreignObject>

        {/* Intersection value */}
        <foreignObject x={190} y={125} width={80} height={50}>
          <div className="flex h-full items-center justify-center">{renderValue("intersection")}</div>
        </foreignObject>

        {/* B only value */}
        <foreignObject x={290} y={125} width={80} height={50}>
          <div className="flex h-full items-center justify-center">{renderValue("b_only")}</div>
        </foreignObject>

        {/* Neither value */}
        <foreignObject x={370} y={230} width={80} height={50}>
          <div className="flex h-full items-center justify-center">{renderValue("neither")}</div>
        </foreignObject>
        <text x={410} y={228} textAnchor="middle" fontSize={10} fill="#9aa39d">Neither</text>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-ink-500">
        {regionKeys.map((key) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${
              key === "a_only" ? "bg-green-400" :
              key === "b_only" ? "bg-sun-400" :
              key === "intersection" ? "bg-green-400" : "bg-ink-300"
            }`} />
            {regionLabels[key]}
          </span>
        ))}
      </div>

      <Button onClick={handleCheck} disabled={checked && Object.values(results).every(Boolean)}>
        {checked && Object.values(results).every(Boolean) ? "Correct!" : "Check Answers"}
      </Button>

      {checked && !Object.values(results).every(Boolean) && (
        <p className="text-xs text-ink-500">All regions must add up to {total}.</p>
      )}
    </div>
  );
}
