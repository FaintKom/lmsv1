"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n/context";
import type { GridState, CellType, Direction } from "./grid-engine";

interface GridRendererProps {
 state: GridState;
 cellSize?: number;
 editMode?: boolean;
 activeTool?: CellType;
 /** Fired when the pointer goes down on a cell — the first cell of a drag. */
 onCellPress?: (x: number, y: number) => void;
 /** Fired as the pointer crosses a cell, so the editor can paint by dragging. */
 onCellEnter?: (x: number, y: number) => void;
 className?: string;
}

const DIRECTION_ROTATION: Record<Direction, number> = {
 up: -90, right: 0, down: 90, left: 180,
};

/** Fill for each paint colour; colourless paint keeps the original violet. */
const PAINT_FILL: Record<string, string> = {
 red: "#ef4444", green: "#22c55e", blue: "#3b82f6", yellow: "#eab308",
};

/** Outline tint for a mark that demands a colour. */
const MARK_STROKE: Record<string, string> = {
 red: "#dc2626", green: "#16a34a", blue: "#2563eb", yellow: "#ca8a04",
};

/**
 * What each item kind looks like — drawings we ship, not emoji.
 *
 * An emoji here is a character the machine draws with whatever font it has:
 * a different gem on Windows than on a Mac, an empty box where no emoji font
 * is installed. These are paths, so every pupil sees the same square.
 */
const KIND_SPRITE: Record<string, React.ReactNode> = {
 gem: <path d="M6 3h12l4 6-10 12L2 9Z" />,
 key: (
 <>
 <circle cx="7.5" cy="15.5" r="5.5" />
 <path d="m21 2-9.6 9.6" />
 <path d="m15.5 7.5 3 3L22 7l-3-3" />
 </>
 ),
 apple: (
 <>
 <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
 <path d="M10 2c1 .5 2 2 2 5" />
 </>
 ),
 flag: (
 <>
 <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" />
 <path d="M4 22v-7" />
 </>
 ),
 star: (
 <path d="M11.5 2.9a.6.6 0 0 1 1 0l2.4 4.9 5.4.8c.5.1.7.7.3 1l-3.9 3.8.9 5.4c.1.5-.4.9-.9.6L12 16.9l-4.8 2.5c-.4.3-1-.1-.9-.6l.9-5.4-3.9-3.8c-.4-.3-.2-.9.3-1l5.4-.8Z" />
 ),
};

export default function GridRenderer({
 state, cellSize = 56, editMode = false, activeTool, onCellPress, onCellEnter, className = "",
}: GridRendererProps) {
 const { t } = useTranslation();
 const { width, height, cells, robot } = state;
 const pad = 8; // outer padding
 const gap = 3;
 const cs = cellSize;
 const svgWidth = width * cs + pad * 2;
 const svgHeight = height * cs + pad * 2;

 const cellMap = useMemo(() => {
 const map = new Map<string, CellType>();
 for (const cell of cells) map.set(`${cell.x},${cell.y}`, cell.type);
 return map;
 }, [cells]);

 const getCellType = (x: number, y: number): CellType => cellMap.get(`${x},${y}`) || "empty";

 // A second map, by position, for what a cell carries besides its type: a mark
 // to be painted, the paint itself, a number. The frames have carried these
 // since the runner shipped; the grid simply was not drawing them.
 const detailMap = useMemo(() => {
 const map = new Map<string, {
 mark?: boolean; markColor?: string; painted?: boolean;
 paintColor?: string | null; kind?: string; value?: number;
 }>();
 for (const cell of cells) {
 if (cell.mark || cell.painted || cell.kind || cell.value !== undefined) {
 map.set(`${cell.x},${cell.y}`, {
 mark: cell.mark, markColor: cell.mark_color, painted: cell.painted,
 paintColor: cell.paintColor, kind: cell.kind, value: cell.value,
 });
 }
 }
 return map;
 }, [cells]);

 return (
 <svg
 viewBox={`0 0 ${svgWidth} ${svgHeight}`}
 className={`block ${className}`}
 style={{ width: "100%", height: "100%", maxWidth: svgWidth, maxHeight: svgHeight, objectFit: "contain" }}
 preserveAspectRatio="xMidYMid meet"
 >
 <defs>
 <filter id="tileShd" x="-2%" y="-2%" width="104%" height="108%">
 <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#00000020" />
 </filter>
 <filter id="wallShd" x="-2%" y="-2%" width="104%" height="108%">
 <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000030" />
 </filter>
 <filter id="robotGlow" x="-30%" y="-30%" width="160%" height="160%">
 <feGaussianBlur stdDeviation="4" result="b" />
 <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
 </filter>
 <radialGradient id="starGlow"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" /><stop offset="100%" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
 <radialGradient id="goalGlow"><stop offset="0%" stopColor="#34d399" stopOpacity="0.5" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></radialGradient>
 {/* Parchment-style grid background */}
 <pattern id="gridDots" width={cs} height={cs} patternUnits="userSpaceOnUse" x={pad} y={pad}>
 <circle cx={cs / 2} cy={cs / 2} r="0.8" fill="#c4b5a0" opacity="0.4" />
 </pattern>
 </defs>

 {/* Board background — warm parchment */}
 <rect x={0} y={0} width={svgWidth} height={svgHeight} rx={12}
 fill="#f5f0e8" className="" />
 <rect x={0} y={0} width={svgWidth} height={svgHeight} rx={12} fill="url(#gridDots)" />
 {/* Board border — subtle inset */}
 <rect x={1} y={1} width={svgWidth - 2} height={svgHeight - 2} rx={11}
 fill="none" stroke="#d4c9b8" strokeWidth={1.5} className="" />

 {/* Grid cells */}
 {Array.from({ length: height }, (_, y) =>
 Array.from({ length: width }, (_, x) => {
 const type = getCellType(x, y);
 const cx = pad + x * cs + gap / 2;
 const cy = pad + y * cs + gap / 2;
 const cw = cs - gap;
 const center_x = pad + x * cs + cs / 2;
 const center_y = pad + y * cs + cs / 2;

 return (
 <g key={`${x}-${y}`} data-cell={`${x},${y}`} onPointerDown={() => onCellPress?.(x, y)}
 onPointerEnter={() => onCellEnter?.(x, y)}
 className={editMode ? "cursor-pointer" : ""}>

 {type === "wall" ? (
 /* Wall — dark stone block with 3D depth */
 <g filter="url(#wallShd)">
 <rect x={cx} y={cy} width={cw} height={cw} rx={5}
 fill="#5c6370" className="" />
 <rect x={cx} y={cy} width={cw} height={cw * 0.92} rx={5}
 fill="#6b7280" className="" />
 {/* Brick lines */}
 <line x1={cx + 4} y1={cy + cw * 0.33} x2={cx + cw - 4} y2={cy + cw * 0.33}
 stroke="#5c6370" strokeWidth={1} opacity={0.5} className="" />
 <line x1={cx + 4} y1={cy + cw * 0.63} x2={cx + cw - 4} y2={cy + cw * 0.63}
 stroke="#5c6370" strokeWidth={1} opacity={0.5} className="" />
 <line x1={cx + cw / 2} y1={cy + cw * 0.33} x2={cx + cw / 2} y2={cy + cw * 0.63}
 stroke="#5c6370" strokeWidth={1} opacity={0.4} className="" />
 </g>
 ) : (
 /* Empty/start/item/goal — light tile with subtle shadow */
 <rect x={cx} y={cy} width={cw} height={cw} rx={5}
 fill="#fefcf7" stroke="#e8dfd2" strokeWidth={0.8} filter="url(#tileShd)"
 className=" " />
 )}

 {/* Paint, and the squares asking for it */}
 {(() => {
 const detail = detailMap.get(`${x},${y}`);
 if (!detail || type === "wall") return null;
 return (
 <g>
 {detail.painted && (
 <rect x={cx} y={cy} width={cw} height={cw} rx={5}
 fill={PAINT_FILL[detail.paintColor ?? ""] ?? "#a78bfa"} opacity={0.55} />
 )}
 {detail.mark && !detail.painted && (
 <rect x={cx + 3} y={cy + 3} width={cw - 6} height={cw - 6} rx={4}
 fill="none" stroke={MARK_STROKE[detail.markColor ?? ""] ?? "#8b5cf6"}
 strokeWidth={detail.markColor ? 2.2 : 1.6} strokeDasharray="4 3" />
 )}
 {detail.value !== undefined && (
 <text x={center_x} y={center_y + 1} textAnchor="middle" dominantBaseline="central"
 fontSize={cs * 0.34} fontWeight="bold" fill="#0f766e" className="select-none">
 {detail.value}
 </text>
 )}
 </g>
 );
 })()}

 {/* Star collectible */}
 {type === "item" && (
 <g>
 <circle cx={center_x} cy={center_y} r={cs * 0.35} fill="url(#starGlow)" />
 {/* A 24-unit icon scaled into the cell and centred on it. */}
 <g
 transform={`translate(${center_x - cs * 0.24}, ${center_y - cs * 0.24}) scale(${(cs * 0.48) / 24})`}
 fill="none"
 stroke="#b45309"
 strokeWidth={2}
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 {KIND_SPRITE[detailMap.get(`${x},${y}`)?.kind ?? ""] ?? KIND_SPRITE.star}
 </g>
 </g>
 )}

 {/* Goal flag */}
 {type === "goal" && (
 <g>
 <circle cx={center_x} cy={center_y} r={cs * 0.4} fill="url(#goalGlow)" />
 {/* Flag pole */}
 <line x1={center_x - cs * 0.1} y1={center_y - cs * 0.28}
 x2={center_x - cs * 0.1} y2={center_y + cs * 0.25}
 stroke="#059669" strokeWidth={2.5} strokeLinecap="round" />
 {/* Flag */}
 <path d={`M ${center_x - cs * 0.1} ${center_y - cs * 0.28}
 L ${center_x + cs * 0.22} ${center_y - cs * 0.16}
 L ${center_x - cs * 0.1} ${center_y - cs * 0.04} Z`}
 fill="#10b981" />
 </g>
 )}

 {/* Edit hover */}
 {editMode && (
 <rect x={cx} y={cy} width={cw} height={cw} rx={5}
 fill="transparent" className="hover:fill-green-500/10" />
 )}
 </g>
 );
 })
 )}

 {/* Where the robot begins.
 *
 * Drawn from the robot's own position, which the level's `start` sets. It
 * used to be drawn on a cell of type "start", and the start stopped being a
 * cell when the level schema changed — so a teacher pressing Start moved the
 * start correctly and then watched nothing happen. There is no robot in edit
 * mode either, and this stands in for it. */}
 {editMode && (
 <g data-start={`${robot.x},${robot.y}`}
 transform={`translate(${pad + robot.x * cs + cs / 2}, ${pad + robot.y * cs + cs / 2})`}>
 <circle r={cs * 0.3} fill="#059669" opacity={0.18} />
 <circle r={cs * 0.3} fill="none" stroke="#059669" strokeWidth={1.5} opacity={0.7} />
 {/* The facing the teacher chose, visible before anything runs. */}
 <g transform={`rotate(${DIRECTION_ROTATION[robot.direction]})`}>
 <path d={`M 0 ${-cs * 0.2} L ${cs * 0.11} ${cs * 0.03} L ${-cs * 0.11} ${cs * 0.03} Z`}
 fill="#059669" />
 </g>
 <text y={cs * 0.3} textAnchor="middle" dominantBaseline="central"
 fontSize={cs * 0.18} fill="#059669" fontWeight="bold"
 className="select-none">{t("game.start")}</text>
 </g>
 )}

 {/* Trail path */}
 {!editMode && state.trail && state.trail.length > 1 && (
 <polyline
 points={state.trail.map((t) =>
 `${pad + t.x * cs + cs / 2},${pad + t.y * cs + cs / 2}`).join(" ")}
 fill="none"
 stroke={state.goalReached ? "#34d399" : "#fbbf24"}
 strokeWidth={4}
 strokeLinecap="round"
 strokeLinejoin="round"
 opacity={0.6}
 strokeDasharray={state.goalReached ? "none" : "8 6"}
 />
 )}

 {/* Trail dots */}
 {!editMode && state.trail && state.trail.map((t, i) => (
 i > 0 && (
 <circle key={`trail-${i}`}
 cx={pad + t.x * cs + cs / 2} cy={pad + t.y * cs + cs / 2} r={3}
 fill={state.goalReached ? "#34d399" : "#fbbf24"} opacity={0.7} />
 )
 ))}

 {/* Robot character */}
 {!editMode && (
 <g
 className={state.collision !== null ? "robot-shake" : ""}
 style={{
 transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
 transform: `translate(${pad + robot.x * cs + cs / 2}px, ${pad + robot.y * cs + cs / 2}px)`,
 }}
 >
 <g style={{
 transition: "transform 0.25s ease-out",
 transform: `rotate(${DIRECTION_ROTATION[robot.direction]}deg)`,
 }}>
 {/* Shadow */}
 <ellipse rx={cs * 0.26} ry={cs * 0.07} cy={cs * 0.3} fill="black" opacity={0.12} />

 {/* Body outer ring */}
 <circle r={cs * 0.34}
 fill={state.collision !== null ? "#ef4444" : "#4C97FF"}
 filter="url(#robotGlow)"
 style={{ transition: "fill 0.3s" }} />

 {/* Body inner (lighter) */}
 <circle r={cs * 0.28}
 fill={state.collision !== null ? "#f87171" : "#6bb3ff"} />

 {/* Visor / face area */}
 <ellipse rx={cs * 0.22} ry={cs * 0.16} cy={-cs * 0.02}
 fill="white" opacity={0.9} />

 {/* Eyes */}
 <circle cx={-cs * 0.08} cy={-cs * 0.05} r={cs * 0.065} fill="#1e3a5f" />
 <circle cx={cs * 0.08} cy={-cs * 0.05} r={cs * 0.065} fill="#1e3a5f" />
 {/* Pupils */}
 <circle cx={-cs * 0.065} cy={-cs * 0.065} r={cs * 0.025} fill="white" />
 <circle cx={cs * 0.095} cy={-cs * 0.065} r={cs * 0.025} fill="white" />

 {/* Mouth — changes with state */}
 {state.goalReached ? (
 <path d={`M ${-cs * 0.09} ${cs * 0.06} Q 0 ${cs * 0.16} ${cs * 0.09} ${cs * 0.06}`}
 fill="none" stroke="#1e3a5f" strokeWidth={2} strokeLinecap="round" />
 ) : state.collision !== null ? (
 <ellipse cy={cs * 0.08} rx={cs * 0.04} ry={cs * 0.05} fill="#1e3a5f" />
 ) : (
 <path d={`M ${-cs * 0.06} ${cs * 0.06} Q 0 ${cs * 0.11} ${cs * 0.06} ${cs * 0.06}`}
 fill="none" stroke="#1e3a5f" strokeWidth={1.5} strokeLinecap="round" />
 )}

 {/* Direction arrow */}
 <polygon
 points={`${cs * 0.32},0 ${cs * 0.24},-${cs * 0.06} ${cs * 0.24},${cs * 0.06}`}
 fill="white" opacity={0.8} />
 </g>
 </g>
 )}

 {/* Animations */}
 <style>{`
 @keyframes shake {
 0%, 100% { transform: translate(0, 0); }
 20% { transform: translate(-4px, 0); }
 40% { transform: translate(4px, 0); }
 60% { transform: translate(-3px, 0); }
 80% { transform: translate(3px, 0); }
 }
 .robot-shake { animation: shake 0.4s ease-in-out; }
 `}</style>
 </svg>
 );
}
