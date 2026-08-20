/**
 * The level the 3D editor draws, written down.
 *
 * The twin of `robot-2d/robot-defaults.ts`, and here for the same reason: a
 * 6×6 floor, a robot at the origin facing north, and "reach the goal" were
 * filled in at render time and written nowhere. Checking prod after the 2D
 * fix shipped found «Cross the platforms to the flag» saved without `win` —
 * and a level with no win expression cannot be finished by anybody, because
 * `evaluate()` answers false for all of them.
 *
 * The keys differ from the 2D level (a floor has a depth, and facing is a
 * compass point), so the two lists stay separate rather than sharing a
 * clever base.
 */

import type { Direction3D } from "./scene-engine";

export interface WorldStart {
  x: number;
  y: number;
  z: number;
  facing: Direction3D;
}

export const WORLD_DEFAULTS = {
  grid_width: 6,
  grid_depth: 6,
  start: { x: 0, y: 0, z: 0, facing: "north" as Direction3D },
  win: { cond: "at_goal" },
  max_steps: 500,
} as const;

/** The config with the editor's visible defaults made explicit. */
export function withWorldDefaults(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ...config,
    grid_width: (config.grid_width as number) || WORLD_DEFAULTS.grid_width,
    grid_depth: (config.grid_depth as number) || WORLD_DEFAULTS.grid_depth,
    start: (config.start as WorldStart) || { ...WORLD_DEFAULTS.start },
    win: (config.win as Record<string, unknown>) || { ...WORLD_DEFAULTS.win },
    max_steps: (config.max_steps as number) ?? WORLD_DEFAULTS.max_steps,
  };
}

/** Does the config already say all of it, so nothing needs writing? */
export function worldDefaultsApplied(config: Record<string, unknown>): boolean {
  return (
    !!config.grid_width &&
    !!config.grid_depth &&
    !!config.start &&
    !!config.win &&
    config.max_steps != null
  );
}
