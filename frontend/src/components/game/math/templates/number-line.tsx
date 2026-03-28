"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

export default function NumberLine({ config, onComplete }: MathTemplateProps) {
  const rangeMin = (config.range_min as number) ?? 0;
  const rangeMax = (config.range_max as number) ?? 10;
  const targets = (config.targets as number[]) || [3, 7];
  const tickInterval = (config.tick_interval as number) || 1;
  const tolerance = (config.tolerance as number) || 0.3;

  const svgRef = useRef<SVGSVGElement>(null);
  const [markers, setMarkers] = useState<number[]>(targets.map(() => (rangeMin + rangeMax) / 2));
  const [dragging, setDragging] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const width = 500;
  const height = 120;
  const padding = 40;
  const lineY = 60;
  const lineWidth = width - padding * 2;
  const range = rangeMax - rangeMin;

  const toX = (val: number) => padding + ((val - rangeMin) / range) * lineWidth;
  const fromX = (px: number) => rangeMin + ((px - padding) / lineWidth) * range;
  const snap = (val: number) => Math.round(val / (tickInterval / 2)) * (tickInterval / 2);

  const handlePointerDown = useCallback((idx: number) => {
    setDragging(idx);
    setChecked(false);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (width / rect.width);
      const val = snap(Math.max(rangeMin, Math.min(rangeMax, fromX(px))));
      setMarkers((prev) => prev.map((m, i) => (i === dragging ? val : m)));
    },
    [dragging, rangeMin, rangeMax]
  );

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const handleCheck = () => {
    const res = targets.map((target, i) => Math.abs(markers[i] - target) <= tolerance);
    setResults(res);
    setChecked(true);
    if (res.every(Boolean)) {
      onComplete(true, 1.0);
    }
  };

  // Ticks
  const ticks = [];
  for (let v = rangeMin; v <= rangeMax; v += tickInterval) {
    const x = toX(v);
    const isMain = Number.isInteger(v);
    ticks.push(
      <g key={v}>
        <line x1={x} y1={lineY - (isMain ? 10 : 5)} x2={x} y2={lineY + (isMain ? 10 : 5)}
          stroke="#94a3b8" strokeWidth={isMain ? 1.5 : 0.5} />
        {isMain && (
          <text x={x} y={lineY + 26} textAnchor="middle" fontSize={11} fill="#64748b">{v}</text>
        )}
      </g>
    );
  }

  const MARKER_COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#22c55e"];

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Place the marker{targets.length > 1 ? "s" : ""} at: {targets.join(", ")}
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: width, touchAction: "none" }}
        className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1a2e]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Main line */}
        <line x1={padding} y1={lineY} x2={width - padding} y2={lineY} stroke="#334155" strokeWidth={2} />
        {/* Arrow tips */}
        <polygon points={`${padding - 6},${lineY} ${padding + 2},${lineY - 5} ${padding + 2},${lineY + 5}`} fill="#334155" />
        <polygon points={`${width - padding + 6},${lineY} ${width - padding - 2},${lineY - 5} ${width - padding - 2},${lineY + 5}`} fill="#334155" />

        {ticks}

        {/* Target indicators (shown after check) */}
        {checked && targets.map((t, i) => (
          <circle key={`t${i}`} cx={toX(t)} cy={lineY} r={5} fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="3 2" />
        ))}

        {/* Draggable markers */}
        {markers.map((val, i) => {
          const x = toX(val);
          const color = checked ? (results[i] ? "#22c55e" : "#ef4444") : MARKER_COLORS[i % MARKER_COLORS.length];
          return (
            <g key={i} onPointerDown={() => handlePointerDown(i)} style={{ cursor: "grab" }}>
              {/* Hit area */}
              <rect x={x - 15} y={lineY - 30} width={30} height={50} fill="transparent" />
              {/* Marker triangle */}
              <polygon
                points={`${x},${lineY - 4} ${x - 8},${lineY - 22} ${x + 8},${lineY - 22}`}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
              />
              {/* Value label */}
              <text x={x} y={lineY - 28} textAnchor="middle" fontSize={10} fill={color} fontWeight="600">
                {val}
              </text>
            </g>
          );
        })}
      </svg>

      <Button onClick={handleCheck} disabled={checked && results.every(Boolean)}>
        {checked && results.every(Boolean) ? "Correct!" : "Check Answer"}
      </Button>
    </div>
  );
}
