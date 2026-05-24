"use client";

/**
 * SkillGraphV2 — roadmap.sh-style node graph of a student's skill path.
 *
 * Methodist supplies positioned `nodes` (with x,y in graph units 0-100)
 * and `edges` between them. Component renders a responsive SVG with
 * curved bezier edges between nodes, per-node status styling
 * (locked / available / in-progress / mastered), and click → callback.
 *
 * Pure SVG, no third-party graph lib — keeps bundle slim and gives
 * exact control over the visual language. Uses project design tokens
 * (var(--green-*) / var(--sun-*) / var(--ink-*)).
 *
 * Inspired by roadmap.sh (6th-most-starred GitHub project).
 */

import { useState } from "react";

export type SkillStatus =
  | "locked"
  | "available"
  | "in-progress"
  | "mastered";

export interface SkillNode {
  id: string;
  label: string;
  /** 0–100 x position in graph coords. */
  x: number;
  /** 0–100 y position in graph coords. */
  y: number;
  status: SkillStatus;
  /** 0–1 mastery (only for in-progress). */
  mastery?: number;
  /** Optional category tag for grouping color. */
  category?: string;
  /** Optional short subtitle (level, XP, etc.). */
  sub?: string;
}

export interface SkillEdge {
  from: string;
  to: string;
}

export interface SkillGraphV2Props {
  nodes: SkillNode[];
  edges: SkillEdge[];
  /** Called when student clicks an unlocked node. */
  onNodeClick?: (node: SkillNode) => void;
  /** Optional title shown above the canvas. */
  title?: string;
  /** Optional category → color override map. */
  categoryColors?: Record<string, string>;
  /** SVG aspect ratio. Default "16 / 10". */
  aspectRatio?: string;
}

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  programming: "var(--green-500)",
  math: "var(--sun-400)",
  language: "var(--coral-400)",
  science: "#3b82f6",
  other: "var(--ink-400)",
};

interface NodeStyle {
  bg: string;
  border: string;
  text: string;
  shadow: string;
  pulse: boolean;
}

function styleFor(
  status: SkillStatus,
  category: string | undefined,
  categoryColors: Record<string, string>
): NodeStyle {
  const catColor = categoryColors[category ?? "other"] ?? "var(--ink-400)";
  switch (status) {
    case "mastered":
      return {
        bg: "var(--green-600)",
        border: "var(--green-700)",
        text: "#fff",
        shadow: "var(--green-800)",
        pulse: false,
      };
    case "in-progress":
      return {
        bg: "var(--green-50)",
        border: catColor,
        text: "var(--ink-900)",
        shadow: catColor,
        pulse: false,
      };
    case "available":
      return {
        bg: "var(--paper-2)",
        border: catColor,
        text: "var(--ink-900)",
        shadow: catColor,
        pulse: true,
      };
    case "locked":
    default:
      return {
        bg: "var(--ink-50)",
        border: "var(--ink-200)",
        text: "var(--ink-400)",
        shadow: "var(--ink-200)",
        pulse: false,
      };
  }
}

const VIEW_W = 800;
const VIEW_H = 500;
const NODE_W = 120;
const NODE_H = 56;

export function SkillGraphV2({
  nodes,
  edges,
  onNodeClick,
  title,
  categoryColors = DEFAULT_CATEGORY_COLORS,
  aspectRatio = "16 / 10",
}: SkillGraphV2Props) {
  const [hover, setHover] = useState<string | null>(null);

  const toPx = (x: number, y: number) => ({
    cx: (x / 100) * (VIEW_W - NODE_W) + NODE_W / 2,
    cy: (y / 100) * (VIEW_H - NODE_H) + NODE_H / 2,
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Bezier control points for a smooth curve between two nodes.
  const edgePath = (from: SkillNode, to: SkillNode): string => {
    const a = toPx(from.x, from.y);
    const b = toPx(to.x, to.y);
    const dx = b.cx - a.cx;
    const cp1x = a.cx + dx * 0.5;
    const cp1y = a.cy;
    const cp2x = a.cx + dx * 0.5;
    const cp2y = b.cy;
    return `M ${a.cx} ${a.cy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${b.cx} ${b.cy}`;
  };

  return (
    <div
      style={{
        width: "100%",
        background: "var(--paper-2)",
        border: "2px solid var(--ink-100)",
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      {title && (
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--ink-100)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-500)",
            fontWeight: 600,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ position: "relative", width: "100%", aspectRatio }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {/* edges first so they sit under nodes */}
          {edges.map((e, i) => {
            const from = nodeMap.get(e.from);
            const to = nodeMap.get(e.to);
            if (!from || !to) return null;
            const isUnlocked =
              from.status === "mastered" || to.status !== "locked";
            return (
              <path
                key={i}
                d={edgePath(from, to)}
                fill="none"
                stroke={isUnlocked ? "var(--green-300)" : "var(--ink-200)"}
                strokeWidth="2.5"
                strokeDasharray={isUnlocked ? "0" : "5 4"}
                opacity={isUnlocked ? 0.9 : 0.5}
              />
            );
          })}
          {/* nodes */}
          {nodes.map((n) => {
            const s = styleFor(n.status, n.category, categoryColors);
            const { cx, cy } = toPx(n.x, n.y);
            const x = cx - NODE_W / 2;
            const y = cy - NODE_H / 2;
            const isClickable = n.status !== "locked" && !!onNodeClick;
            const isHover = hover === n.id;
            return (
              <g
                key={n.id}
                onClick={() => isClickable && onNodeClick?.(n)}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: isClickable ? "pointer" : "default" }}
              >
                {s.pulse && (
                  <rect
                    x={x - 4}
                    y={y - 4}
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={14}
                    fill="none"
                    stroke={s.border}
                    strokeWidth="2"
                    opacity="0.4"
                    className="gp-pop"
                  />
                )}
                <rect
                  x={x}
                  y={y + (isHover && isClickable ? 1 : 0)}
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill={s.bg}
                  stroke={s.border}
                  strokeWidth="2.5"
                  filter={`drop-shadow(0 ${isHover && isClickable ? 2 : 3}px 0 ${s.shadow})`}
                  style={{ transition: "all 100ms" }}
                />
                {n.status === "in-progress" && n.mastery !== undefined && (
                  <rect
                    x={x + 4}
                    y={y + NODE_H - 7}
                    width={(NODE_W - 8) * Math.max(0, Math.min(1, n.mastery))}
                    height={3}
                    rx={2}
                    fill="var(--green-600)"
                  />
                )}
                <text
                  x={cx}
                  y={cy - (n.sub ? 4 : 0)}
                  textAnchor="middle"
                  fontFamily="var(--font-sans)"
                  fontSize="13"
                  fontWeight="700"
                  fill={s.text}
                  style={{ pointerEvents: "none" }}
                >
                  {n.label}
                </text>
                {n.sub && (
                  <text
                    x={cx}
                    y={cy + 12}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                    fill={s.text}
                    opacity="0.7"
                    style={{ pointerEvents: "none" }}
                  >
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {/* legend */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid var(--ink-100)",
          display: "flex",
          gap: 16,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-500)",
          flexWrap: "wrap",
          letterSpacing: "0.06em",
        }}
      >
        {(
          [
            ["mastered", "var(--green-600)"],
            ["in-progress", "var(--green-50)"],
            ["available", "var(--paper-2)"],
            ["locked", "var(--ink-50)"],
          ] as const
        ).map(([label, bg]) => (
          <span
            key={label}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 14,
                height: 10,
                borderRadius: 3,
                background: bg,
                border:
                  bg === "var(--paper-2)" || bg === "var(--ink-50)"
                    ? "1px solid var(--ink-200)"
                    : "none",
              }}
            />
            {label.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
