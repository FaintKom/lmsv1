"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface Point {
  id: string;
  x: number;
  y: number;
}

const POINT_COLORS = [
  { fill: "#6366f1", label: "#4f46e5", name: "A", bg: "bg-green-100 text-green-700" },
  { fill: "#f59e0b", label: "#d97706", name: "B", bg: "bg-amber-100 text-amber-700" },
  { fill: "#ec4899", label: "#db2777", name: "C", bg: "bg-pink-100 text-pink-700" },
  { fill: "#22c55e", label: "#16a34a", name: "D", bg: "bg-emerald-100 text-emerald-700" },
  { fill: "#8b5cf6", label: "#7c3aed", name: "E", bg: "bg-violet-100 text-violet-700" },
];

export default function CoordinatePlane({ config, onComplete }: MathTemplateProps) {
  const targetPoints = (config.target_points as { x: number; y: number; label?: string }[]) || [
    { x: 3, y: 2 },
    { x: -2, y: 4 },
  ];
  const gridRange = (config.grid_range as number) || 6;
  const tolerance = (config.tolerance as number) || 0.5;

  const svgRef = useRef<SVGSVGElement>(null);
  const [userPoints, setUserPoints] = useState<Point[]>(
    targetPoints.map((_, i) => ({ id: `p${i}`, x: 0, y: 0 }))
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const svgSize = 400;
  const padding = 40;
  const plotSize = svgSize - padding * 2;
  const scale = plotSize / (gridRange * 2);

  const toSvg = (val: number, axis: "x" | "y") => {
    if (axis === "x") return padding + (val + gridRange) * scale;
    return padding + (gridRange - val) * scale;
  };

  const fromSvg = (px: number, axis: "x" | "y") => {
    if (axis === "x") return (px - padding) / scale - gridRange;
    return gridRange - (px - padding) / scale;
  };

  const snap = (val: number) => Math.round(val * 2) / 2;

  const handlePointerDown = useCallback((id: string) => {
    setDragging(id);
    setChecked(false);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const x = snap(fromSvg(px * (svgSize / rect.width), "x"));
      const y = snap(fromSvg(py * (svgSize / rect.height), "y"));

      setUserPoints((prev) =>
        prev.map((p) =>
          p.id === dragging
            ? { ...p, x: Math.max(-gridRange, Math.min(gridRange, x)), y: Math.max(-gridRange, Math.min(gridRange, y)) }
            : p
        )
      );
    },
    [dragging, gridRange]
  );

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const handleCheck = () => {
    const res = targetPoints.map((target, i) => {
      const user = userPoints[i];
      return Math.abs(user.x - target.x) <= tolerance && Math.abs(user.y - target.y) <= tolerance;
    });
    setResults(res);
    setChecked(true);
    const correct = res.filter(Boolean).length;
    const score = correct / targetPoints.length;
    if (correct === targetPoints.length) {
      onComplete(true, 1.0);
    } else if (correct > 0) {
      onComplete(false, score);
    }
  };

  // Grid lines
  const gridLines = [];
  for (let i = -gridRange; i <= gridRange; i++) {
    gridLines.push(
      <line key={`vg${i}`} x1={toSvg(i, "x")} y1={padding} x2={toSvg(i, "x")} y2={svgSize - padding}
        stroke={i === 0 ? "currentColor" : "#e2e8f0"} strokeWidth={i === 0 ? 2 : 0.5} className="dark:stroke-slate-600" />,
      <line key={`hg${i}`} x1={padding} y1={toSvg(i, "y")} x2={svgSize - padding} y2={toSvg(i, "y")}
        stroke={i === 0 ? "currentColor" : "#e2e8f0"} strokeWidth={i === 0 ? 2 : 0.5} className="dark:stroke-slate-600" />
    );
    if (i !== 0) {
      gridLines.push(
        <text key={`xl${i}`} x={toSvg(i, "x")} y={toSvg(0, "y") + 16} textAnchor="middle" fontSize={10} fill="#94a3b8">{i}</text>,
        <text key={`yl${i}`} x={toSvg(0, "x") - 12} y={toSvg(i, "y") + 4} textAnchor="middle" fontSize={10} fill="#94a3b8">{i}</text>
      );
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span>Drag each point to its target:</span>
        {targetPoints.map((p, i) => {
          const color = POINT_COLORS[i % POINT_COLORS.length];
          return (
            <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${color.bg}`}>
              {color.name} → ({p.x}, {p.y})
            </span>
          );
        })}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        width="100%"
        style={{ maxWidth: svgSize, touchAction: "none" }}
        className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1a2e]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {gridLines}

        {/* Axis labels */}
        <text x={svgSize - padding + 10} y={toSvg(0, "y") + 4} fontSize={12} fill="#64748b" fontWeight="bold">x</text>
        <text x={toSvg(0, "x") + 8} y={padding - 10} fontSize={12} fill="#64748b" fontWeight="bold">y</text>

        {/* Target indicators (shown after check) */}
        {checked && targetPoints.map((t, i) => (
          <circle key={`target${i}`} cx={toSvg(t.x, "x")} cy={toSvg(t.y, "y")} r={6}
            fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 2" />
        ))}

        {/* Draggable points — each with distinct color and letter */}
        {userPoints.map((p, i) => {
          const color = POINT_COLORS[i % POINT_COLORS.length];
          const cx = toSvg(p.x, "x");
          const cy = toSvg(p.y, "y");
          return (
            <g key={p.id} onPointerDown={() => handlePointerDown(p.id)} style={{ cursor: "grab" }}>
              <circle cx={cx} cy={cy} r={16} fill="transparent" />
              <circle
                cx={cx} cy={cy} r={10}
                fill={checked ? (results[i] ? "#22c55e" : "#ef4444") : color.fill}
                stroke="white" strokeWidth={2.5}
                className="transition-colors"
              />
              {/* Letter label inside point */}
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central"
                fontSize={11} fill="white" fontWeight="bold">{color.name}</text>
              {/* Coordinates above */}
              <text x={cx} y={cy - 16} textAnchor="middle"
                fontSize={10} fill={checked ? (results[i] ? "#22c55e" : "#ef4444") : color.label} fontWeight="600">
                ({p.x}, {p.y})
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
