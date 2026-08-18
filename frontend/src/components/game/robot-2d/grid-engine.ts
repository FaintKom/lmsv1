/**
 * The shape of a level as the renderer needs it — and nothing else.
 *
 * This file used to hold the rules: what a wall does, when an item counts as
 * collected, whether the level was won. Those now live once, in
 * `backend/app/exercises/robot_sim.py`, which runs both inside the sandbox and
 * on the server. Keeping a second copy here is how the two came to disagree —
 * the browser's `while` never re-read its condition, and the browser's idea of
 * "collected" was a counter a program could drive back down by putting an item
 * down again.
 *
 * What remains is a projection: given a level and the frames the server sent,
 * what does the grid look like at frame N? No decisions, only arithmetic.
 */

import type { Frame } from "@/components/game/engine/trace-player";

export type CellType = "empty" | "wall" | "item" | "start" | "goal";
export type Direction = "up" | "right" | "down" | "left";

export interface Cell {
  x: number;
  y: number;
  type: CellType;
  /** This floor is meant to be painted. */
  mark?: boolean;
  /** This floor carries a number `read()` returns. */
  value?: number;
  /** Run state, never stored on the level — a cell starts every run unpainted. */
  painted?: boolean;
}

export interface RobotState {
  x: number;
  y: number;
  direction: Direction;
  collected: number;
  inventory: string[];
}

export interface TrailPoint {
  x: number;
  y: number;
  /** False where the world refused — the trail shows where the robot bumped. */
  success: boolean;
}

export interface GridState {
  width: number;
  height: number;
  cells: Cell[];
  robot: RobotState;
  totalItems: number;
  goalReached: boolean;
  stepsUsed: number;
  trail: TrailPoint[];
  /** Drives the shake. True when the last command was refused. */
  lastCollision: boolean;
}

/** The level as the pupil finds it, before their program runs. */
export function initialState(config: Record<string, unknown>): GridState {
  const width = (config.grid_width as number) || 5;
  const height = (config.grid_height as number) || 5;
  const cells = ((config.cells as Cell[]) || []).map((c) => ({ ...c }));
  const start = (config.start as { x?: number; y?: number; facing?: Direction }) || {};
  const x = start.x ?? 0;
  const y = start.y ?? 0;

  return {
    width,
    height,
    cells,
    robot: {
      x,
      y,
      direction: start.facing ?? "right",
      collected: 0,
      inventory: [],
    },
    totalItems: cells.filter((c) => c.type === "item").length,
    goalReached: false,
    stepsUsed: 0,
    trail: [{ x, y, success: true }],
    lastCollision: false,
  };
}

/**
 * The grid after the first `count` frames.
 *
 * Rebuilt from the level each time rather than mutated forward, so scrubbing
 * backwards costs the same as scrubbing forwards and cannot drift. A level is at
 * most ten by ten under a step cap; this is cheap enough not to be worth being
 * clever about.
 */
export function stateAt(
  config: Record<string, unknown>,
  frames: Frame[],
  count: number,
  won = false,
): GridState {
  const state = initialState(config);
  const shown = frames.slice(0, Math.max(0, count));

  for (const frame of shown) {
    for (const change of frame.cells) {
      applyChange(state, change);
    }

    state.robot.x = frame.x;
    state.robot.y = frame.y;
    state.robot.direction = frame.facing;
    state.robot.collected = state.totalItems - frame.items_left;
    state.stepsUsed = frame.i + 1;
    state.lastCollision = !frame.ok;
    state.trail.push({ x: frame.x, y: frame.y, success: frame.ok });
  }

  state.goalReached = won && frames.length > 0 && shown.length === frames.length;
  return state;
}

function applyChange(state: GridState, change: Frame["cells"][number]) {
  const at = state.cells.find((c) => c.x === change.x && c.y === change.y);
  const cell: Cell = at ?? { x: change.x, y: change.y, type: "empty" };
  if (!at) state.cells.push(cell);

  if (change.item !== undefined) cell.type = change.item ? "item" : "empty";
  if (change.painted !== undefined) cell.painted = change.painted;
  if (change.value !== undefined) cell.value = change.value;
}
