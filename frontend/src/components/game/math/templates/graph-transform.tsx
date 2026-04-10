"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

type ParentFn = "x^2" | "|x|" | "sqrt(x)" | "x^3";

function evalParent(fn: ParentFn, x: number): number {
  switch (fn) {
    case "x^2": return x * x;
    case "|x|": return Math.abs(x);
    case "sqrt(x)": return x >= 0 ? Math.sqrt(x) : NaN;
    case "x^3": return x * x * x;
    default: return x * x;
  }
}

export default function GraphTransform({ config, onComplete }: MathTemplateProps) {
  const parentFn = (config.parent_function as ParentFn) || "x^2";
  const gridRange = (config.grid_range as number) || 6;
  const targetH = (config.target_h as number) ?? 2;   // horizontal shift
  const targetV = (config.target_v as number) ?? -1;   // vertical shift
  const targetA = (config.target_a as number) ?? 1;    // vertical stretch
  const tolerance = (config.tolerance as number) || 0.3;

  const [h, setH] = useState(0);
  const [v, setV] = useState(0);
  const [a, setA] = useState(1);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const svgSize = 440;
  const pad = 40;
  const plotSize = svgSize - pad * 2;
  const scale = plotSize / (gridRange * 2);
  const toX = (val: number) => pad + (val + gridRange) * scale;
  const toY = (val: number) => pad + (gridRange - val) * scale;

  const generatePath = (hShift: number, vShift: number, aStretch: number) => {
    const pts: string[] = [];
    for (let px = 0; px <= plotSize; px += 2) {
      const x = (px / plotSize) * gridRange * 2 - gridRange;
      const y = aStretch * evalParent(parentFn, x - hShift) + vShift;
      if (!isNaN(y) && y >= -gridRange && y <= gridRange) {
        pts.push(`${pad + px},${toY(y)}`);
      }
    }
    return pts.join(" ");
  };

  const parentPath = useMemo(() => generatePath(0, 0, 1), [parentFn, gridRange]);
  const targetPath = useMemo(() => generatePath(targetH, targetV, targetA), [targetH, targetV, targetA, parentFn, gridRange]);
  const userPath = useMemo(() => generatePath(h, v, a), [h, v, a, parentFn, gridRange]);

  const handleCheck = () => {
    const hOk = Math.abs(h - targetH) <= tolerance;
    const vOk = Math.abs(v - targetV) <= tolerance;
    const aOk = Math.abs(a - targetA) <= tolerance;
    const all = hOk && vOk && aOk;
    setChecked(true);
    setIsCorrect(all);
    if (all) onComplete(true, 1.0);
    else onComplete(false, [hOk, vOk, aOk].filter(Boolean).length / 3);
  };

  // Grid
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = -gridRange; i <= gridRange; i++) {
      lines.push(
        <line key={`v${i}`} x1={toX(i)} y1={pad} x2={toX(i)} y2={svgSize - pad}
          stroke={i === 0 ? "#475569" : "#cbd5e1"} strokeWidth={i === 0 ? 2 : 0.5} className="dark:stroke-slate-700" />,
        <line key={`h${i}`} x1={pad} y1={toY(i)} x2={svgSize - pad} y2={toY(i)}
          stroke={i === 0 ? "#475569" : "#cbd5e1"} strokeWidth={i === 0 ? 2 : 0.5} className="dark:stroke-slate-700" />
      );
    }
    return lines;
  }, [gridRange]);

  const fnLabel = parentFn === "x^2" ? "x\u00b2" : parentFn === "x^3" ? "x\u00b3" : parentFn;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-slate-400" /> Parent: y = {fnLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-emerald-400" style={{ borderBottom: "2px dashed #22c55e" }} /> Target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-green-500" /> Your graph
        </span>
      </div>

      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ maxWidth: svgSize }}
        className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1a2e]">
        {gridLines}

        {/* Parent function (gray, thin) */}
        <polyline points={parentPath} fill="none" stroke="#94a3b8" strokeWidth={1.5} opacity={0.5} />

        {/* Target function (green dashed) */}
        <polyline points={targetPath} fill="none" stroke="#22c55e" strokeWidth={2.5} strokeDasharray="8 4" opacity={0.7} />

        {/* User function (indigo solid) */}
        <polyline points={userPath} fill="none"
          stroke={checked ? (isCorrect ? "#22c55e" : "#ef4444") : "#6366f1"}
          strokeWidth={2.5} />
      </svg>

      {/* Transformation equation */}
      <div className="rounded-lg bg-slate-50 px-4 py-2 text-center dark:bg-white/5">
        <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">
          y = {a !== 1 ? `${a}` : ""}({fnLabel.replace("x", `(x${h >= 0 ? " - " + h : " + " + Math.abs(h)})`)}) {v >= 0 ? "+" : "-"} {Math.abs(v)}
        </span>
      </div>

      {/* Sliders */}
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center gap-3">
          <label className="w-32 text-right text-xs font-medium text-slate-500">
            ↔ Horizontal = <span className="font-mono text-green-600 dark:text-green-400">{h}</span>
          </label>
          <input type="range" min={-5} max={5} step={0.5} value={h}
            onChange={(e) => { setH(parseFloat(e.target.value)); setChecked(false); }}
            className="flex-1 accent-green-500" />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-right text-xs font-medium text-slate-500">
            ↕ Vertical = <span className="font-mono text-green-600 dark:text-green-400">{v}</span>
          </label>
          <input type="range" min={-5} max={5} step={0.5} value={v}
            onChange={(e) => { setV(parseFloat(e.target.value)); setChecked(false); }}
            className="flex-1 accent-green-500" />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-32 text-right text-xs font-medium text-slate-500">
            ↕ Stretch = <span className="font-mono text-green-600 dark:text-green-400">{a}</span>
          </label>
          <input type="range" min={-3} max={3} step={0.25} value={a}
            onChange={(e) => { setA(parseFloat(e.target.value)); setChecked(false); }}
            className="flex-1 accent-green-500" />
        </div>
      </div>

      <Button onClick={handleCheck} disabled={checked && isCorrect}>
        {checked && isCorrect ? "Correct!" : "Check Answer"}
      </Button>
    </div>
  );
}
