"use client";

import { useMemo } from "react";
import type { GridState, CellType, Direction } from "./grid-engine";

interface GridRendererProps {
  state: GridState;
  cellSize?: number;
  editMode?: boolean;
  activeTool?: CellType;
  onCellClick?: (x: number, y: number) => void;
  className?: string;
}

const DIRECTION_ROTATION: Record<Direction, number> = {
  up: -90,
  right: 0,
  down: 90,
  left: 180,
};

export default function GridRenderer({
  state,
  cellSize = 48,
  editMode = false,
  activeTool,
  onCellClick,
  className = "",
}: GridRendererProps) {
  const { width, height, cells, robot } = state;
  const svgWidth = width * cellSize;
  const svgHeight = height * cellSize;
  const cs = cellSize;
  const gap = 2;

  const cellMap = useMemo(() => {
    const map = new Map<string, CellType>();
    for (const cell of cells) {
      map.set(`${cell.x},${cell.y}`, cell.type);
    }
    return map;
  }, [cells]);

  const getCellType = (x: number, y: number): CellType => {
    return cellMap.get(`${x},${y}`) || "empty";
  };

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={`block ${className}`}
      style={{ width: "100%", height: "100%", maxWidth: svgWidth, maxHeight: svgHeight, objectFit: "contain" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Cell shadow filter */}
        <filter id="cellShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.08" />
        </filter>
        {/* Robot glow */}
        <filter id="robotGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Star gradient */}
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        {/* Goal gradient */}
        <radialGradient id="goalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect x={0} y={0} width={svgWidth} height={svgHeight} rx={8} fill="#f1f5f9" className="dark:fill-[#1a1a1a]" />

      {/* Grid cells */}
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
          const type = getCellType(x, y);
          const cx = x * cs + gap;
          const cy = y * cs + gap;
          const cw = cs - gap * 2;

          return (
            <g key={`${x}-${y}`} onClick={() => onCellClick?.(x, y)} className={editMode ? "cursor-pointer" : ""}>
              {/* Cell base */}
              {type === "wall" ? (
                <rect x={cx} y={cy} width={cw} height={cw} rx={6}
                  fill="#475569" stroke="#334155" strokeWidth={1} className="dark:fill-[#3f3f46] dark:stroke-[#52525b]" />
              ) : (
                <rect x={cx} y={cy} width={cw} height={cw} rx={6}
                  fill="white" stroke="#e2e8f0" strokeWidth={1} filter="url(#cellShadow)"
                  className="dark:fill-[#27272a] dark:stroke-[#3f3f46]" />
              )}

              {/* Wall inner texture */}
              {type === "wall" && (
                <>
                  <rect x={cx + 3} y={cy + 3} width={cw - 6} height={cw - 6} rx={4}
                    fill="#334155" className="dark:fill-[#52525b]" />
                  <rect x={cx + 6} y={cy + cw * 0.3} width={cw - 12} height={2} rx={1} fill="#475569" opacity={0.5} />
                  <rect x={cx + 6} y={cy + cw * 0.6} width={cw - 12} height={2} rx={1} fill="#475569" opacity={0.5} />
                </>
              )}

              {/* Item (star) */}
              {type === "item" && (
                <g>
                  <circle cx={x * cs + cs / 2} cy={y * cs + cs / 2} r={cs * 0.35} fill="url(#starGlow)" />
                  <text x={x * cs + cs / 2} y={y * cs + cs / 2 + 2} textAnchor="middle" dominantBaseline="central"
                    fontSize={cs * 0.45} className="select-none">⭐</text>
                </g>
              )}

              {/* Start position */}
              {type === "start" && editMode && (
                <text x={x * cs + cs / 2} y={y * cs + cs / 2 + 1} textAnchor="middle" dominantBaseline="central"
                  fontSize={cs * 0.3} fill="#22c55e" fontWeight="bold" className="select-none">START</text>
              )}

              {/* Goal */}
              {type === "goal" && (
                <g>
                  <circle cx={x * cs + cs / 2} cy={y * cs + cs / 2} r={cs * 0.4} fill="url(#goalGlow)" />
                  <text x={x * cs + cs / 2} y={y * cs + cs / 2 + 2} textAnchor="middle" dominantBaseline="central"
                    fontSize={cs * 0.45} className="select-none">🏁</text>
                </g>
              )}

              {/* Edit hover */}
              {editMode && (
                <rect x={cx} y={cy} width={cw} height={cw} rx={6}
                  fill="transparent" className="hover:fill-indigo-500/10" />
              )}
            </g>
          );
        })
      )}

      {/* Trail path */}
      {!editMode && state.trail && state.trail.length > 1 && (
        <polyline
          points={state.trail.map((t) => `${t.x * cs + cs / 2},${t.y * cs + cs / 2}`).join(" ")}
          fill="none"
          stroke={state.goalReached ? "#22c55e" : "#a5b4fc"}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.5}
        />
      )}

      {/* Trail dots */}
      {!editMode && state.trail && state.trail.map((t, i) => (
        i > 0 && (
          <circle key={`trail-${i}`}
            cx={t.x * cs + cs / 2} cy={t.y * cs + cs / 2} r={2.5}
            fill={state.goalReached ? "#22c55e" : "#a5b4fc"} opacity={0.6} />
        )
      ))}

      {/* Robot */}
      {!editMode && (
        <g
          className={state.lastCollision ? "robot-shake" : ""}
          style={{
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: `translate(${robot.x * cs + cs / 2}px, ${robot.y * cs + cs / 2}px)`,
          }}
        >
          <g style={{
            transition: "transform 0.2s ease-out",
            transform: `rotate(${DIRECTION_ROTATION[robot.direction]}deg)`,
          }}>
            {/* Shadow */}
            <ellipse rx={cs * 0.28} ry={cs * 0.08} cy={cs * 0.32} fill="black" opacity={0.1} />

            {/* Body */}
            <circle r={cs * 0.32}
              fill={state.lastCollision ? "#ef4444" : "#6366f1"}
              filter="url(#robotGlow)"
              style={{ transition: "fill 0.3s" }}
            />

            {/* Face plate */}
            <circle r={cs * 0.26} fill={state.lastCollision ? "#f87171" : "#818cf8"} />

            {/* Eyes */}
            <circle cx={cs * 0.06} cy={-cs * 0.08} r={cs * 0.07} fill="white" />
            <circle cx={cs * 0.06} cy={-cs * 0.08} r={cs * 0.035} fill="#1e1b4b" />
            <circle cx={-cs * 0.06} cy={-cs * 0.08} r={cs * 0.07} fill="white" />
            <circle cx={-cs * 0.06} cy={-cs * 0.08} r={cs * 0.035} fill="#1e1b4b" />

            {/* Pupils (highlight) */}
            <circle cx={cs * 0.075} cy={-cs * 0.095} r={cs * 0.015} fill="white" />
            <circle cx={-cs * 0.045} cy={-cs * 0.095} r={cs * 0.015} fill="white" />

            {/* Smile / mouth */}
            {state.goalReached ? (
              <path d={`M ${-cs * 0.08} ${cs * 0.04} Q 0 ${cs * 0.14} ${cs * 0.08} ${cs * 0.04}`}
                fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" />
            ) : state.lastCollision ? (
              <circle cy={cs * 0.06} r={cs * 0.04} fill="white" />
            ) : (
              <path d={`M ${-cs * 0.06} ${cs * 0.05} Q 0 ${cs * 0.1} ${cs * 0.06} ${cs * 0.05}`}
                fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
            )}

            {/* Direction arrow (on the side the robot faces) */}
            <polygon
              points={`${cs * 0.3},0 ${cs * 0.22},-${cs * 0.06} ${cs * 0.22},${cs * 0.06}`}
              fill="white" opacity={0.7}
            />
          </g>
        </g>
      )}

      {/* Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-3px, 0); }
          40% { transform: translate(3px, 0); }
          60% { transform: translate(-2px, 0); }
          80% { transform: translate(2px, 0); }
        }
        .robot-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </svg>
  );
}
