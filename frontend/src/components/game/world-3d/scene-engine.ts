/**
 * The shape of a 3D level as the renderer needs it — and nothing else.
 *
 * This file used to hold the rules: what blocked a move, how high a jump
 * reached, whether a door was open, whether the level was won. Those now live
 * once, in `backend/app/exercises/world_sim.py`, which runs both inside the
 * sandbox and on the server. Keeping a second copy here is how the two came to
 * disagree — the browser's `while` never re-read its condition, and the
 * browser's idea of "finished" was a flag the page set for itself.
 *
 * What remains is a projection: given a level and the frames the server sent,
 * what does the world look like at frame N? No decisions, only arithmetic.
 *
 * The 2D twin is `robot-2d/grid-engine.ts`, and it is deliberately the same
 * shape.
 */

import type { WorldFrame } from "@/lib/api/exercises";

export type Direction3D = "north" | "east" | "south" | "west";

/** What can stand on a square. `floor` is the absence of everything else. */
export type CellType3D = "floor" | "wall" | "platform" | "item" | "button" | "door" | "goal";

export interface GridCell3D {
  x: number;
  z: number;
  /** Height. Floor is 0. */
  y: number;
  type: CellType3D;
  /** Doors carry one, so a button can name it. */
  id?: string;
  /** Buttons carry the id of the door they open. */
  opens?: string;
  /** Run state, never stored on the level. */
  pressed?: boolean;
  open?: boolean;
}

export interface PlayerState {
  x: number;
  z: number;
  /** The surface the character stands on. */
  y: number;
  direction: Direction3D;
  carrying: number;
  /** What the scene should be animating right now. */
  motion: WorldFrame["motion"];
}

export interface WorldState {
  gridWidth: number;
  gridDepth: number;
  cells: GridCell3D[];
  player: PlayerState;
  totalItems: number;
  itemsLeft: number;
  goalReached: boolean;
  stepsUsed: number;
  /**
   * Why the last command was refused, or null when it was not.
   *
   * A code, never a sentence — `wall`, `edge`, `door_closed`, `too_high` — so
   * each of the six locales says it its own way. It drives the character's bump
   * and the line the pupil reads, and it clears the moment a command succeeds,
   * which is what stops a stale complaint sitting under a moving character.
   */
  refusal: string | null;
}

/** Radians to rotate the character so it faces its direction. */
export const DIRECTION_ANGLE: Record<Direction3D, number> = {
  north: Math.PI,
  east: -Math.PI / 2,
  south: 0,
  west: Math.PI / 2,
};

/** The level as the pupil finds it, before their program runs. */
export function initialState(config: Record<string, unknown>): WorldState {
  const gridWidth = (config.grid_width as number) || 6;
  const gridDepth = (config.grid_depth as number) || 6;
  const cells = ((config.cells as GridCell3D[]) || []).map((c) => ({ ...c, y: c.y ?? 0 }));
  const start = (config.start as { x?: number; z?: number; y?: number; facing?: Direction3D }) || {};
  const x = start.x ?? 0;
  const z = start.z ?? 0;

  const totalItems = cells.filter((c) => c.type === "item").length;

  return {
    gridWidth,
    gridDepth,
    cells,
    player: {
      x,
      z,
      y: start.y ?? surfaceAt(cells, x, z),
      direction: start.facing ?? "north",
      carrying: 0,
      motion: "none",
    },
    totalItems,
    itemsLeft: totalItems,
    goalReached: false,
    stepsUsed: 0,
    refusal: null,
  };
}

/**
 * The world after the first `count` frames.
 *
 * Rebuilt from the level each time rather than mutated forward, so scrubbing
 * backwards costs the same as scrubbing forwards and cannot drift. A level is at
 * most ten by ten under a step cap; this is cheap enough not to be worth being
 * clever about.
 */
export function stateAt(
  config: Record<string, unknown>,
  frames: WorldFrame[],
  count: number,
  won = false,
): WorldState {
  const state = initialState(config);
  const shown = frames.slice(0, Math.max(0, count));

  for (const frame of shown) {
    for (const change of frame.cells) {
      applyChange(state, change);
    }

    state.player.x = frame.x;
    state.player.z = frame.z;
    state.player.y = frame.y;
    state.player.direction = frame.facing;
    state.player.carrying = frame.carrying;
    state.player.motion = frame.motion;
    state.itemsLeft = frame.items_left;
    state.stepsUsed = frame.i + 1;
    state.refusal = frame.ok ? null : frame.msg;
  }

  state.goalReached = won && frames.length > 0 && shown.length === frames.length;
  return state;
}

/**
 * The height a character stands at on a square: one above the tallest platform
 * there, or the floor when there is none.
 *
 * This is the second implementation of one rule — `surface()` in the server's
 * `world_sim.py` is the other, and the server's is the one that decides
 * outcomes. The copy lives here because the scene has to draw a level before
 * any program has run: the teacher's preview redraws on every brush stroke, and
 * asking the server for the shape of a level would put a round trip inside a
 * drag.
 *
 * The two drifting apart would be invisible — a scene that draws a level
 * differently from the way it is graded is a level that lies to the pupil — so
 * a test replays a server trace here and compares the heights step by step.
 * Change one of these and change the other.
 */
export function surfaceAt(cells: GridCell3D[], x: number, z: number): number {
  const tops = cells.filter((c) => c.type === "platform" && c.x === x && c.z === z).map((c) => c.y);
  return tops.length > 0 ? Math.max(...tops) + 1 : 0;
}

function applyChange(state: WorldState, change: WorldFrame["cells"][number]) {
  if (change.item !== undefined) {
    if (change.item) {
      state.cells.push({ x: change.x, z: change.z, y: change.y, type: "item" });
    } else {
      const at = state.cells.findIndex(
        (c) => c.type === "item" && c.x === change.x && c.z === change.z,
      );
      if (at >= 0) state.cells.splice(at, 1);
    }
  }

  if (change.pressed !== undefined) {
    const button = state.cells.find(
      (c) => c.type === "button" && c.x === change.x && c.z === change.z,
    );
    if (button) button.pressed = change.pressed;
  }

  if (change.open !== undefined) {
    const door = state.cells.find((c) => c.type === "door" && c.x === change.x && c.z === change.z);
    if (door) door.open = change.open;
  }
}
