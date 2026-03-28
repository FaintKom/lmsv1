"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

export default function VisualFractions({ config, onComplete }: MathTemplateProps) {
  const targetNumerator = (config.target_numerator as number) || 3;
  const targetDenominator = (config.target_denominator as number) || 8;
  const displayType = (config.display_type as "pie" | "bar") || "pie";

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const isCorrect = checked && selected.size === targetNumerator;

  const togglePart = useCallback(
    (index: number) => {
      if (checked) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [checked]
  );

  const handleCheck = () => {
    setChecked(true);
    if (selected.size === targetNumerator) {
      onComplete(true, 1.0);
    }
  };

  const handleReset = () => {
    setSelected(new Set());
    setChecked(false);
  };

  const svgSize = 260;
  const center = svgSize / 2;
  const radius = 100;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Shade <strong>{targetNumerator}/{targetDenominator}</strong> of the shape
      </p>

      {displayType === "pie" ? (
        <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ maxWidth: svgSize }}>
          {/* Background circle */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={2} className="dark:stroke-slate-600" />

          {/* Pie slices */}
          {Array.from({ length: targetDenominator }, (_, i) => {
            const angle1 = (i / targetDenominator) * Math.PI * 2 - Math.PI / 2;
            const angle2 = ((i + 1) / targetDenominator) * Math.PI * 2 - Math.PI / 2;
            const x1 = center + radius * Math.cos(angle1);
            const y1 = center + radius * Math.sin(angle1);
            const x2 = center + radius * Math.cos(angle2);
            const y2 = center + radius * Math.sin(angle2);
            const largeArc = 1 / targetDenominator > 0.5 ? 1 : 0;

            const isSelected = selected.has(i);
            let fillColor = isSelected ? "#6366f1" : "#f8fafc";
            if (checked && isSelected) {
              fillColor = isCorrect ? "#22c55e" : "#ef4444";
            }

            return (
              <g key={i} onClick={() => togglePart(i)} style={{ cursor: checked ? "default" : "pointer" }}>
                <path
                  d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={fillColor}
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  className={`transition-colors ${!checked && !isSelected ? "hover:fill-indigo-100 dark:hover:fill-indigo-500/20" : ""}`}
                />
              </g>
            );
          })}

          {/* Center label */}
          <text x={center} y={center + 5} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#334155" className="dark:fill-slate-200">
            {selected.size}/{targetDenominator}
          </text>
        </svg>
      ) : (
        /* Bar representation */
        <svg viewBox={`0 0 400 80`} width="100%" style={{ maxWidth: 400 }}>
          {Array.from({ length: targetDenominator }, (_, i) => {
            const w = 360 / targetDenominator;
            const x = 20 + i * w;
            const isSelected = selected.has(i);
            let fillColor = isSelected ? "#6366f1" : "#f8fafc";
            if (checked && isSelected) {
              fillColor = isCorrect ? "#22c55e" : "#ef4444";
            }

            return (
              <rect
                key={i}
                x={x}
                y={10}
                width={w - 2}
                height={50}
                rx={4}
                fill={fillColor}
                stroke="#cbd5e1"
                strokeWidth={1.5}
                onClick={() => togglePart(i)}
                style={{ cursor: checked ? "default" : "pointer" }}
                className={`transition-colors ${!checked && !isSelected ? "hover:fill-indigo-100" : ""}`}
              />
            );
          })}
          <text x={200} y={78} textAnchor="middle" fontSize={14} fill="#64748b">
            {selected.size}/{targetDenominator}
          </text>
        </svg>
      )}

      <div className="flex gap-2">
        {!checked || !isCorrect ? (
          <>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleCheck}>
              Check Answer
            </Button>
          </>
        ) : (
          <p className="text-sm font-medium text-emerald-600">Correct!</p>
        )}
      </div>
    </div>
  );
}
