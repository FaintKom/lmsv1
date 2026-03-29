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

const CELL_COLORS: Record<CellType, { light: string; dark: string }> = {
  empty: { light: "#f8fafc", dark: "#1e293b" },
  wall: { light: "#334155", dark: "#475569" },
  item: { light: "#fef3c7", dark: "#451a03" },
  start: { light: "#dcfce7", dark: "#052e16" },
  goal: { light: "#fce7f3", dark: "#500724" },
};

const CELL_BORDERS: Record<CellType, { light: string; dark: string }> = {
  empty: { light: "#e2e8f0", dark: "#334155" },
  wall: { light: "#1e293b", dark: "#64748b" },
  item: { light: "#f59e0b", dark: "#b45309" },
  start: { light: "#22c55e", dark: "#16a34a" },
  goal: { light: "#ec4899", dark: "#db2777" },
};

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

  // Build a map for fast lookup
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
      width="100%"
      height="100%"
      className={`max-h-full max-w-full ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* Grid cells */}
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
          const type = getCellType(x, y);
          return (
            <g
              key={`${x}-${y}`}
              onClick={() => onCellClick?.(x, y)}
              className={editMode ? "cursor-pointer" : ""}
            >
              <rect
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                className="cell-bg"
                fill={`var(--cell-${type}-bg, ${CELL_COLORS[type].light})`}
                stroke={`var(--cell-${type}-border, ${CELL_BORDERS[type].light})`}
                strokeWidth={1}
                rx={3}
              />

              {/* Cell icons */}
              {type === "item" && (
                <text
                  x={x * cellSize + cellSize / 2}
                  y={y * cellSize + cellSize / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={cellSize * 0.5}
                >
                  &#11088;
                </text>
              )}
              {type === "goal" && (
                <text
                  x={x * cellSize + cellSize / 2}
                  y={y * cellSize + cellSize / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={cellSize * 0.5}
                >
                  &#127937;
                </text>
              )}
              {type === "start" && !editMode && (
                <text
                  x={x * cellSize + cellSize / 2}
                  y={y * cellSize + cellSize / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={cellSize * 0.3}
                  fill="#16a34a"
                  fontWeight="bold"
                >
                  S
                </text>
              )}
              {type === "wall" && (
                <rect
                  x={x * cellSize + 4}
                  y={y * cellSize + 4}
                  width={cellSize - 8}
                  height={cellSize - 8}
                  fill={CELL_COLORS.wall.light}
                  rx={4}
                  className="dark:fill-slate-500"
                />
              )}

              {/* Edit mode hover effect */}
              {editMode && (
                <rect
                  x={x * cellSize}
                  y={y * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="transparent"
                  className="hover:fill-indigo-500/10"
                  rx={3}
                />
              )}
            </g>
          );
        })
      )}

      {/* Trail path */}
      {!editMode && state.trail && state.trail.length > 1 && (
        <polyline
          points={state.trail
            .map((t) => `${t.x * cellSize + cellSize / 2},${t.y * cellSize + cellSize / 2}`)
            .join(" ")}
          fill="none"
          stroke={state.goalReached ? "#22c55e" : "#818cf8"}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={state.goalReached ? "none" : "6 4"}
          opacity={0.6}
        />
      )}

      {/* Trail dots */}
      {!editMode && state.trail && state.trail.map((t, i) => (
        i > 0 && (
          <circle
            key={`trail-${i}`}
            cx={t.x * cellSize + cellSize / 2}
            cy={t.y * cellSize + cellSize / 2}
            r={3}
            fill={state.goalReached ? "#22c55e" : "#818cf8"}
            opacity={0.5}
          />
        )
      ))}

      {/* Robot */}
      {!editMode && (
        <g
          className={state.lastCollision ? "robot-shake" : ""}
          style={{
            transition: "transform 0.25s ease-in-out",
            transform: `translate(${robot.x * cellSize + cellSize / 2}px, ${robot.y * cellSize + cellSize / 2}px)`,
          }}
        >
          <g
            style={{
              transition: "transform 0.2s ease-in-out",
              transform: `rotate(${DIRECTION_ROTATION[robot.direction]}deg)`,
            }}
          >
            {/* Robot body */}
            <circle
              r={cellSize * 0.35}
              fill={state.lastCollision ? "#ef4444" : "#6366f1"}
              stroke={state.lastCollision ? "#dc2626" : "#4f46e5"}
              strokeWidth={2}
              style={{ transition: "fill 0.2s, stroke 0.2s" }}
            />
            {/* Direction indicator (arrow) */}
            <polygon
              points={`${cellSize * 0.2},0 ${-cellSize * 0.1},${-cellSize * 0.15} ${-cellSize * 0.1},${cellSize * 0.15}`}
              fill="white"
              opacity={0.9}
            />
            {/* Eyes */}
            <circle
              cx={cellSize * 0.05}
              cy={-cellSize * 0.1}
              r={cellSize * 0.06}
              fill="white"
            />
            <circle
              cx={cellSize * 0.05}
              cy={cellSize * 0.1}
              r={cellSize * 0.06}
              fill="white"
            />
          </g>
        </g>
      )}

      {/* Animations */}
      <style>{`
        @media (prefers-color-scheme: dark) { .cell-bg { opacity: 0.9; } }
        .dark .cell-bg { opacity: 0.9; }
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
