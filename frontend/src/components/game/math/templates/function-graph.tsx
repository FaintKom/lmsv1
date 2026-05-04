"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

type FunctionType = "linear" | "quadratic" | "exponential";

interface GraphConfig {
  function_type: FunctionType;
  target_params: Record<string, number>; // {a: 2, b: 1} for y = 2x + 1
  grid_range: number;
  mode: "match_graph" | "find_params" | "plot_points";
  show_target: boolean;
  tolerance: number;
}

const DEFAULT_CONFIG: GraphConfig = {
  function_type: "linear",
  target_params: { m: 2, b: -1 },
  grid_range: 6,
  mode: "match_graph",
  show_target: true,
  tolerance: 0.3,
};

/** Evaluate function at x given type and params */
function evalFn(type: FunctionType, params: Record<string, number>, x: number): number {
  switch (type) {
    case "linear":
      return (params.m ?? 1) * x + (params.b ?? 0);
    case "quadratic":
      return (params.a ?? 1) * x * x + (params.b ?? 0) * x + (params.c ?? 0);
    case "exponential":
      return (params.a ?? 1) * Math.pow(params.base ?? 2, x) + (params.c ?? 0);
    default:
      return x;
  }
}

function getParamLabels(type: FunctionType): { key: string; label: string; min: number; max: number; step: number }[] {
  switch (type) {
    case "linear":
      return [
        { key: "m", label: "slope (m)", min: -5, max: 5, step: 0.5 },
        { key: "b", label: "y-intercept (b)", min: -5, max: 5, step: 0.5 },
      ];
    case "quadratic":
      return [
        { key: "a", label: "a", min: -3, max: 3, step: 0.25 },
        { key: "b", label: "b", min: -5, max: 5, step: 0.5 },
        { key: "c", label: "c", min: -5, max: 5, step: 0.5 },
      ];
    case "exponential":
      return [
        { key: "a", label: "a", min: -3, max: 3, step: 0.5 },
        { key: "base", label: "base", min: 0.5, max: 4, step: 0.5 },
        { key: "c", label: "c (shift)", min: -5, max: 5, step: 0.5 },
      ];
    default:
      return [];
  }
}

function getFnString(type: FunctionType, params: Record<string, number>): string {
  switch (type) {
    case "linear":
      return `y = ${params.m ?? 1}x + ${params.b ?? 0}`;
    case "quadratic":
      return `y = ${params.a ?? 1}x² + ${params.b ?? 0}x + ${params.c ?? 0}`;
    case "exponential":
      return `y = ${params.a ?? 1} · ${params.base ?? 2}^x + ${params.c ?? 0}`;
    default:
      return "y = x";
  }
}

export default function FunctionGraph({ config, onComplete }: MathTemplateProps) {
  const cfg: GraphConfig = { ...DEFAULT_CONFIG, ...config } as GraphConfig;
  const { function_type, target_params, grid_range, mode, show_target, tolerance } = cfg;

  const paramDefs = getParamLabels(function_type);
  const [userParams, setUserParams] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of paramDefs) init[p.key] = 0;
    return init;
  });
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const svgSize = 440;
  const padding = 40;
  const plotSize = svgSize - padding * 2;
  const scale = plotSize / (grid_range * 2);

  const toSvgX = (x: number) => padding + (x + grid_range) * scale;
  const toSvgY = (y: number) => padding + (grid_range - y) * scale;

  /** Generate path points for a function */
  const generatePath = useCallback(
    (params: Record<string, number>) => {
      const points: string[] = [];
      for (let px = 0; px <= plotSize; px += 2) {
        const x = (px / plotSize) * grid_range * 2 - grid_range;
        const y = evalFn(function_type, params, x);
        if (y >= -grid_range && y <= grid_range) {
          points.push(`${padding + px},${toSvgY(y)}`);
        }
      }
      return points.join(" ");
    },
    [function_type, grid_range, plotSize, toSvgY]
  );

  const targetPath = useMemo(() => generatePath(target_params), [generatePath, target_params]);
  const userPath = useMemo(() => generatePath(userParams), [generatePath, userParams]);

  const handleCheck = () => {
    // Check if all params are close enough
    const correct = paramDefs.every((p) => {
      const target = target_params[p.key] ?? 0;
      const user = userParams[p.key] ?? 0;
      return Math.abs(target - user) <= tolerance;
    });
    setChecked(true);
    setIsCorrect(correct);
    if (correct) onComplete(true, 1.0);
  };

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = -grid_range; i <= grid_range; i++) {
      lines.push(
        <line key={`v${i}`} x1={toSvgX(i)} y1={padding} x2={toSvgX(i)} y2={svgSize - padding}
          stroke={i === 0 ? "#4d5a51" : "#c9cec9"} strokeWidth={i === 0 ? 2 : 0.5} />
      );
      lines.push(
        <line key={`h${i}`} x1={padding} y1={toSvgY(i)} x2={svgSize - padding} y2={toSvgY(i)}
          stroke={i === 0 ? "#4d5a51" : "#c9cec9"} strokeWidth={i === 0 ? 2 : 0.5} />
      );
      if (i !== 0 && i % 2 === 0) {
        lines.push(
          <text key={`xl${i}`} x={toSvgX(i)} y={toSvgY(0) + 14} textAnchor="middle" fontSize={9} fill="#9aa39d">{i}</text>
        );
        lines.push(
          <text key={`yl${i}`} x={toSvgX(0) - 10} y={toSvgY(i) + 3} textAnchor="middle" fontSize={9} fill="#9aa39d">{i}</text>
        );
      }
    }
    return lines;
  }, [grid_range, toSvgX, toSvgY, svgSize]);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-ink-700 dark:text-ink-300">
        {mode === "match_graph"
          ? "Adjust the sliders to match the target graph (dashed line)"
          : `Find the parameters for: ${getFnString(function_type, target_params)}`}
      </p>

      {/* Graph */}
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ maxWidth: svgSize }}
        className="rounded-lg border border-ink-200 bg-white dark:border-white/10 dark:bg-[#1a1a2e]">
        {gridLines}

        {/* Target function (dashed) */}
        {show_target && (
          <polyline points={targetPath} fill="none" stroke="#3fb04b" strokeWidth={2.5}
            strokeDasharray="8 4" opacity={0.7} />
        )}

        {/* User function (solid) */}
        <polyline points={userPath} fill="none"
          stroke={checked ? (isCorrect ? "#3fb04b" : "#ff7a5c") : "#0a8754"}
          strokeWidth={2.5} />

        {/* Labels */}
        <text x={svgSize - padding + 8} y={toSvgY(0) + 4} fontSize={12} fill="#4d5a51" fontWeight="bold">x</text>
        <text x={toSvgX(0) + 6} y={padding - 6} fontSize={12} fill="#4d5a51" fontWeight="bold">y</text>
      </svg>

      {/* Current equation display */}
      <div className="rounded-lg bg-ink-50 px-4 py-2 text-center dark:bg-white/5">
        <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">
          {getFnString(function_type, userParams)}
        </span>
      </div>

      {/* Parameter sliders */}
      <div className="w-full max-w-sm space-y-3">
        {paramDefs.map((p) => (
          <div key={p.key} className="flex items-center gap-3">
            <label className="w-24 text-right text-xs font-medium text-ink-500">
              {p.label} = <span className="font-mono text-green-600 dark:text-green-400">{userParams[p.key]}</span>
            </label>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={userParams[p.key] ?? 0}
              onChange={(e) =>
                setUserParams((prev) => ({ ...prev, [p.key]: parseFloat(e.target.value) }))
              }
              disabled={checked && isCorrect}
              className="flex-1 accent-green-500"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleCheck} disabled={checked && isCorrect}>
        {checked && isCorrect ? "Correct!" : "Check Answer"}
      </Button>

      {checked && !isCorrect && (
        <p className="text-xs text-coral-500">
          Not quite. Adjust the sliders to better match the target graph.
        </p>
      )}
    </div>
  );
}
