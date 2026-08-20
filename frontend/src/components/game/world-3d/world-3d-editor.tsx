"use client";

/**
 * Building a 3D level.
 *
 * The 2D twin is `robot-2d/robot-2d-editor.tsx`, and this deliberately follows
 * it: a teacher who has built one kind of level has built both. What is new
 * here is height, and the two defects height brought with it.
 *
 * **Painting one height must not disturb another.** The editor this replaces
 * matched the square being replaced on position and kind while ignoring
 * height, so placing a platform deleted the one below it. Every edit here
 * carries `y`.
 *
 * **A button names its door from a list.** It used to be free text: a typo
 * produced a door that never opened and a level nobody could finish, with
 * nothing to say why.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Box, DoorClosed, Eraser, Flag, Layers, Play as PlayIcon, Star, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import {
  exercisesApi,
  type WorldBlocker,
  type WorldRunResult,
  type WorldSolveAnswer,
} from "@/lib/api/exercises";
import { initialState, type CellType3D, type Direction3D, type GridCell3D } from "./scene-engine";
import { withWorldDefaults, worldDefaultsApplied } from "./world-defaults";

const WorldScene = dynamic(() => import("./scene/world-scene"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-2" />,
});

type Config = Record<string, unknown>;

interface World3DEditorProps {
  config: Config;
  /** Accepts an updater, not only a value — see `updateWith` below. */
  onConfigChange: (next: Config | ((previous: Config) => Config)) => void;
}

/** What a teacher paints. `start` is not a cell. */
type Tool = "erase" | "wall" | "platform" | "item" | "button" | "door" | "goal" | "start";

const TOOLS: { type: Tool; icon: typeof Box; key: string }[] = [
  { type: "erase", icon: Eraser, key: "robot.tool.empty" },
  { type: "wall", icon: Box, key: "robot.tool.wall" },
  { type: "platform", icon: Layers, key: "world.tool.platform" },
  { type: "item", icon: Star, key: "robot.tool.item" },
  { type: "button", icon: PlayIcon, key: "world.tool.button" },
  { type: "door", icon: DoorClosed, key: "world.tool.door" },
  { type: "goal", icon: Flag, key: "robot.tool.goal" },
  { type: "start", icon: Flag, key: "robot.tool.start" },
];

const COMMAND_GROUPS = [
  { id: "movement", commands: ["move_forward", "turn_left", "turn_right", "jump"] },
  { id: "world", commands: ["take", "drop", "press"] },
  {
    id: "sensors",
    commands: [
      "wall_ahead",
      "gap_ahead",
      "step_ahead",
      "item_here",
      "at_goal",
      "button_ahead",
      "door_ahead",
    ],
  },
];

const PRESETS = [
  { id: "firstSteps", commands: ["move_forward", "turn_left", "turn_right", "at_goal"] },
  {
    id: "climbing",
    commands: ["move_forward", "turn_left", "turn_right", "jump", "at_goal", "step_ahead"],
  },
  { id: "everything", commands: COMMAND_GROUPS.flatMap((g) => g.commands) },
];

const CONDITIONS: { cond: string; key: string; arg?: "n" | "xz" }[] = [
  { cond: "at_goal", key: "robot.cond.at_goal" },
  { cond: "all_items_taken", key: "robot.cond.all_items_taken" },
  { cond: "all_buttons_pressed", key: "world.cond.all_buttons_pressed" },
  { cond: "all_doors_open", key: "world.cond.all_doors_open" },
  { cond: "at", key: "world.cond.at", arg: "xz" },
  { cond: "height_at_least", key: "world.cond.height_at_least", arg: "n" },
  { cond: "steps_at_most", key: "robot.cond.steps_at_most", arg: "n" },
];

/** Codes the 2D editor already translates. The rest are 3D's own. */
const SHARED_BLOCKERS = new Set([
  "no_commands",
  "no_reference_solution",
  "runner_unavailable",
  "start_off_grid",
  "start_on_wall",
  "two_goals",
  "unknown_command",
]);

const FACINGS: Direction3D[] = ["north", "east", "south", "west"];
const MAX_HEIGHT = 4;
const UNDO_LIMIT = 50;

type Translate = (key: string) => string;

/** `t()` takes no parameters, and composing fragments breaks word order. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

/** True for objects that occupy a height rather than sitting on the surface. */
function stacked(cell: { type: string }): boolean {
  return cell.type === "wall" || cell.type === "platform";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function World3DEditor({ config, onConfigChange }: World3DEditorProps) {
  const { t } = useTranslation();

  // Как и у двумерного близнеца: умолчания записываются, а не только
  // рисуются. Уровень без `win` не может пройти никто.
  useEffect(() => {
    if (!worldDefaultsApplied(config)) onConfigChange(withWorldDefaults);
  }, [config, onConfigChange]);

  const gridWidth = (config.grid_width as number) || 6;
  const gridDepth = (config.grid_depth as number) || 6;
  const cells = useMemo(() => (config.cells as GridCell3D[]) || [], [config.cells]);
  const commands = useMemo(() => (config.commands as string[]) || [], [config.commands]);
  const win = useMemo(
    () => (config.win as Record<string, unknown>) || { cond: "at_goal" },
    [config.win],
  );
  const start = useMemo(
    () =>
      (config.start as { x: number; z: number; y: number; facing: Direction3D }) || {
        x: 0,
        z: 0,
        y: 0,
        facing: "north" as Direction3D,
      },
    [config.start],
  );
  const maxSteps = (config.max_steps as number) ?? 500;
  const hints = useMemo(() => (config.hints as string[]) || [], [config.hints]);
  const solution = (config.solution_code as string) || "";

  const [activeTool, setActiveTool] = useState<Tool>("wall");
  const [level, setLevel] = useState(0);
  const [painting, setPainting] = useState(false);
  const [history, setHistory] = useState<Config[]>([]);
  const [answer, setAnswer] = useState<WorldSolveAnswer | null>(null);
  const [playtest, setPlaytest] = useState<WorldRunResult | null>(null);
  const [busy, setBusy] = useState<"check" | "playtest" | null>(null);

  /**
   * Edit the level, deriving the change from whatever the config is *now*.
   *
   * `derive` receives the previous config rather than closing over it. Dragging
   * fires this many times a second, and reading the cells from the render's
   * props loses every edit but the last when several land in one batch.
   */
  const updateWith = useCallback(
    (derive: (previous: Config) => Config) => {
      onConfigChange((previous) => ({ ...previous, ...derive(previous) }));
      setHistory((h) => [...h, config].slice(-UNDO_LIMIT));
      // The level moved; the old answer describes one that no longer exists.
      setAnswer(null);
    },
    [config, onConfigChange],
  );

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
    (x: number, z: number) => {
      updateWith((previous) => {
        const current = (previous.cells as GridCell3D[]) || [];
        const startAt =
          (previous.start as { x: number; z: number; y: number; facing: Direction3D }) || start;

        if (activeTool === "start") return { start: { ...startAt, x, z, y: level } };

        const here = (c: GridCell3D) => c.x === x && c.z === z;
        const atThisHeight = (c: GridCell3D) => (c.y ?? 0) === level;

        // Height-aware, always. Matching on position and kind while ignoring
        // `y` is what made placing a platform delete the one below it.
        if (activeTool === "erase") {
          return {
            cells: current.filter((c) => !(here(c) && (stacked(c) ? atThisHeight(c) : true))),
          };
        }

        const isStacked = activeTool === "wall" || activeTool === "platform";
        const without = current.filter((c) => {
          if (!here(c)) return true;
          // A stacked tool replaces only what shares its height; a surface tool
          // replaces only another of its own kind.
          return isStacked ? !(stacked(c) && atThisHeight(c)) : c.type !== activeTool;
        });

        if (activeTool === "goal") {
          return {
            cells: [...without.filter((c) => c.type !== "goal"), { x, z, y: 0, type: "goal" }],
          };
        }
        if (activeTool === "door") {
          return { cells: [...without, { x, z, y: 0, type: "door", id: `door_${x}_${z}` }] };
        }
        if (activeTool === "button") {
          return { cells: [...without, { x, z, y: 0, type: "button", opens: "" }] };
        }

        return {
          cells: [...without, { x, z, y: isStacked ? level : 0, type: activeTool as CellType3D }],
        };
      });
    },
    [activeTool, level, start, updateWith],
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
    (width: number, depth: number) =>
      updateWith((previous) => {
        const current = (previous.cells as GridCell3D[]) || [];
        const startAt =
          (previous.start as { x: number; z: number; y: number; facing: Direction3D }) || start;
        return {
          grid_width: width,
          grid_depth: depth,
          cells: current.filter((c) => c.x < width && c.z < depth),
          start: {
            ...startAt,
            x: clamp(startAt.x, 0, width - 1),
            z: clamp(startAt.z, 0, depth - 1),
          },
        };
      }),
    [start, updateWith],
  );

  const linkDoor = useCallback(
    (at: { x: number; z: number }, doorId: string) =>
      updateWith((previous) => {
        const current = (previous.cells as GridCell3D[]) || [];
        return {
          cells: current.map((c) =>
            c.type === "button" && c.x === at.x && c.z === at.z ? { ...c, opens: doorId } : c,
          ),
        };
      }),
    [updateWith],
  );

  const check = useCallback(async () => {
    setBusy("check");
    setPlaytest(null);
    try {
      const { data } = await exercisesApi.solveWorldLevel({ config });
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
        const { data } = await exercisesApi.previewWorldLevel({ config, source });
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

  /** A reference solution that loses is not a reference solution (FR-029). */
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

  const doors = cells.filter((c) => c.type === "door");
  const buttons = cells.filter((c) => c.type === "button");
  const blockers = answer?.blockers ?? [];
  const preview = useMemo(() => initialState(config), [config]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <NumberField
          label={t("robot.width")}
          value={gridWidth}
          min={2}
          max={10}
          onChange={(v) => resize(v, gridDepth)}
        />
        <NumberField
          label={t("world.depth")}
          value={gridDepth}
          min={2}
          max={10}
          onChange={(v) => resize(gridWidth, v)}
        />
        <NumberField
          label={t("robot.stepAllowance")}
          value={maxSteps}
          min={10}
          max={5000}
          onChange={(v) => update({ max_steps: v })}
        />
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

      {/* Painting the level */}
      {/* `items-start`, or the grid card stretches to the tool column's height
          and a 6×6 level sits in 200px of empty card. */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex w-[150px] flex-col gap-1.5">
          <span className="mb-1 text-xs font-medium text-text-muted">{t("robot.paint")}</span>
          {TOOLS.map((tool) => {
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
                {t(tool.key)}
              </button>
            );
          })}

          <label className="mt-2 block text-xs font-medium text-text-muted">
            {t("world.level")}
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value, 10))}
            aria-label={t("world.level")}
            className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm"
          >
            {Array.from({ length: MAX_HEIGHT + 1 }, (_, y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <p className="text-3xs text-text-subtle">{t("world.levelHint")}</p>

          <label className="mt-2 block text-xs font-medium text-text-muted">
            {t("robot.startFacing")}
          </label>
          <select
            value={start.facing}
            onChange={(e) => update({ start: { ...start, facing: e.target.value } })}
            aria-label={t("robot.startFacing")}
            className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-sm"
          >
            {FACINGS.map((d) => (
              <option key={d} value={d}>
                {t(`world.dir.${d}`)}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            disabled={history.length === 0}
            onClick={undo}
          >
            <Undo2 className="mr-1 h-3 w-3" /> {t("robot.undo")}
          </Button>
        </div>

        <div
          className="rounded-lg border border-border-strong bg-surface p-4"
          onPointerDown={() => setPainting(true)}
          onPointerUp={() => setPainting(false)}
          onPointerLeave={() => setPainting(false)}
        >
          <PlanGrid
            width={gridWidth}
            depth={gridDepth}
            cells={cells}
            level={level}
            start={start}
            onPress={paint}
            onEnter={(x, z) => painting && paint(x, z)}
          />
          <p className="mt-2 text-3xs text-text-subtle">{t("world.dragHint")}</p>
        </div>

        {/* The level as the pupil will meet it, updating as it is painted. */}
        <div className="min-w-[260px] flex-1">
          <p className="mb-1 text-xs font-medium text-text-muted">{t("world.preview")}</p>
          <div className="h-[260px] overflow-hidden rounded-lg border border-border-strong">
            <WorldScene state={preview} isRunning={false} />
          </div>
        </div>
      </div>

      {buttons.length > 0 && <DoorLinks buttons={buttons} doors={doors} onLink={linkDoor} t={t} />}

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
        busy={busy !== null}
        run={playtest}
        onPlaytest={runPlaytest}
        onSave={saveSolution}
        t={t}
      />

      <div className="rounded-lg border border-border-strong bg-surface p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">{t("robot.hints")}</h3>
        {hints.map((hint, i) => (
          <input
            key={i}
            value={hint}
            aria-label={t("robot.hints")}
            onChange={(e) => {
              const next = [...hints];
              next[i] = e.target.value;
              update({ hints: next });
            }}
            className="mb-1.5 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        ))}
        <Button variant="ghost" size="sm" onClick={() => update({ hints: [...hints, ""] })}>
          {t("robot.addHint")}
        </Button>
      </div>
    </div>
  );
}

// ─── The grid, seen from above ───────────────────────────────────────

/**
 * One square per cell, painted at the chosen height.
 *
 * What is on this height is drawn solid; what is on another height is a corner
 * pip, so a teacher can see the tower they are building without switching
 * levels to find it.
 */
function PlanGrid({
  width,
  depth,
  cells,
  level,
  start,
  onPress,
  onEnter,
}: {
  width: number;
  depth: number;
  cells: GridCell3D[];
  level: number;
  start: { x: number; z: number };
  onPress: (x: number, z: number) => void;
  onEnter: (x: number, z: number) => void;
}) {
  const size = Math.max(28, Math.min(46, Math.floor(320 / Math.max(width, depth))));

  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${width}, ${size}px)` }}>
      {Array.from({ length: depth }, (_, z) =>
        Array.from({ length: width }, (_, x) => {
          const here = cells.filter((c) => c.x === x && c.z === z);
          const atLevel = here.find((c) => stacked(c) && (c.y ?? 0) === level);
          const surface = here.filter((c) => !stacked(c));
          const elsewhere = here.some((c) => stacked(c) && (c.y ?? 0) !== level);
          const isStart = start.x === x && start.z === z;

          return (
            <button
              key={`${x},${z}`}
              data-cell={`${x},${z}`}
              onPointerDown={() => onPress(x, z)}
              onPointerEnter={() => onEnter(x, z)}
              style={{ width: size, height: size }}
              className={`relative flex items-center justify-center rounded-md border text-sm transition-colors ${
                atLevel?.type === "wall"
                  ? "border-clay-700 bg-clay-500"
                  : atLevel?.type === "platform"
                    ? "border-lagoon-600 bg-lagoon-400"
                    : "border-border bg-surface-2 hover:bg-surface"
              }`}
            >
              {surface.map((c) => (
                <span key={c.type} className="select-none">
                  {c.type === "item"
                    ? "⭐"
                    : c.type === "goal"
                      ? "🏁"
                      : c.type === "door"
                        ? "🚪"
                        : "🔴"}
                </span>
              ))}
              {isStart && (
                <span
                  data-start={`${x},${z}`}
                  className="absolute inset-x-0 bottom-0 text-3xs font-bold text-success-fg"
                >
                  ▲
                </span>
              )}
              {elsewhere && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-ink-400" />
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}

// ─── Buttons, and the doors they open ────────────────────────────────

/**
 * A button names its door by choosing one. Free text produced levels nobody
 * could finish, with nothing to say why.
 */
function DoorLinks({
  buttons,
  doors,
  onLink,
  t,
}: {
  buttons: GridCell3D[];
  doors: GridCell3D[];
  onLink: (at: { x: number; z: number }, doorId: string) => void;
  t: Translate;
}) {
  return (
    <div className="rounded-lg border border-border-strong bg-surface p-4">
      <h3 className="text-sm font-semibold text-text">{t("world.doors.title")}</h3>
      <p className="mb-2 text-xs text-text-subtle">{t("world.doors.hint")}</p>

      {doors.length === 0 && <p className="text-xs text-warning-fg">{t("world.doors.none")}</p>}

      {buttons.map((button) => (
        <div key={`${button.x},${button.z}`} className="mb-2 flex items-center gap-2">
          <span className="font-mono text-xs text-text-muted">
            🔴 ({button.x}, {button.z})
          </span>
          <select
            value={button.opens || ""}
            aria-label={t("world.doors.title")}
            onChange={(e) => onLink({ x: button.x, z: button.z }, e.target.value)}
            className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
          >
            <option value="">{t("world.doors.pick")}</option>
            {doors.map((door) => (
              <option key={door.id} value={door.id}>
                🚪 ({door.x}, {door.z})
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

// ─── What Check answered ─────────────────────────────────────────────

function AnswerLine({ answer, t }: { answer: WorldSolveAnswer; t: Translate }) {
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

  return (
    <p className="text-sm text-text-muted">
      {answer.steps === null
        ? t("robot.notCheckedNoSolution")
        : fill(t("robot.notCheckedYours"), { steps: answer.steps })}
      <span className="ml-1 text-xs text-text-subtle">({t("robot.reasonTargets")})</span>
    </p>
  );
}

function describeBlocker(blocker: WorldBlocker, t: Translate): string {
  const key = SHARED_BLOCKERS.has(blocker.code)
    ? `robot.blocker.${blocker.code}`
    : `world.blocker.${blocker.code}`;
  const text = t(key);
  return blocker.commands?.length ? `${text} — ${blocker.commands.join(", ")}` : text;
}

// ─── The palette ─────────────────────────────────────────────────────

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
              {t(`world.preset.${preset.id}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COMMAND_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="text-xs font-semibold text-text-muted">{t(`world.group.${group.id}`)}</p>
            {/* How far each movement command climbs, where the teacher decides
                whether to offer it — otherwise the choice between walking and
                jumping is made without knowing what it buys. */}
            {group.id === "movement" && (
              <p className="text-3xs text-text-subtle">{t("world.climbHint")}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {group.commands.map((command) => {
                const on = commands.includes(command);
                return (
                  <button
                    key={command}
                    onClick={() => onToggle(command)}
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
  );
}

// ─── The win condition, as rows ──────────────────────────────────────

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

  const set = (next: ParsedWin) => onChange(serializeWin(next));

  return (
    <div className="rounded-lg border border-border-strong bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-text">{t("robot.winTitle")}</h3>
        {parsed.leaves.length > 1 && (
          <select
            value={parsed.mode}
            aria-label={t("robot.winTitle")}
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
        const replace = (next: WinLeaf) => {
          const leaves = [...parsed.leaves];
          leaves[i] = next;
          set({ ...parsed, leaves });
        };

        return (
          <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={leaf.negated}
                onChange={(e) => replace({ ...leaf, negated: e.target.checked })}
              />
              {t("robot.winNot")}
            </label>

            <select
              value={leaf.cond}
              aria-label={t("robot.winTitle")}
              onChange={(e) =>
                replace({ cond: e.target.value, negated: leaf.negated, n: 1, x: 0, z: 0 })
              }
              className="rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
            >
              {CONDITIONS.map((c) => (
                <option key={c.cond} value={c.cond}>
                  {t(c.key)}
                </option>
              ))}
            </select>

            {meta?.arg === "n" && (
              <input
                type="number"
                value={leaf.n ?? 1}
                aria-label={t(meta.key)}
                onChange={(e) => replace({ ...leaf, n: parseInt(e.target.value, 10) || 0 })}
                className="w-20 rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
              />
            )}

            {meta?.arg === "xz" && (
              <>
                <input
                  type="number"
                  value={leaf.x ?? 0}
                  aria-label="x"
                  onChange={(e) => replace({ ...leaf, x: parseInt(e.target.value, 10) || 0 })}
                  className="w-16 rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
                />
                <input
                  type="number"
                  value={leaf.z ?? 0}
                  aria-label="z"
                  onChange={(e) => replace({ ...leaf, z: parseInt(e.target.value, 10) || 0 })}
                  className="w-16 rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs"
                />
              </>
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
        {t("robot.addCondition")}
      </Button>
    </div>
  );
}

// ─── The teacher's own solution ──────────────────────────────────────

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
  run: WorldRunResult | null;
  onPlaytest: (source: string) => Promise<WorldRunResult | null>;
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
        aria-label={t("robot.solutionTitle")}
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
        aria-label={label}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || min)}
        className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
      />
    </div>
  );
}

// ─── The win expression, to and from rows ────────────────────────────

interface WinLeaf {
  cond: string;
  negated: boolean;
  n?: number;
  x?: number;
  z?: number;
}

interface ParsedWin {
  mode: "all" | "any";
  leaves: WinLeaf[];
}

/** Null when the expression is nested more deeply than rows can show. */
function parseWin(win: Record<string, unknown>): ParsedWin | null {
  const leaf = (node: Record<string, unknown>, negated: boolean): WinLeaf | null =>
    typeof node.cond === "string"
      ? {
          cond: node.cond,
          negated,
          n: node.n as number,
          x: node.x as number,
          z: node.z as number,
        }
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
    if (l.cond === "steps_at_most" || l.cond === "height_at_least") base.n = l.n ?? 1;
    if (l.cond === "at") {
      base.x = l.x ?? 0;
      base.z = l.z ?? 0;
    }
    return l.negated ? { op: "not", of: [base] } : base;
  };

  if (parsed.leaves.length === 1) return node(parsed.leaves[0]);
  return { op: parsed.mode === "all" ? "and" : "or", of: parsed.leaves.map(node) };
}
