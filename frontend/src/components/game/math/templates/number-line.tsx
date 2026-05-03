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
    const correct = res.filter(Boolean).length;
    const score = correct / targets.length;
    if (res.every(Boolean)) {
      onComplete(true, 1.0);
    } else if (correct > 0) {
      onComplete(false, score);
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
          stroke="#9aa39d" strokeWidth={isMain ? 1.5 : 0.5} />
        {isMain && (
          <text x={x} y={lineY + 26} textAnchor="middle" fontSize={11} fill="#4d5a51">{v}</text>
        )}
      </g>
    );
  }

  const MARKER_STYLES = [
    { fill: "#0a8754", name: "A", bg: "bg-green-100 text-green-700" },
    { fill: "#f5b800", name: "B", bg: "bg-sun-100 text-sun-700" },
    { fill: "#ec4899", name: "C", bg: "bg-coral-50 text-coral-700" },
    { fill: "#3fb04b", name: "D", bg: "bg-green-100 text-green-700" },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-700 dark:text-ink-300">
        <span>Place each marker at its target:</span>
        {targets.map((t, i) => {
          const style = MARKER_STYLES[i % MARKER_STYLES.length];
          return (
            <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${style.bg}`}>
              {style.name} → {t}
            </span>
          );
        })}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: width, touchAction: "none" }}
        className="rounded-lg border border-ink-200 bg-white dark:border-white/10 dark:bg-[#1a1a2e]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Main line */}
        <line x1={padding} y1={lineY} x2={width - padding} y2={lineY} stroke="#1a2a1f" strokeWidth={2} />
        {/* Arrow tips */}
        <polygon points={`${padding - 6},${lineY} ${padding + 2},${lineY - 5} ${padding + 2},${lineY + 5}`} fill="#1a2a1f" />
        <polygon points={`${width - padding + 6},${lineY} ${width - padding - 2},${lineY - 5} ${width - padding - 2},${lineY + 5}`} fill="#1a2a1f" />

        {ticks}

        {/* Target indicators (shown after check) */}
        {checked && targets.map((t, i) => (
          <circle key={`t${i}`} cx={toX(t)} cy={lineY} r={5} fill="none" stroke="#3fb04b" strokeWidth={2} strokeDasharray="3 2" />
        ))}

        {/* Draggable markers — each with distinct color and letter */}
        {markers.map((val, i) => {
          const x = toX(val);
          const style = MARKER_STYLES[i % MARKER_STYLES.length];
          const color = checked ? (results[i] ? "#3fb04b" : "#ff7a5c") : style.fill;
          return (
            <g key={i} onPointerDown={() => handlePointerDown(i)} style={{ cursor: "grab" }}>
              {/* Hit area */}
              <rect x={x - 15} y={lineY - 35} width={30} height={55} fill="transparent" />
              {/* Marker triangle */}
              <polygon
                points={`${x},${lineY - 4} ${x - 9},${lineY - 24} ${x + 9},${lineY - 24}`}
                fill={color} stroke="white" strokeWidth={1.5}
              />
              {/* Letter inside triangle */}
              <text x={x} y={lineY - 13} textAnchor="middle" dominantBaseline="central"
                fontSize={9} fill="white" fontWeight="bold">{style.name}</text>
              {/* Value label above */}
              <text x={x} y={lineY - 32} textAnchor="middle" fontSize={10} fill={color} fontWeight="600">
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
