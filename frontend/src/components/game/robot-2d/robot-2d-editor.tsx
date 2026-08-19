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
 * Command names are not translated. `move_up()` is what a child types, and a
 * translated command would be a command the runner refuses.
 */

import { useCallback, useMemo, useState } from "react";
import { Box, Eraser, Flag, Play as PlayIcon, Star, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import {
  exercisesApi,
  type RobotBlocker,
  type RobotRunResult,
  type RobotSolveAnswer,
} from "@/lib/api/exercises";
import GridRenderer from "./grid-renderer";
import { initialState, type Cell, type CellType, type Direction } from "./grid-engine";

type Config = Record<string, unknown>;

interface Robot2DEditorProps {
  config: Config;
  /**
   * Accepts an updater, not only a value.
   *
   * Two edits landing in one render batch both read the same `config` prop, so
   * the second overwrites the first — twelve command toggles in one tick left
   * eleven of them on. A human clicking cannot do that, but a fast typist in a
   * text field can. The parent passes a `useState` setter, which has always
   * supported this form.
   */
  onConfigChange: (next: Config | ((previous: Config) => Config)) => void;
}

type Translate = (key: string) => string;

/** What a teacher paints. `start`, `mark` and `value` are not cell types. */
type Tool = CellType | "start" | "mark" | "value";

const CELL_TOOLS: { type: Tool; icon: typeof Box }[] = [
  { type: "empty", icon: Eraser },
  { type: "wall", icon: Box },
  { type: "item", icon: Star },
  { type: "goal", icon: Flag },
  { type: "start", icon: PlayIcon },
  { type: "mark", icon: Star },
  { type: "value", icon: Star },
];

const COMMAND_GROUPS: { id: string; hint: boolean; commands: string[] }[] = [
  { id: "absolute", hint: true, commands: ["move_up", "move_down", "move_left", "move_right"] },
  { id: "facing", hint: true, commands: ["move_forward", "turn_left", "turn_right"] },
  { id: "items", hint: false, commands: ["take", "drop", "paint"] },
  { id: "numbers", hint: true, commands: ["read", "write"] },
  {
    id: "sensors",
    hint: true,
    commands: ["wall_ahead", "item_here", "at_goal", "painted", "value_here"],
  },
];

const PRESETS: { id: string; commands: string[] }[] = [
  { id: "firstSteps", commands: ["move_up", "move_down", "move_left", "move_right"] },
  {
    id: "facingLoops",
    commands: ["move_forward", "turn_left", "turn_right", "wall_ahead", "at_goal"],
  },
  { id: "everything", commands: COMMAND_GROUPS.flatMap((g) => g.commands) },
];

/** The win vocabulary, and what each leaf needs alongside it. */
const CONDITIONS: { cond: string; arg?: "dir" | "n" }[] = [
  { cond: "at_goal" },
  { cond: "all_items_taken" },
  { cond: "all_marks_painted" },
  { cond: "facing", arg: "dir" },
  { cond: "steps_at_most", arg: "n" },
  { cond: "all_values_read" },
  { cond: "values_total", arg: "n" },
];

const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];

/** Mirrors PAINT_COLORS in robot_sim.py — the sim is the authority. */
const PAINT_COLORS = ["red", "green", "blue", "yellow"] as const;
const COLOR_SWATCH: Record<string, string> = {
  red: "#ef4444", green: "#22c55e", blue: "#3b82f6", yellow: "#eab308",
};

/** Mirrors ITEM_KINDS in robot_validate.py. Visual only. */
const ITEM_KINDS = [
  { kind: null, sprite: "⭐" },
  { kind: "gem", sprite: "💎" },
  { kind: "key", sprite: "🗝️" },
  { kind: "apple", sprite: "🍎" },
  { kind: "flag", sprite: "🚩" },
] as const;

const UNDO_LIMIT = 50;

/** `t()` takes no parameters, and composing fragments breaks word order in
 *  other languages. The keys hold `{name}` placeholders instead. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export default function Robot2DEditor({ config, onConfigChange }: Robot2DEditorProps) {
  const { t } = useTranslation();

  const gridWidth = (config.grid_width as number) || 5;
  const gridHeight = (config.grid_height as number) || 5;
  // Only for rendering. Nothing derives an edit from these — the handlers read
  // the previous config, so an edit cannot be computed from a stale copy.
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
  const [markColor, setMarkColor] = useState<string | null>(null);
  const [itemKind, setItemKind] = useState<string | null>(null);
  const [painting, setPainting] = useState(false);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [answer, setAnswer] = useState<RobotSolveAnswer | null>(null);
  const [playtest, setPlaytest] = useState<RobotRunResult | null>(null);
  const [busy, setBusy] = useState<"check" | "playtest" | null>(null);

  /**
   * Edit the level, deriving the change from whatever the config is *now*.
   *
   * `derive` receives the previous config rather than closing over it. Toggling
   * a command means reading the command list and writing a new one, and reading
   * it from the render's props loses every edit but the last when two land in
   * one batch — twelve toggles in one tick left eleven of them on.
   */
  const updateWith = useCallback(
    (derive: (previous: Config) => Config) => {
      onConfigChange((previous) => ({ ...previous, ...derive(previous) }));
      // Undo records the config this render saw. Two edits in one batch leave
      // one entry instead of two — one extra step back, which is a fair price
      // for never losing an edit.
      setHistory((h) => [...h, config].slice(-UNDO_LIMIT));
      // The level moved; the old answer describes one that no longer exists.
      setAnswer(null);
    },
    [config, onConfigChange],
  );

  /** For edits that do not depend on the current value. */
  const update = useCallback((patch: Config) => updateWith(() => patch), [updateWith]);

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
      // Derived from the previous config, not the render's: dragging fires this
      // many times a second, and each one reads the cells the last one wrote.
      updateWith((previous) => {
        const current = (previous.cells as Cell[]) || [];
        const startAt = (previous.start as { x: number; y: number; facing: Direction }) || start;

        if (activeTool === "start") return { start: { ...startAt, x, y } };

        const at = current.find((c) => c.x === x && c.y === y);
        const without = current.filter((c) => !(c.x === x && c.y === y));

        if (activeTool === "mark") {
          const marked = !at?.mark;
          return {
            cells: [
              ...without,
              {
                ...(at ?? { x, y, type: "empty" }),
                mark: marked,
                // The colour follows the mark: chosen colour on, gone with it off.
                mark_color: marked && markColor ? markColor : undefined,
              },
            ],
          };
        }
        if (activeTool === "value") {
          // 0–9, cycling, so one tool sets any digit.
          const next = ((at?.value ?? -1) + 1) % 10;
          return { cells: [...without, { ...(at ?? { x, y, type: "empty" }), value: next }] };
        }
        if (activeTool === "empty") return { cells: without };
        if (activeTool === "goal") {
          return { cells: [...without.filter((c) => c.type !== "goal"), { x, y, type: "goal" }] };
        }
        if (activeTool === "item" && itemKind) {
          return { cells: [...without, { x, y, type: "item", kind: itemKind }] };
        }
        return { cells: [...without, { x, y, type: activeTool }] };
      });
    },
    [activeTool, itemKind, markColor, start, updateWith],
  );

  const toggleCommand = useCallback(
    (command: string) =>
      updateWith((previous) => {
        const current = (previous.commands as string[]) || [];
        return {
          commands: current.includes(command)
            ? current.filter((c) => c !== command)
            : [...current, command],
        };
      }),
    [updateWith],
  );

  const resize = useCallback(
    (width: number, height: number) => {
      const w = clamp(width, 2, 10);
      const h = clamp(height, 2, 10);
      updateWith((previous) => {
        const current = (previous.cells as Cell[]) || [];
        const startAt = (previous.start as { x: number; y: number; facing: Direction }) || start;
        return {
          grid_width: w,
          grid_height: h,
          cells: current.filter((c) => c.x < w && c.y < h),
          start: { ...startAt, x: Math.min(startAt.x, w - 1), y: Math.min(startAt.y, h - 1) },
        };
      });
    },
    [start, updateWith],
  );

  const check = useCallback(async () => {
    setBusy("check");
    setPlaytest(null);
    try {
      const { data } = await exercisesApi.solveRobotLevel({ config });
      setAnswer(data);
      if (data.steps !== null) {
        onConfigChange((previous) => ({
          ...previous,
          star_steps: data.steps,
          star_size: data.size ?? undefined,
        }));
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
        <NumberField label={t("robot.width")} value={gridWidth} min={2} max={10} onChange={(v) => resize(v, gridHeight)} />
        <NumberField label={t("robot.height")} value={gridHeight} min={2} max={10} onChange={(v) => resize(gridWidth, v)} />
        <NumberField label={t("robot.stepAllowance")} value={maxSteps} min={10} max={5000} onChange={(v) => update({ max_steps: v })} />
        <NumberField
          label={t("robot.starSteps")}
          value={(config.star_steps as number) ?? 0}
          min={0}
          max={5000}
          onChange={(v) => update({ star_steps: v || null })}
        />
        <NumberField
          label={t("robot.starSize")}
          value={(config.star_size as number) ?? 0}
          min={0}
          max={500}
          onChange={(v) => update({ star_size: v || null })}
        />
      </div>

      <WinBuilder win={win} onChange={(next) => update({ win: next })} t={t} />

      <CommandPalette
        commands={commands}
        onToggle={toggleCommand}
        onPreset={(p) => update({ commands: p.commands, preset: p.id })}
        t={t}
      />

      {/* Painting the grid */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="mb-1 text-xs font-medium text-text-muted">{t("robot.paint")}</span>
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
                {t(`robot.tool.${tool.type}`)}
              </button>
            );
          })}

          {activeTool === "mark" && (
            <div>
              <label className="mt-2 block text-xs font-medium text-text-muted">
                {t("robot.markColor")}
              </label>
              <div className="mt-1 flex gap-1">
                <button
                  onClick={() => setMarkColor(null)}
                  title={t("robot.color.none")}
                  aria-pressed={markColor === null}
                  className={`h-6 w-6 rounded-full border-2 text-2xs ${
                    markColor === null ? "border-text" : "border-border-strong"
                  }`}
                >
                  &times;
                </button>
                {PAINT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setMarkColor(color)}
                    title={t(`robot.color.${color}`)}
                    aria-pressed={markColor === color}
                    className={`h-6 w-6 rounded-full border-2 ${
                      markColor === color ? "border-text" : "border-transparent"
                    }`}
                    style={{ backgroundColor: COLOR_SWATCH[color] }}
                  />
                ))}
              </div>
              <p className="mt-1 max-w-32 text-3xs text-text-subtle">{t("robot.markColorHint")}</p>
            </div>
          )}

          {activeTool === "item" && (
            <div>
              <label className="mt-2 block text-xs font-medium text-text-muted">
                {t("robot.itemKind")}
              </label>
              <div className="mt-1 flex gap-1">
                {ITEM_KINDS.map(({ kind, sprite }) => (
                  <button
                    key={kind ?? "star"}
                    onClick={() => setItemKind(kind)}
                    title={t(`robot.kind.${kind ?? "star"}`)}
                    aria-pressed={itemKind === kind}
                    className={`h-7 w-7 rounded-lg border text-sm ${
                      itemKind === kind
                        ? "border-text bg-primary-soft"
                        : "border-border-strong bg-surface-2"
                    }`}
                  >
                    {sprite}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="mt-3 block text-xs font-medium text-text-muted">
            {t("robot.startFacing")}
          </label>
          <select
            value={start.facing}
            onChange={(e) => update({ start: { ...start, facing: e.target.value } })}
            className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {t(`robot.dir.${d}`)}
              </option>
            ))}
          </select>

          <Button variant="ghost" size="sm" className="mt-2" disabled={history.length === 0} onClick={undo}>
            <Undo2 className="mr-1 h-3 w-3" /> {t("robot.undo")}
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
            activeTool={isCellType(activeTool) ? activeTool : "empty"}
            onCellPress={paint}
            onCellEnter={(x, y) => painting && paint(x, y)}
          />
          <p className="mt-2 text-3xs text-text-subtle">{t("robot.dragHint")}</p>
        </div>
      </div>

      {/* Check, and what it answered */}
      <div className="rounded-lg border border-border-strong bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={check} disabled={busy !== null}>
            {busy === "check" ? t("robot.checking") : t("robot.check")}
          </Button>
          {answer && <AnswerLine answer={answer} t={t} />}
        </div>

        {blockers.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-lg bg-warning-soft p-3 text-xs text-warning-fg">
            {blockers.map((b) => (
              <li key={b.code}>{describeBlocker(b, t)}</li>
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
        t={t}
      />

      {/* Hints */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-text-muted">{t("robot.hints")}</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              updateWith((p) => ({ hints: [...(((p.hints as string[]) || [])), ""] }))
            }
          >
            {t("robot.addHint")}
          </Button>
        </div>
        {hints.map((hint, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input
              value={hint}
              onChange={(e) => {
                // Every keystroke rewrites the array, so it must be read from
                // the previous config — two quick keys would otherwise land in
                // one batch and the second would drop the first.
                const typed = e.target.value;
                updateWith((p) => {
                  const next = [...(((p.hints as string[]) || []))];
                  next[i] = typed;
                  return { hints: next };
                });
              }}
              placeholder={fill(t("robot.hintPlaceholder"), { n: i + 1 })}
              className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateWith((p) => ({
                  hints: (((p.hints as string[]) || [])).filter((_, j) => j !== i),
                }))
              }
            >
              &times;
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The three answers, told apart on sight. SC-011 lives here. */
function AnswerLine({ answer, t }: { answer: RobotSolveAnswer; t: Translate }) {
  if (answer.answer === "shortest") {
    return (
      <p className="text-sm font-semibold text-primary">
        {fill(t("robot.solvableIn"), { steps: answer.steps ?? 0 })}
      </p>
    );
  }
  if (answer.answer === "unsolvable") {
    return <p className="text-sm font-semibold text-danger-fg">{t("robot.noPath")}</p>;
  }

  const why =
    answer.reason === "win_uses_values"
      ? t("robot.reasonValues")
      : answer.reason === "win_uses_colors"
        ? t("robot.reasonColors")
        : t("robot.reasonTargets");

  return (
    <p className="text-sm text-text-muted">
      {answer.steps === null
        ? t("robot.notCheckedNoSolution")
        : fill(t("robot.notCheckedYours"), { steps: answer.steps })}
      <span className="ml-1 text-xs text-text-subtle">({why})</span>
    </p>
  );
}

function CommandPalette({
  commands,
  onToggle,
  onPreset,
  t,
}: {
  commands: string[];
  onToggle: (command: string) => void;
  onPreset: (preset: { id: string; commands: string[] }) => void;
  t: Translate;
}) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text">{t("robot.paletteTitle")}</h3>
          <p className="text-xs text-text-subtle">{t("robot.paletteHint")}</p>
        </div>
        <div className="flex gap-1.5">
          {PRESETS.map((preset) => (
            <Button key={preset.id} variant="outline" size="sm" onClick={() => onPreset(preset)}>
              {t(`robot.preset.${preset.id}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COMMAND_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="text-xs font-semibold text-text-muted">{t(`robot.group.${group.id}`)}</p>
            {group.hint && (
              <p className="mb-1.5 text-3xs text-text-subtle">{t(`robot.groupHint.${group.id}`)}</p>
            )}
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
 * one they cannot debug. An expression this cannot represent is preserved
 * untouched and shown read-only rather than silently flattened.
 */
function WinBuilder({
  win,
  onChange,
  t,
}: {
  win: Record<string, unknown>;
  onChange: (win: Record<string, unknown>) => void;
  t: Translate;
}) {
  const parsed = useMemo(() => parseWin(win), [win]);

  if (!parsed) {
    return (
      <div className="rounded-lg border border-border-strong bg-surface p-4 text-xs text-text-muted">
        {t("robot.winTooDeep")}
      </div>
    );
  }

  const set = (next: typeof parsed) => onChange(serializeWin(next));

  return (
    <div className="rounded-lg border border-border-strong bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-text">{t("robot.winTitle")}</h3>
        {parsed.leaves.length > 1 && (
          <select
            value={parsed.mode}
            onChange={(e) => set({ ...parsed, mode: e.target.value as "all" | "any" })}
            className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs"
          >
            <option value="all">{t("robot.winAll")}</option>
            <option value="any">{t("robot.winAny")}</option>
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
              {t("robot.winNot")}
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
                  {t(`robot.cond.${c.cond}`)}
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
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {t(`robot.dir.${d}`)}
                  </option>
                ))}
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
        onClick={() => set({ ...parsed, leaves: [...parsed.leaves, { cond: "at_goal", negated: false }] })}
      >
        {t("robot.addCondition")}
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
  t,
}: {
  solution: string;
  busy: boolean;
  run: RobotRunResult | null;
  onPlaytest: (source: string) => Promise<RobotRunResult | null>;
  onSave: (source: string) => void;
  t: Translate;
}) {
  const [draft, setDraft] = useState(solution);

  return (
    <div className="rounded-lg border border-border-strong bg-surface p-4">
      <h3 className="text-sm font-semibold text-text">{t("robot.solutionTitle")}</h3>
      <p className="mb-2 text-xs text-text-subtle">{t("robot.solutionHint")}</p>

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
          {busy ? t("robot.running") : t("robot.playIt")}
        </Button>
        <Button size="sm" disabled={busy} onClick={() => onSave(draft)}>
          {t("robot.saveSolution")}
        </Button>

        {run && (
          <span className={`text-xs ${run.won ? "text-primary" : "text-danger-fg"}`}>
            {run.won
              ? fill(t("robot.solutionWon"), { steps: run.steps, size: run.size })
              : run.error
                ? fill(t("robot.solutionError"), {
                    line: run.error.line ?? 0,
                    message: run.error.message,
                  })
                : fill(t("robot.solutionLost"), { steps: run.steps })}
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

function describeBlocker(blocker: RobotBlocker, t: Translate): string {
  const text = t(`robot.blocker.${blocker.code}`);
  return blocker.commands?.length ? `${text} (${blocker.commands.join(", ")})` : text;
}

function isCellType(tool: Tool): tool is CellType {
  return tool !== "start" && tool !== "mark" && tool !== "value";
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
