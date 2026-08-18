"use client";

/**
 * The teacher's side of a robot level.
 *
 * Two things here are the point of the whole feature.
 *
 * **The command palette.** A level stores one list of commands, and that list
 * drives the block palette, the Python autocompletion and the starter header a
 * pupil reads. Before this, the editor offered the same choice, saved it as
 * `available_blocks`, and nothing ever read it.
 *
 * **Check.** Composing a good grid is judgement and stays the teacher's;
 * knowing whether the grid can be finished is arithmetic and should not be.
 * Check says which of two answers it is giving — a shortest solution, or that
 * the teacher's own solution passes — and never dresses the second as the
 * first.
 *
 * Strings are still English; this file is on the i18n allowlist and comes off
 * it in the polish pass, once it has stopped changing shape.
 */

import { useCallback, useMemo, useState } from "react";
import { Box, Eraser, Flag, Play as PlayIcon, Star, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  exercisesApi,
  type RobotBlocker,
  type RobotRunResult,
  type RobotSolveAnswer,
} from "@/lib/api/exercises";
import GridRenderer from "./grid-renderer";
import { initialState, type Cell, type CellType, type Direction } from "./grid-engine";

interface Robot2DEditorProps {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

/** What a teacher paints. `start`, `mark` and `value` are not cell types. */
type Tool = CellType | "start" | "mark" | "value";

const CELL_TOOLS: { type: Tool; label: string; icon: typeof Box }[] = [
  { type: "empty", label: "Erase", icon: Eraser },
  { type: "wall", label: "Wall", icon: Box },
  { type: "item", label: "Item", icon: Star },
  { type: "goal", label: "Goal", icon: Flag },
  { type: "start", label: "Start", icon: PlayIcon },
  { type: "mark", label: "To paint", icon: Star },
  { type: "value", label: "Number", icon: Star },
];

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
  { title: "Items and paint", hint: "", commands: ["take", "drop", "paint"] },
  {
    title: "Numbers",
    hint: "A goal involving numbers cannot be checked for a shortest solution.",
    commands: ["read", "write"],
  },
  {
    title: "Ask about the surroundings",
    hint: "Relative to where the robot faces, so these need the facing commands.",
    commands: ["wall_ahead", "item_here", "at_goal", "painted", "value_here"],
  },
];

const PRESETS: { label: string; commands: string[] }[] = [
  { label: "First steps", commands: ["move_up", "move_down", "move_left", "move_right"] },
  {
    label: "Facing and loops",
    commands: ["move_forward", "turn_left", "turn_right", "wall_ahead", "at_goal"],
  },
  { label: "Everything", commands: COMMAND_GROUPS.flatMap((g) => g.commands) },
];

/** The win vocabulary, and what each leaf needs alongside it. */
const CONDITIONS: { cond: string; label: string; arg?: "dir" | "n" }[] = [
  { cond: "at_goal", label: "the robot stands on the goal" },
  { cond: "all_items_taken", label: "every item has been collected" },
  { cond: "all_marks_painted", label: "every marked square is painted" },
  { cond: "facing", label: "the robot faces", arg: "dir" },
  { cond: "steps_at_most", label: "the run took at most … steps", arg: "n" },
  { cond: "all_values_read", label: "every number has been read" },
  { cond: "values_total", label: "the numbers add up to …", arg: "n" },
];

/** What each blocker code means, in words a teacher can act on. */
const BLOCKER_TEXT: Record<string, string> = {
  start_off_grid: "The robot starts outside the grid.",
  start_on_wall: "The robot starts inside a wall.",
  cell_off_grid: "Something is placed outside the grid.",
  duplicate_cell: "Two things share one square.",
  two_goals: "There are two goals.",
  mark_on_wall: "A wall is marked for painting, and a robot cannot stand on it.",
  value_on_wall: "A wall carries a number, and a robot cannot read it.",
  no_commands: "No commands are offered, so there is nothing a pupil can write.",
  unknown_command: "This level offers a command the robot does not have.",
  sensor_without_facing:
    "Sensors read relative to where the robot faces, so offer the facing commands too.",
  win_needs_goal: "The goal is part of the win condition, but there is no goal on the grid.",
  win_needs_items: "The level asks for every item to be collected and holds none.",
  win_needs_marks: "The level asks for painted squares and none are marked.",
  win_needs_values: "The level asks about numbers and no square carries one.",
  win_needs_take_command: "The level asks for items to be collected but does not offer take().",
  win_needs_paint_command: "The level asks for painted squares but does not offer paint().",
  win_needs_read_command: "The level asks for numbers to be read but does not offer read().",
  no_reference_solution:
    "Nobody has finished this level yet. Write a solution below so it can be checked.",
};

const UNDO_LIMIT = 50;

export default function Robot2DEditor({ config, onConfigChange }: Robot2DEditorProps) {
  const gridWidth = (config.grid_width as number) || 5;
  const gridHeight = (config.grid_height as number) || 5;
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
  const win = useMemo(
    () => (config.win as Record<string, unknown>) || { cond: "at_goal" },
    [config.win],
  );
  const maxSteps = (config.max_steps as number) ?? 500;
  const hints = (config.hints as string[]) || [];
  const solution = (config.solution_code as string) || "";

  const [activeTool, setActiveTool] = useState<Tool>("wall");
  const [painting, setPainting] = useState(false);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [answer, setAnswer] = useState<RobotSolveAnswer | null>(null);
  const [playtest, setPlaytest] = useState<RobotRunResult | null>(null);
  const [busy, setBusy] = useState<"check" | "playtest" | null>(null);

  const update = useCallback(
    (patch: Record<string, unknown>) => {
      setHistory((h) => [...h, config].slice(-UNDO_LIMIT));
      onConfigChange({ ...config, ...patch });
      setAnswer(null); // the level moved; the old answer describes a level that no longer exists
    },
    [config, onConfigChange],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      const previous = h[h.length - 1];
      if (previous) onConfigChange(previous);
      return h.slice(0, -1);
    });
    setAnswer(null);
  }, [onConfigChange]);

  const paint = useCallback(
    (x: number, y: number) => {
      if (activeTool === "start") {
        update({ start: { ...start, x, y } });
        return;
      }

      const at = cells.find((c) => c.x === x && c.y === y);
      const without = cells.filter((c) => !(c.x === x && c.y === y));

      if (activeTool === "mark") {
        update({ cells: [...without, { ...(at ?? { x, y, type: "empty" }), mark: !at?.mark }] });
        return;
      }
      if (activeTool === "value") {
        const next = ((at?.value ?? -1) + 1) % 10; // 0–9, cycling, so one tool sets any digit
        update({ cells: [...without, { ...(at ?? { x, y, type: "empty" }), value: next }] });
        return;
      }
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
    (command: string) =>
      update({
        commands: commands.includes(command)
          ? commands.filter((c) => c !== command)
          : [...commands, command],
      }),
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

  const check = useCallback(async () => {
    setBusy("check");
    setPlaytest(null);
    try {
      const { data } = await exercisesApi.solveRobotLevel({ config });
      setAnswer(data);
      if (data.steps !== null) {
        onConfigChange({ ...config, star_steps: data.steps, star_size: data.size ?? undefined });
      }
    } catch {
      setAnswer({
        answer: "unsolvable",
        steps: null,
        size: null,
        reason: null,
        blockers: [{ code: "runner_unavailable" }],
      });
    } finally {
      setBusy(null);
    }
  }, [config, onConfigChange]);

  const runPlaytest = useCallback(
    async (source: string) => {
      setBusy("playtest");
      try {
        const { data } = await exercisesApi.previewRobotLevel({ config, source });
        setPlaytest(data);
        return data;
      } catch {
        setPlaytest(null);
        return null;
      } finally {
        setBusy(null);
      }
    },
    [config],
  );

  /** A reference solution that loses is not a reference solution (FR-019). */
  const saveSolution = useCallback(
    async (source: string) => {
      if (!source.trim()) {
        update({ solution_code: null });
        return;
      }
      const run = await runPlaytest(source);
      if (run?.won) update({ solution_code: source });
    },
    [runPlaytest, update],
  );

  const blockers = answer?.blockers ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <NumberField label="Width" value={gridWidth} min={2} max={10} onChange={(v) => resize(v, gridHeight)} />
        <NumberField label="Height" value={gridHeight} min={2} max={10} onChange={(v) => resize(gridWidth, v)} />
        <NumberField label="Step allowance" value={maxSteps} min={10} max={5000} onChange={(v) => update({ max_steps: v })} />
        <NumberField
          label="★★ within steps"
          value={(config.star_steps as number) ?? 0}
          min={0}
          max={5000}
          onChange={(v) => update({ star_steps: v || null })}
        />
        <NumberField
          label="★★★ within lines"
          value={(config.star_size as number) ?? 0}
          min={0}
          max={500}
          onChange={(v) => update({ star_size: v || null })}
        />
      </div>

      <WinBuilder win={win} onChange={(next) => update({ win: next })} />

      <CommandPalette commands={commands} onToggle={toggleCommand} onPreset={(p) => update({ commands: p.commands, preset: p.label })} />

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

          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            disabled={history.length === 0}
            onClick={undo}
          >
            <Undo2 className="mr-1 h-3 w-3" /> Undo
          </Button>
        </div>

        <div
          className="flex-1 rounded-lg border border-border-strong bg-surface p-4"
          style={{ maxWidth: gridWidth * 52 + 32 }}
          onPointerDown={() => setPainting(true)}
          onPointerUp={() => setPainting(false)}
          onPointerLeave={() => setPainting(false)}
        >
          <GridRenderer
            state={initialState(config)}
            cellSize={Math.min(48, 400 / Math.max(gridWidth, gridHeight))}
            editMode
            activeTool={activeTool === "start" || activeTool === "mark" || activeTool === "value" ? "empty" : activeTool}
            onCellClick={paint}
            onCellEnter={(x, y) => painting && paint(x, y)}
          />
          <p className="mt-2 text-3xs text-text-subtle">
            Drag to paint. The number tool cycles 0–9 on each click.
          </p>
        </div>
      </div>

      {/* Check, and what it answered */}
      <div className="rounded-lg border border-border-strong bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={check} disabled={busy !== null}>
            {busy === "check" ? "Checking…" : "Check this level"}
          </Button>
          {answer && <AnswerLine answer={answer} />}
        </div>

        {blockers.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-lg bg-warning-soft p-3 text-xs text-warning-fg">
            {blockers.map((b) => (
              <li key={b.code}>{describeBlocker(b)}</li>
            ))}
          </ul>
        )}
      </div>

      <SolutionPanel
        solution={solution}
        busy={busy === "playtest"}
        run={playtest}
        onPlaytest={runPlaytest}
        onSave={saveSolution}
      />

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
            <Button variant="ghost" size="sm" onClick={() => update({ hints: hints.filter((_, j) => j !== i) })}>
              &times;
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The three answers, told apart on sight. SC-011 lives here. */
function AnswerLine({ answer }: { answer: RobotSolveAnswer }) {
  if (answer.answer === "shortest") {
    return (
      <p className="text-sm font-semibold text-primary">
        Solvable in {answer.steps} steps.
      </p>
    );
  }
  if (answer.answer === "unsolvable") {
    return <p className="text-sm font-semibold text-danger-fg">No path to the goal.</p>;
  }
  return (
    <p className="text-sm text-text-muted">
      {answer.steps === null
        ? "Not checked — and no solution has finished this level yet."
        : `Not checked for a shortest solution. Yours takes ${answer.steps} steps.`}
      <span className="ml-1 text-xs text-text-subtle">
        (
        {answer.reason === "win_uses_values"
          ? "the goal involves the numbers on the floor"
          : "too many things to collect or paint"}
        )
      </span>
    </p>
  );
}

function CommandPalette({
  commands,
  onToggle,
  onPreset,
}: {
  commands: string[];
  onToggle: (command: string) => void;
  onPreset: (preset: { label: string; commands: string[] }) => void;
}) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text">Commands this level offers</h3>
          <p className="text-xs text-text-subtle">
            Pupils see exactly these — in the blocks, in the autocompletion, and in the starter
            file. Loops and <code>if</code> are always available.
          </p>
        </div>
        <div className="flex gap-1.5">
          {PRESETS.map((preset) => (
            <Button key={preset.label} variant="outline" size="sm" onClick={() => onPreset(preset)}>
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
                    onClick={() => onToggle(command)}
                    aria-pressed={on}
                    className={`rounded-md px-2 py-1 font-mono text-2xs transition-colors ${
                      on ? "bg-primary-soft text-success-fg" : "bg-surface-2 text-text-subtle hover:text-text"
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
  );
}

/**
 * The win condition, as rows joined by all-of or any-of, each negatable.
 *
 * Deliberately not a full tree editor: a flat list with negation covers every
 * level anyone has asked for, and a nested expression a teacher cannot draw is
 * a nested expression they cannot debug. An expression this cannot represent is
 * preserved untouched and shown as read-only rather than silently flattened.
 */
function WinBuilder({
  win,
  onChange,
}: {
  win: Record<string, unknown>;
  onChange: (win: Record<string, unknown>) => void;
}) {
  const parsed = useMemo(() => parseWin(win), [win]);

  if (!parsed) {
    return (
      <div className="rounded-lg border border-border-strong bg-surface p-4 text-xs text-text-muted">
        This level&apos;s goal is more deeply nested than the editor can draw. It is kept as it
        is and still works.
      </div>
    );
  }

  const set = (next: typeof parsed) => onChange(serializeWin(next));

  return (
    <div className="rounded-lg border border-border-strong bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-text">The level is finished when</h3>
        {parsed.leaves.length > 1 && (
          <select
            value={parsed.mode}
            onChange={(e) => set({ ...parsed, mode: e.target.value as "all" | "any" })}
            className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs"
          >
            <option value="all">all of these are true</option>
            <option value="any">any of these is true</option>
          </select>
        )}
      </div>

      {parsed.leaves.map((leaf, i) => {
        const meta = CONDITIONS.find((c) => c.cond === leaf.cond);
        return (
          <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={leaf.negated}
                onChange={(e) => {
                  const leaves = [...parsed.leaves];
                  leaves[i] = { ...leaf, negated: e.target.checked };
                  set({ ...parsed, leaves });
                }}
              />
              not
            </label>

            <select
              value={leaf.cond}
              onChange={(e) => {
                const leaves = [...parsed.leaves];
                leaves[i] = { cond: e.target.value, negated: leaf.negated, dir: "up", n: 1 };
                set({ ...parsed, leaves });
              }}
              className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
            >
              {CONDITIONS.map((c) => (
                <option key={c.cond} value={c.cond}>
                  {c.label}
                </option>
              ))}
            </select>

            {meta?.arg === "dir" && (
              <select
                value={leaf.dir ?? "up"}
                onChange={(e) => {
                  const leaves = [...parsed.leaves];
                  leaves[i] = { ...leaf, dir: e.target.value };
                  set({ ...parsed, leaves });
                }}
                className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
              >
                <option value="up">up</option>
                <option value="right">right</option>
                <option value="down">down</option>
                <option value="left">left</option>
              </select>
            )}

            {meta?.arg === "n" && (
              <input
                type="number"
                value={leaf.n ?? 1}
                onChange={(e) => {
                  const leaves = [...parsed.leaves];
                  leaves[i] = { ...leaf, n: parseInt(e.target.value, 10) || 0 };
                  set({ ...parsed, leaves });
                }}
                className="w-20 rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
              />
            )}

            {parsed.leaves.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => set({ ...parsed, leaves: parsed.leaves.filter((_, j) => j !== i) })}
              >
                &times;
              </Button>
            )}
          </div>
        );
      })}

      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          set({ ...parsed, leaves: [...parsed.leaves, { cond: "at_goal", negated: false }] })
        }
      >
        + Add a condition
      </Button>
    </div>
  );
}

function SolutionPanel({
  solution,
  busy,
  run,
  onPlaytest,
  onSave,
}: {
  solution: string;
  busy: boolean;
  run: RobotRunResult | null;
  onPlaytest: (source: string) => Promise<RobotRunResult | null>;
  onSave: (source: string) => void;
}) {
  const [draft, setDraft] = useState(solution);

  return (
    <div className="rounded-lg border border-border-strong bg-surface p-4">
      <h3 className="text-sm font-semibold text-text">Your own solution</h3>
      <p className="mb-2 text-xs text-text-subtle">
        Play the level without saving it. A solution that does not finish the level is not
        stored — pupils never see this either way.
      </p>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder={"while not at_goal():\n    move_forward()"}
        className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 font-mono text-xs"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onPlaytest(draft)}>
          {busy ? "Running…" : "Play it"}
        </Button>
        <Button size="sm" disabled={busy} onClick={() => onSave(draft)}>
          Save as the reference solution
        </Button>

        {run && (
          <span
            className={`text-xs ${run.won ? "text-primary" : "text-danger-fg"}`}
          >
            {run.won
              ? `Finished in ${run.steps} steps, ${run.size} lines.`
              : run.error
                ? `Stopped on line ${run.error.line}: ${run.error.message}`
                : `Ran ${run.steps} steps and did not finish the level.`}
          </span>
        )}
      </div>
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

function describeBlocker(blocker: RobotBlocker): string {
  const text = BLOCKER_TEXT[blocker.code] ?? blocker.code;
  return blocker.commands?.length ? `${text} (${blocker.commands.join(", ")})` : text;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// ─── The win expression, to and from rows ────────────────────────────

interface WinLeaf {
  cond: string;
  negated: boolean;
  dir?: string;
  n?: number;
}

interface ParsedWin {
  mode: "all" | "any";
  leaves: WinLeaf[];
}

/** Null when the expression is nested more deeply than rows can show. */
function parseWin(win: Record<string, unknown>): ParsedWin | null {
  const leaf = (node: Record<string, unknown>, negated: boolean): WinLeaf | null =>
    typeof node.cond === "string"
      ? { cond: node.cond, negated, dir: node.dir as string, n: node.n as number }
      : null;

  if (typeof win.cond === "string") {
    const single = leaf(win, false);
    return single ? { mode: "all", leaves: [single] } : null;
  }

  const op = win.op as string | undefined;
  const children = (win.of as Record<string, unknown>[]) || [];

  if (op === "not" && children.length === 1) {
    const single = leaf(children[0], true);
    return single ? { mode: "all", leaves: [single] } : null;
  }

  if (op !== "and" && op !== "or") return null;

  const leaves: WinLeaf[] = [];
  for (const child of children) {
    if (child.op === "not") {
      const inner = ((child.of as Record<string, unknown>[]) || [])[0];
      const negated = inner && leaf(inner, true);
      if (!negated) return null;
      leaves.push(negated);
      continue;
    }
    const plain = leaf(child, false);
    if (!plain) return null;
    leaves.push(plain);
  }

  return { mode: op === "and" ? "all" : "any", leaves };
}

function serializeWin(parsed: ParsedWin): Record<string, unknown> {
  const node = (l: WinLeaf): Record<string, unknown> => {
    const base: Record<string, unknown> = { cond: l.cond };
    if (l.cond === "facing") base.dir = l.dir ?? "up";
    if (l.cond === "steps_at_most" || l.cond === "values_total") base.n = l.n ?? 1;
    return l.negated ? { op: "not", of: [base] } : base;
  };

  if (parsed.leaves.length === 1) return node(parsed.leaves[0]);
  return { op: parsed.mode === "all" ? "and" : "or", of: parsed.leaves.map(node) };
}
