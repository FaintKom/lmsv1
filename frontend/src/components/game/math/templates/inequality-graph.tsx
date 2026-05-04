"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

export default function InequalityGraph({ config, onComplete }: MathTemplateProps) {
  const gridRange = (config.grid_range as number) || 6;
  const targetSlope = (config.slope as number) ?? 1;
  const targetIntercept = (config.intercept as number) ?? 0;
  const targetOperator = (config.operator as string) || ">="; // >, <, >=, <=
  const tolerance = (config.tolerance as number) || 0.4;

  const [userSlope, setUserSlope] = useState(0);
  const [userIntercept, setUserIntercept] = useState(0);
  const [userOperator, setUserOperator] = useState(">=");
  const [shadedSide, setShadedSide] = useState<"above" | "below" | null>(null);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const svgSize = 440;
  const pad = 40;
  const plotSize = svgSize - pad * 2;
  const scale = plotSize / (gridRange * 2);

  const toX = (v: number) => pad + (v + gridRange) * scale;
  const toY = (v: number) => pad + (gridRange - v) * scale;

  const isDashed = userOperator === ">" || userOperator === "<";
  const correctSide = targetOperator.includes(">") ? "above" : "below";

  // Generate line path endpoints clipped to grid
  const lineY1 = userSlope * (-gridRange) + userIntercept;
  const lineY2 = userSlope * gridRange + userIntercept;

  // Shading polygon
  const shadingPath = useMemo(() => {
    if (!shadedSide) return "";
    const x1 = toX(-gridRange);
    const x2 = toX(gridRange);
    const ly1 = toY(lineY1);
    const ly2 = toY(lineY2);
    if (shadedSide === "above") {
      return `${x1},${ly1} ${x2},${ly2} ${x2},${pad} ${x1},${pad}`;
    } else {
      return `${x1},${ly1} ${x2},${ly2} ${x2},${pad + plotSize} ${x1},${pad + plotSize}`;
    }
  }, [shadedSide, lineY1, lineY2, toX, toY, pad, plotSize, gridRange]);

  const handleCheck = () => {
    const slopeOk = Math.abs(userSlope - targetSlope) <= tolerance;
    const intOk = Math.abs(userIntercept - targetIntercept) <= tolerance;
    const opOk = (userOperator === targetOperator);
    const sideOk = shadedSide === correctSide;
    const dashOk = isDashed === (targetOperator === ">" || targetOperator === "<");

    const allCorrect = slopeOk && intOk && sideOk;
    setChecked(true);
    setIsCorrect(allCorrect);
    if (allCorrect) onComplete(true, 1.0);
    else {
      const partial = [slopeOk, intOk, sideOk].filter(Boolean).length / 3;
      onComplete(false, partial);
    }
  };

  // Grid
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = -gridRange; i <= gridRange; i++) {
      lines.push(
        <line key={`v${i}`} x1={toX(i)} y1={pad} x2={toX(i)} y2={svgSize - pad}
          stroke={i === 0 ? "#4d5a51" : "#c9cec9"} strokeWidth={i === 0 ? 2 : 0.5} className="dark:stroke-ink-700" />,
        <line key={`h${i}`} x1={pad} y1={toY(i)} x2={svgSize - pad} y2={toY(i)}
          stroke={i === 0 ? "#4d5a51" : "#c9cec9"} strokeWidth={i === 0 ? 2 : 0.5} className="dark:stroke-ink-700" />
      );
      if (i !== 0 && i % 2 === 0) {
        lines.push(
          <text key={`xl${i}`} x={toX(i)} y={toY(0) + 14} textAnchor="middle" fontSize={9} fill="#9aa39d">{i}</text>,
          <text key={`yl${i}`} x={toX(0) - 10} y={toY(i) + 3} textAnchor="middle" fontSize={9} fill="#9aa39d">{i}</text>
        );
      }
    }
    return lines;
  }, [gridRange]);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ maxWidth: svgSize }}
        className="rounded-xl border border-ink-200 bg-white dark:border-white/10 dark:bg-[#1a1a2e]">
        {gridLines}

        {/* Shaded region */}
        {shadedSide && (
          <polygon points={shadingPath}
            fill={checked ? (isCorrect ? "#3fb04b" : "#ff7a5c") : "#0a8754"}
            opacity={0.15} />
        )}

        {/* Boundary line */}
        <line x1={toX(-gridRange)} y1={toY(lineY1)} x2={toX(gridRange)} y2={toY(lineY2)}
          stroke={checked ? (isCorrect ? "#3fb04b" : "#ff7a5c") : "#0a8754"}
          strokeWidth={2.5}
          strokeDasharray={isDashed ? "8 5" : "none"} />

        {/* Click zones for shading */}
        {!checked && (
          <>
            <rect x={pad} y={pad} width={plotSize} height={plotSize / 2}
              fill="transparent" className="cursor-pointer"
              onClick={() => { setShadedSide("above"); setChecked(false); }} />
            <rect x={pad} y={pad + plotSize / 2} width={plotSize} height={plotSize / 2}
              fill="transparent" className="cursor-pointer"
              onClick={() => { setShadedSide("below"); setChecked(false); }} />
          </>
        )}

        {/* Axis labels */}
        <text x={svgSize - pad + 8} y={toY(0) + 4} fontSize={12} fill="#4d5a51" fontWeight="bold">x</text>
        <text x={toX(0) + 6} y={pad - 6} fontSize={12} fill="#4d5a51" fontWeight="bold">y</text>
      </svg>

      {/* Controls */}
      <div className="w-full max-w-md space-y-3">
        {/* Operator selector */}
        <div className="flex items-center gap-3 justify-center">
          <span className="text-sm font-medium text-ink-700 dark:text-ink-400">y</span>
          <div className="flex rounded-xl border border-ink-200 dark:border-white/10 overflow-hidden">
            {[">", ">=", "<", "<="].map((op) => (
              <button key={op} onClick={() => { setUserOperator(op); setChecked(false); }}
                className={`px-4 py-2 text-sm font-bold transition-colors ${
                  userOperator === op
                    ? "bg-green-500 text-white"
                    : "bg-white text-ink-700 hover:bg-ink-50 dark:bg-[#1E1E1E] dark:text-ink-400"
                }`}>
                {op.replace(">=", "\u2265").replace("<=", "\u2264")}
              </button>
            ))}
          </div>
          <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">
            {userSlope}x {userIntercept >= 0 ? "+" : ""} {userIntercept}
          </span>
        </div>

        {/* Slope slider */}
        <div className="flex items-center gap-3">
          <label className="w-28 text-right text-xs font-medium text-ink-500">
            slope = <span className="font-mono text-green-600 dark:text-green-400">{userSlope}</span>
          </label>
          <input type="range" min={-5} max={5} step={0.5} value={userSlope}
            onChange={(e) => { setUserSlope(parseFloat(e.target.value)); setChecked(false); }}
            className="flex-1 accent-green-500" />
        </div>

        {/* Intercept slider */}
        <div className="flex items-center gap-3">
          <label className="w-28 text-right text-xs font-medium text-ink-500">
            intercept = <span className="font-mono text-green-600 dark:text-green-400">{userIntercept}</span>
          </label>
          <input type="range" min={-5} max={5} step={0.5} value={userIntercept}
            onChange={(e) => { setUserIntercept(parseFloat(e.target.value)); setChecked(false); }}
            className="flex-1 accent-green-500" />
        </div>

        {/* Shade instruction */}
        <p className="text-center text-xs text-ink-400">
          {shadedSide ? `Shaded: ${shadedSide} the line` : "Click above or below the line to shade the solution region"}
          {isDashed ? " (dashed = strict inequality)" : " (solid = includes boundary)"}
        </p>
      </div>

      <Button onClick={handleCheck} disabled={!shadedSide || (checked && isCorrect)}>
        {checked && isCorrect ? "Correct!" : "Check Answer"}
      </Button>

      {checked && !isCorrect && (
        <p className="text-xs text-coral-500">
          Target: y {targetOperator} {targetSlope}x {targetIntercept >= 0 ? "+" : ""} {targetIntercept}
        </p>
      )}
    </div>
  );
}
