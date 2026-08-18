"use client";

/**
 * The teacher's side of a robot level.
 *
 * The command palette is the point of this file. A level stores one list of
 * commands, and that list drives the block palette, the Python autocompletion
 * and the starter header a pupil reads. Before this, the editor offered the
 * same choice, saved it as `available_blocks`, and nothing ever read it — every
 * pupil got one of three preset lists regardless of what their teacher picked.
 *
 * Strings here are still English. This file is on the i18n allowlist and comes
 * off it once the Check button and the win builder stop rewriting it.
 */

import { useCallback, useMemo, useState } from "react";
import { Box, Eraser, Flag, Play as PlayIcon, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import GridRenderer from "./grid-renderer";
import { initialState, type Cell, type CellType, type Direction } from "./grid-engine";

interface Robot2DEditorProps {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

/** What a teacher paints onto the grid. `start` is not a cell — it has its own field. */
type Tool = CellType | "start";

const CELL_TOOLS: { type: Tool; label: string; icon: typeof Box }[] = [
  { type: "empty", label: "Erase", icon: Eraser },
  { type: "wall", label: "Wall", icon: Box },
  { type: "item", label: "Item", icon: Star },
  { type: "goal", label: "Goal", icon: Flag },
  { type: "start", label: "Start", icon: PlayIcon },
];

/**
 * The whole vocabulary, grouped as a teacher thinks about it.
 *
 * Control flow is deliberately absent: `for`, `while` and `if` are Python, not
 * something a level grants. A level withholds `paint`, never `if`.
 */
const COMMAND_GROUPS: { title: string; hint: string; commands: string[] }[] = [
  {
    title: "Move by direction",
    hint: "The first lesson — a child who knows up from left can use these.",
    commands: ["move_up", "move_down", "move_left", "move_right"],
  },
  {
    title: "Move by facing",
    hint: "The robot has a direction to keep track of. Sensors need these.",
    commands: ["move_forward", "turn_left", "turn_right"],
  },
  {
    title: "Items and paint",
    hint: "",
    commands: ["take", "drop", "paint"],
  },
  {
    title: "Numbers",
    hint: "A level whose goal involves numbers cannot be checked for a shortest solution.",
    commands: ["read", "write"],
  },
  {
    title: "Ask about the surroundings",
    hint: "Relative to where the robot faces, so these need the facing commands.",
    commands: ["wall_ahead", "item_here", "at_goal", "painted", "value_here"],
  },
];

const FACING_COMMANDS = ["move_forward", "turn_left", "turn_right"];
const SENSORS = ["wall_ahead", "item_here", "at_goal", "painted", "value_here"];

/** Presets fill the boxes and leave them editable. They are not a second record. */
const PRESETS: { label: string; commands: string[] }[] = [
  { label: "First steps", commands: ["move_up", "move_down", "move_left", "move_right"] },
  {
    label: "Facing and loops",
    commands: ["move_forward", "turn_left", "turn_right", "wall_ahead", "at_goal"],
  },
  { label: "Everything", commands: COMMAND_GROUPS.flatMap((g) => g.commands) },
];

const WIN_PRESETS: { label: string; win: Record<string, unknown> }[] = [
  { label: "Reach the goal", win: { cond: "at_goal" } },
  { label: "Collect everything", win: { cond: "all_items_taken" } },
  {
    label: "Reach the goal and collect everything",
    win: { op: "and", of: [{ cond: "at_goal" }, { cond: "all_items_taken" }] },
  },
  { label: "Paint every marked square", win: { cond: "all_marks_painted" } },
];

export default function Robot2DEditor({ config, onConfigChange }: Robot2DEditorProps) {
  const gridWidth = (config.grid_width as number) || 5;
  const gridHeight = (config.grid_height as number) || 5;
  // Memoised because each fallback builds a fresh object, which would make
  // every callback below a new function on every render.
  const cells = useMemo(() => (config.cells as Cell[]) || [], [config.cells]);
  const start = useMemo(
    () =>
      (config.start as { x: number; y: number; facing: Direction }) || {
        x: 0,
        y: 0,
        facing: "right" as Direction,
      },
    [config.start],
  );
  const commands = useMemo(() => (config.commands as string[]) || [], [config.commands]);
  const win = (config.win as Record<string, unknown>) || { cond: "at_goal" };
  const maxSteps = (config.max_steps as number) ?? 500;
  const hints = (config.hints as string[]) || [];

  const [activeTool, setActiveTool] = useState<Tool>("wall");

  const update = useCallback(
    (patch: Record<string, unknown>) => onConfigChange({ ...config, ...patch }),
    [config, onConfigChange],
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (activeTool === "start") {
        update({ start: { ...start, x, y } });
        return;
      }

      const without = cells.filter((c) => !(c.x === x && c.y === y));
      if (activeTool === "empty") {
        update({ cells: without });
        return;
      }
      if (activeTool === "goal") {
        update({ cells: [...without.filter((c) => c.type !== "goal"), { x, y, type: "goal" }] });
        return;
      }
      update({ cells: [...without, { x, y, type: activeTool }] });
    },
    [activeTool, cells, start, update],
  );

  const toggleCommand = useCallback(
    (command: string) => {
      const next = commands.includes(command)
        ? commands.filter((c) => c !== command)
        : [...commands, command];
      update({ commands: next });
    },
    [commands, update],
  );

  const resize = useCallback(
    (width: number, height: number) => {
      const w = clamp(width, 2, 10);
      const h = clamp(height, 2, 10);
      update({
        grid_width: w,
        grid_height: h,
        cells: cells.filter((c) => c.x < w && c.y < h),
        start: { ...start, x: Math.min(start.x, w - 1), y: Math.min(start.y, h - 1) },
      });
    },
    [cells, start, update],
  );

  const problems = findProblems({ cells, start, commands, win });

  return (
    <div className="space-y-6">
      {/* Grid and the goal */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NumberField
          label="Width"
          value={gridWidth}
          min={2}
          max={10}
          onChange={(v) => resize(v, gridHeight)}
        />
        <NumberField
          label="Height"
          value={gridHeight}
          min={2}
          max={10}
          onChange={(v) => resize(gridWidth, v)}
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">Goal</label>
          <select
            value={JSON.stringify(win)}
            onChange={(e) => update({ win: JSON.parse(e.target.value) })}
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
          >
            {WIN_PRESETS.map((preset) => (
              <option key={preset.label} value={JSON.stringify(preset.win)}>
                {preset.label}
              </option>
            ))}
            {!WIN_PRESETS.some((p) => JSON.stringify(p.win) === JSON.stringify(win)) && (
              <option value={JSON.stringify(win)}>Custom</option>
            )}
          </select>
        </div>
        <NumberField
          label="Step allowance"
          value={maxSteps}
          min={10}
          max={5000}
          onChange={(v) => update({ max_steps: v })}
        />
      </div>

      {/* The command palette — what this level offers */}
      <div className="rounded-lg border border-border-strong bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-text">Commands this level offers</h3>
            <p className="text-xs text-text-subtle">
              Pupils see exactly these — in the blocks, in the autocompletion, and in the
              starter file. Loops and <code>if</code> are always available.
            </p>
          </div>
          <div className="flex gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => update({ commands: preset.commands, preset: preset.label })}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {COMMAND_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-text-muted">{group.title}</p>
              {group.hint && <p className="mb-1.5 text-3xs text-text-subtle">{group.hint}</p>}
              <div className="flex flex-wrap gap-1.5">
                {group.commands.map((command) => {
                  const on = commands.includes(command);
                  return (
                    <button
                      key={command}
                      onClick={() => toggleCommand(command)}
                      aria-pressed={on}
                      className={`rounded-md px-2 py-1 font-mono text-2xs transition-colors ${
                        on
                          ? "bg-primary-soft text-success-fg"
                          : "bg-surface-2 text-text-subtle hover:text-text"
                      }`}
                    >
                      {command}()
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Painting the grid */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="mb-1 text-xs font-medium text-text-muted">Paint</span>
          {CELL_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.type}
                onClick={() => setActiveTool(tool.type)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  activeTool === tool.type
                    ? "bg-primary-soft text-success-fg"
                    : "bg-surface-2 text-text-muted hover:bg-surface-2"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tool.label}
              </button>
            );
          })}

          <label className="mt-3 block text-xs font-medium text-text-muted">Facing</label>
          <select
            value={start.facing}
            onChange={(e) => update({ start: { ...start, facing: e.target.value } })}
            className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
          >
            <option value="up">Up</option>
            <option value="right">Right</option>
            <option value="down">Down</option>
            <option value="left">Left</option>
          </select>
        </div>

        <div
          className="flex-1 rounded-lg border border-border-strong bg-surface p-4"
          style={{ maxWidth: gridWidth * 52 + 32 }}
        >
          <GridRenderer
            state={initialState(config)}
            cellSize={Math.min(48, 400 / Math.max(gridWidth, gridHeight))}
            editMode
            activeTool={activeTool === "start" ? "empty" : activeTool}
            onCellClick={handleCellClick}
          />
        </div>
      </div>

      {/* Hints */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-text-muted">Hints</label>
          <Button variant="ghost" size="sm" onClick={() => update({ hints: [...hints, ""] })}>
            + Add hint
          </Button>
        </div>
        {hints.map((hint, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input
              value={hint}
              onChange={(e) => {
                const next = [...hints];
                next[i] = e.target.value;
                update({ hints: next });
              }}
              placeholder={`Hint ${i + 1}`}
              className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ hints: hints.filter((_, j) => j !== i) })}
            >
              &times;
            </Button>
          </div>
        ))}
      </div>

      {/* Everything wrong with the level, in one place */}
      {problems.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-warning-soft p-3 text-xs text-warning-fg">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-muted">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || min)}
        className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * What is wrong with this level, all of it at once.
 *
 * Reporting one problem at a time turns a five-minute fix into five rounds of
 * save-and-look. The server checks the same things and more when the level is
 * saved; this is the copy a teacher sees while they build.
 */
function findProblems(level: {
  cells: Cell[];
  start: { x: number; y: number };
  commands: string[];
  win: Record<string, unknown>;
}): string[] {
  const problems: string[] = [];
  const conditions = JSON.stringify(level.win);
  const has = (type: CellType) => level.cells.some((c) => c.type === type);
  const startsInWall = level.cells.some(
    (c) => c.type === "wall" && c.x === level.start.x && c.y === level.start.y,
  );

  if (startsInWall) problems.push("The robot starts inside a wall.");
  if (conditions.includes("at_goal") && !has("goal")) {
    problems.push("The goal is part of the win condition, but there is no goal on the grid.");
  }
  if (conditions.includes("all_items_taken") && !has("item")) {
    problems.push("The level asks for every item to be collected and holds none.");
  }
  if (conditions.includes("all_marks_painted") && !level.cells.some((c) => c.mark)) {
    problems.push("The level asks for painted squares and none are marked.");
  }
  if (conditions.includes("all_marks_painted") && !level.commands.includes("paint")) {
    problems.push("The level asks for painted squares but does not offer paint().");
  }
  if (level.commands.length === 0) {
    problems.push("No commands are offered, so there is nothing a pupil can write.");
  }
  if (
    level.commands.some((c) => SENSORS.includes(c)) &&
    !level.commands.some((c) => FACING_COMMANDS.includes(c))
  ) {
    problems.push(
      "Sensors read relative to where the robot faces, so offer the facing commands too.",
    );
  }

  return problems;
}
