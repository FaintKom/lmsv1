"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface DataPoint {
  x: number;
  y: number;
}

export default function ScatterPlot({ config, onComplete }: MathTemplateProps) {
  const points = (config.points as DataPoint[]) || [
    { x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 4 },
    { x: 5, y: 7 }, { x: 6, y: 8 }, { x: 7, y: 9 }, { x: 8, y: 10 },
  ];
  const xLabel = (config.x_label as string) || "x";
  const yLabel = (config.y_label as string) || "y";
  const xRange = (config.x_range as [number, number]) || [0, 10];
  const yRange = (config.y_range as [number, number]) || [0, 12];
  const mode = (config.mode as string) || "best_fit"; // best_fit | read_value | correlation
  const targetSlope = config.target_slope as number | undefined;
  const targetIntercept = config.target_intercept as number | undefined;
  const tolerance = (config.tolerance as number) || 0.5;

  // Best-fit line: user drags two endpoints
  const svgRef = useRef<SVGSVGElement>(null);
  const [lineStart, setLineStart] = useState<DataPoint>({ x: xRange[0], y: yRange[0] });
  const [lineEnd, setLineEnd] = useState<DataPoint>({ x: xRange[1], y: yRange[1] });
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // For read_value / correlation modes
  const [answer, setAnswer] = useState("");

  const svgW = 480;
  const svgH = 360;
  const pad = { top: 30, right: 30, bottom: 50, left: 50 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const toSvgX = (v: number) => pad.left + ((v - xRange[0]) / (xRange[1] - xRange[0])) * plotW;
  const toSvgY = (v: number) => pad.top + plotH - ((v - yRange[0]) / (yRange[1] - yRange[0])) * plotH;
  const fromSvgX = (px: number) => xRange[0] + ((px - pad.left) / plotW) * (xRange[1] - xRange[0]);
  const fromSvgY = (py: number) => yRange[0] + ((pad.top + plotH - py) / plotH) * (yRange[1] - yRange[0]);

  const snap = (v: number, step: number) => Math.round(v / step) * step;

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (svgW / rect.width);
    const py = (e.clientY - rect.top) * (svgH / rect.height);
    const x = snap(Math.max(xRange[0], Math.min(xRange[1], fromSvgX(px))), 0.5);
    const y = snap(Math.max(yRange[0], Math.min(yRange[1], fromSvgY(py))), 0.5);
    if (dragging === "start") setLineStart({ x, y });
    else setLineEnd({ x, y });
  }, [dragging, xRange, yRange]);

  // Calculate user's slope and intercept
  const userSlope = useMemo(() => {
    const dx = lineEnd.x - lineStart.x;
    if (Math.abs(dx) < 0.01) return Infinity;
    return (lineEnd.y - lineStart.y) / dx;
  }, [lineStart, lineEnd]);

  const userIntercept = useMemo(() => lineStart.y - userSlope * lineStart.x, [lineStart, userSlope]);

  const handleCheck = () => {
    setChecked(true);
    if (mode === "best_fit" && targetSlope !== undefined && targetIntercept !== undefined) {
      const slopeOk = Math.abs(userSlope - targetSlope) <= tolerance;
      const intOk = Math.abs(userIntercept - targetIntercept) <= tolerance * 2;
      setIsCorrect(slopeOk && intOk);
      if (slopeOk && intOk) onComplete(true, 1.0);
      else onComplete(false, slopeOk ? 0.5 : 0);
    } else if (mode === "correlation") {
      const correct = answer.toLowerCase().trim() === (config.correct_answer as string)?.toLowerCase().trim();
      setIsCorrect(correct);
      if (correct) onComplete(true, 1.0);
    } else if (mode === "read_value") {
      const num = parseFloat(answer);
      const target = config.correct_answer as number;
      const close = Math.abs(num - target) <= (tolerance || 0.5);
      setIsCorrect(close);
      if (close) onComplete(true, 1.0);
    }
  };

  // Grid lines
  const xTicks = [];
  const yTicks = [];
  const xStep = (xRange[1] - xRange[0]) <= 20 ? 1 : 2;
  const yStep = (yRange[1] - yRange[0]) <= 20 ? 1 : 2;
  for (let v = xRange[0]; v <= xRange[1]; v += xStep) xTicks.push(v);
  for (let v = yRange[0]; v <= yRange[1]; v += yStep) yTicks.push(v);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        style={{ maxWidth: svgW, touchAction: "none" }}
        className="rounded-xl border border-ink-200 bg-white dark:border-white/10 dark:bg-[#1a1a2e]"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        {/* Grid */}
        {xTicks.map((v) => (
          <g key={`x${v}`}>
            <line x1={toSvgX(v)} y1={pad.top} x2={toSvgX(v)} y2={pad.top + plotH}
              stroke={v === 0 ? "#4d5a51" : "#e6e8e4"} strokeWidth={v === 0 ? 1.5 : 0.5} className="dark:stroke-ink-700" />
            <text x={toSvgX(v)} y={svgH - pad.bottom + 18} textAnchor="middle" fontSize={11} fill="#4d5a51">{v}</text>
          </g>
        ))}
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={pad.left} y1={toSvgY(v)} x2={pad.left + plotW} y2={toSvgY(v)}
              stroke={v === 0 ? "#4d5a51" : "#e6e8e4"} strokeWidth={v === 0 ? 1.5 : 0.5} className="dark:stroke-ink-700" />
            <text x={pad.left - 8} y={toSvgY(v) + 4} textAnchor="end" fontSize={11} fill="#4d5a51">{v}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={pad.left + plotW / 2} y={svgH - 6} textAnchor="middle" fontSize={13} fill="#1a2a1f" fontWeight="600" className="dark:fill-ink-300">{xLabel}</text>
        <text x={14} y={pad.top + plotH / 2} textAnchor="middle" fontSize={13} fill="#1a2a1f" fontWeight="600" className="dark:fill-ink-300"
          transform={`rotate(-90, 14, ${pad.top + plotH / 2})`}>{yLabel}</text>

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={5}
            fill="#0a8754" stroke="white" strokeWidth={1.5} />
        ))}

        {/* Best-fit line (user-drawn) */}
        {mode === "best_fit" && (
          <>
            <line
              x1={toSvgX(xRange[0])} y1={toSvgY(userIntercept + userSlope * xRange[0])}
              x2={toSvgX(xRange[1])} y2={toSvgY(userIntercept + userSlope * xRange[1])}
              stroke={checked ? (isCorrect ? "#3fb04b" : "#ff7a5c") : "#f5b800"}
              strokeWidth={2.5} strokeDasharray={checked ? "none" : "6 4"}
            />
            {/* Draggable endpoints */}
            <circle cx={toSvgX(lineStart.x)} cy={toSvgY(lineStart.y)} r={8}
              fill={checked ? "#9aa39d" : "#f5b800"} stroke="white" strokeWidth={2}
              style={{ cursor: "grab" }} onPointerDown={() => !checked && setDragging("start")} />
            <circle cx={toSvgX(lineEnd.x)} cy={toSvgY(lineEnd.y)} r={8}
              fill={checked ? "#9aa39d" : "#f5b800"} stroke="white" strokeWidth={2}
              style={{ cursor: "grab" }} onPointerDown={() => !checked && setDragging("end")} />
          </>
        )}

        {/* Target line (shown after check) */}
        {checked && targetSlope !== undefined && targetIntercept !== undefined && (
          <line
            x1={toSvgX(xRange[0])} y1={toSvgY(targetIntercept + targetSlope * xRange[0])}
            x2={toSvgX(xRange[1])} y2={toSvgY(targetIntercept + targetSlope * xRange[1])}
            stroke="#3fb04b" strokeWidth={2} strokeDasharray="8 4" opacity={0.7}
          />
        )}
      </svg>

      {/* Info bar */}
      {mode === "best_fit" && !checked && (
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Drag the orange dots to draw a line of best fit. Slope: <b className="text-green-600 dark:text-green-400">{userSlope === Infinity ? "∞" : userSlope.toFixed(2)}</b>, y-intercept: <b className="text-green-600 dark:text-green-400">{userIntercept.toFixed(2)}</b>
        </p>
      )}

      {/* Correlation / Read-value input */}
      {(mode === "correlation" || mode === "read_value") && !checked && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-ink-700 dark:text-ink-400">
            {mode === "correlation" ? "Correlation:" : "Answer:"}
          </label>
          {mode === "correlation" ? (
            <select value={answer} onChange={(e) => setAnswer(e.target.value)}
              className="rounded-xl border-2 border-green-300 bg-white px-4 py-2 text-sm font-semibold dark:border-green-500 dark:bg-[#1E1E1E] dark:text-ink-200">
              <option value="">Select...</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="none">No correlation</option>
            </select>
          ) : (
            <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              placeholder="Enter value"
              className="w-28 rounded-xl border-2 border-green-300 bg-white px-3 py-2 text-center text-lg font-bold dark:border-green-500 dark:bg-[#1E1E1E] dark:text-green-300" />
          )}
        </div>
      )}

      <Button onClick={handleCheck} disabled={checked && isCorrect}>
        {checked && isCorrect ? "Correct!" : "Check Answer"}
      </Button>

      {checked && !isCorrect && (
        <p className="text-xs text-coral-500">
          {mode === "best_fit" ? `Target: slope ≈ ${targetSlope}, intercept ≈ ${targetIntercept}` :
            `Correct answer: ${config.correct_answer}`}
        </p>
      )}
    </div>
  );
}
