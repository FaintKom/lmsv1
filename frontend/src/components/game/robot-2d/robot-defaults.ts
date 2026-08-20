/**
 * The level the editor draws, written down.
 *
 * The editor filled its gaps at render time — a 5×5 grid, a robot in the
 * corner, "reach the goal" — and wrote none of it to the config. What the
 * teacher saw and what the level actually contained were two different
 * things, and only the second one travelled.
 *
 * The cost was not cosmetic. `evaluate()` returns false for a level with no
 * win expression, so the solver searched a level nobody could finish and
 * answered «No path to the goal.» about a level whose path was four moves
 * long. A start nobody wrote left the robot off the grid entirely.
 *
 * Anything the teacher has set is kept as it is; only what is absent is
 * filled.
 */

import type { Direction } from "./grid-engine";

export interface RobotStart {
  x: number;
  y: number;
  facing: Direction;
}

export const ROBOT_DEFAULTS = {
  grid_width: 5,
  grid_height: 5,
  start: { x: 0, y: 0, facing: "right" as Direction },
  win: { cond: "at_goal" },
  max_steps: 500,
} as const;

/** The config with the editor's visible defaults made explicit. */
export function withRobotDefaults(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ...config,
    grid_width: (config.grid_width as number) || ROBOT_DEFAULTS.grid_width,
    grid_height: (config.grid_height as number) || ROBOT_DEFAULTS.grid_height,
    start: (config.start as RobotStart) || { ...ROBOT_DEFAULTS.start },
    win: (config.win as Record<string, unknown>) || { ...ROBOT_DEFAULTS.win },
    max_steps: (config.max_steps as number) ?? ROBOT_DEFAULTS.max_steps,
  };
}

/** Does the config already say all of it, so nothing needs writing? */
export function robotDefaultsApplied(config: Record<string, unknown>): boolean {
  return (
    !!config.grid_width &&
    !!config.grid_height &&
    !!config.start &&
    !!config.win &&
    config.max_steps != null
  );
}
