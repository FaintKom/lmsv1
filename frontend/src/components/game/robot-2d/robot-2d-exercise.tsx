"use client";

/**
 * The pupil's side of a robot level.
 *
 * Run posts the program and gets back every frame the server's own run
 * produced. Nothing here decides whether the level was won — it plays what it
 * is handed. That is the point: the browser used to declare its own victory and
 * the server recorded the claim.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Blocks,
  Bot,
  ChevronDown,
  ChevronRight,
  Code,
  Gauge,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Star,
  Terminal,
} from "lucide-react";
import Editor from "@monaco-editor/react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { exercisesApi, type RobotRunResult } from "@/lib/api/exercises";
import GridRenderer from "./grid-renderer";
import { initialState, stateAt, type GridState } from "./grid-engine";
import { TracePlayer } from "@/components/game/engine/trace-player";
import { buildToolboxFromBlocks } from "@/components/game/blockly/toolbox-configs";

const BlocklyWorkspace = dynamic(
  () => import("@/components/game/blockly/blockly-workspace"),
  { ssr: false },
);

interface Robot2DExerciseProps {
  exerciseId: string;
  config: Record<string, unknown>;
  /** The program, and nothing about how it went. */
  onSubmit: (result: { source: string; mode: "python" | "blocks" }) => void;
}

const DEFAULT_COMMANDS = ["move_forward", "turn_left", "turn_right", "at_goal"];

export default function Robot2DExercise({
  exerciseId,
  config,
  onSubmit,
}: Robot2DExerciseProps) {
  const { t } = useTranslation();

  /** The one record of what this level offers (FR-013, FR-014). */
  const commands = useMemo(() => {
    const chosen = config.commands as string[] | undefined;
    return chosen?.length ? chosen : DEFAULT_COMMANDS;
  }, [config.commands]);

  const hints = useMemo(() => (config.hints as string[]) || [], [config.hints]);
  const toolbox = useMemo(() => buildToolboxFromBlocks(commands), [commands]);

  /** Coloured marks change what `paint` means, so the header must say so. */
  const paintColors = useMemo(() => {
    const cells = (config.cells as { mark_color?: string }[]) || [];
    return [...new Set(cells.map((c) => c.mark_color).filter(Boolean))] as string[];
  }, [config.cells]);

  /** Header and autocompletion read the same list, so they cannot disagree. */
  const starter = useMemo(
    () =>
      `# ${t("game.starterHeader")}\n` +
      commands
        .map((c) =>
          c === "paint" && paintColors.length
            ? `#   paint("${paintColors[0]}")  # ${paintColors.join(", ")}`
            : `#   ${c}()`,
        )
        .join("\n") +
      "\n\n",
    [commands, paintColors, t],
  );

  // Held in refs so the player's callbacks never read a stale render's copy.
  // The defect this component shipped with was exactly that: `handlePlay` closed
  // over `mode` and `pythonCode` behind a dependency array naming neither, so
  // edited Python never ran.
  const frames = useRef<RobotRunResult["frames"]>([]);
  const won = useRef(false);
  const blocklyPython = useRef("");
  /**
   * The program the loaded trace came from.
   *
   * Without it, Step replayed whatever ran last: it only fetched a new trace
   * when the player was empty, so a pupil who edited their code and pressed
   * Step watched the old program walk again.
   */
  const ranSource = useRef<string | null>(null);

  const [mode, setMode] = useState<"blocks" | "python">("blocks");
  const [pythonCode, setPythonCode] = useState(starter);
  const [gridState, setGridState] = useState<GridState>(() => initialState(config));
  const [result, setResult] = useState<RobotRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Built in an effect, not during render. The callbacks read refs, and a ref
  // read from a `useMemo` factory or a state initialiser is a read during
  // render — which is the rule that catches components going stale.
  const playerRef = useRef<TracePlayer | null>(null);

  /* ── The editor itself, so a run can point at the line that broke ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef = useRef<any>(null);
  /** Run from a keyboard shortcut, which fires with a stale closure otherwise. */
  const playRef = useRef<() => void>(() => {});
  const [showCommands, setShowCommands] = useState(true);

  useEffect(() => {
    const player = new TracePlayer({
      onFrame: (_frame, index) => {
        setGridState(stateAt(config, frames.current, index + 1, won.current));
      },
      onEnd: () => {
        setRunning(false);
        setPaused(false);
      },
    });
    playerRef.current = player;
    return () => player.stop();
  }, [config]);

  // No effect resets this component when the level changes. The renderer keys
  // it on the exercise id, so a different level is a different instance and
  // every piece of state above starts fresh on its own — which is React's own
  // answer to "reset when a prop changes", and cheaper than five setState calls
  // in an effect.

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark") || mq.matches);
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    mq.addEventListener("change", check);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", check);
    };
  }, []);

  const currentSource = useCallback(
    () => (mode === "python" ? pythonCode : blocklyPython.current),
    [mode, pythonCode],
  );

  const handleReset = useCallback(() => {
    playerRef.current?.reset();
    setGridState(initialState(config));
    setResult(null);
    setFailure(null);
    setRunning(false);
    setPaused(false);
  }, [config]);

  const runProgram = useCallback(async (): Promise<RobotRunResult | null> => {
    const source = currentSource().trim();
    if (!source) {
      setFailure(t(mode === "python" ? "game.noCommandsPython" : "game.noCommands"));
      return null;
    }

    setFailure(null);
    try {
      const { data } = await exercisesApi.runRobot(exerciseId, { source, mode });
      setResult(data);
      frames.current = data.frames;
      won.current = data.won;
      ranSource.current = source;
      playerRef.current?.load(data.frames);
      return data;
    } catch {
      setFailure(t("game.runnerUnavailable"));
      return null;
    }
  }, [currentSource, exerciseId, mode, t]);

  const handlePlay = useCallback(async () => {
    handleReset();
    if (!(await runProgram())) return;
    setRunning(true);
    await playerRef.current?.play(speed);
  }, [handleReset, runProgram, speed]);

  const handleStep = useCallback(async () => {
    // Re-run whenever the program has changed since the loaded trace, not only
    // when there is no trace at all. Otherwise editing the code and pressing
    // Step walks the previous program.
    const stale =
      (playerRef.current?.length ?? 0) === 0 || ranSource.current !== currentSource().trim();

    if (stale) {
      handleReset();
      if (!(await runProgram())) return;
    }
    playerRef.current?.step();
  }, [currentSource, handleReset, runProgram]);

  const handlePause = useCallback(() => {
    if (paused) {
      playerRef.current?.resume();
      setPaused(false);
    } else {
      playerRef.current?.pause();
      setPaused(true);
    }
  }, [paused]);

  const handleSubmit = useCallback(() => {
    onSubmit({ source: currentSource(), mode });
  }, [currentSource, mode, onSubmit]);

  // Ctrl/Cmd+Enter reads this, so the shortcut always runs the current code.
  useEffect(() => {
    playRef.current = handlePlay;
  }, [handlePlay]);

  /**
   * Put the run's error where it is fixed: on its line, in the editor.
   *
   * The server names the line; until now it was named only in a strip under
   * the board, and the pupil counted lines with a finger. Markers are cleared
   * on every run, so a fixed program looks fixed.
   */
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const error = result?.error;
    if (!error || error.line == null) {
      monaco.editor.setModelMarkers(model, "robot", []);
      return;
    }
    const line = Math.min(Math.max(error.line, 1), model.getLineCount());
    monaco.editor.setModelMarkers(model, "robot", [
      {
        severity: monaco.MarkerSeverity.Error,
        message: `${error.type}: ${error.message}`,
        startLineNumber: line,
        endLineNumber: line,
        startColumn: 1,
        endColumn: model.getLineMaxColumn(line),
      },
    ]);
    editor.revealLineInCenter(line);
  }, [result]);

  /** Drop a command at the cursor — the reference list is clickable. */
  const insertCommand = useCallback((command: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    editor.executeEdits("commands", [
      { range: selection, text: `${command}\n`, forceMoveMarkers: true },
    ]);
    editor.focus();
  }, []);

  const task = describeGoal(config.win, t);
  const stars = result?.stars ?? 0;
  const finished = Boolean(result?.won);
  /**
   * Why the world said no, in the pupil's language. The 3D twin does the same
   * with the same keys, because a wall means a wall in both.
   *
   * Ahead of the end-of-run message, because it is the more useful of the two:
   * "a wall is in the way" names the square to look at, where "the goal was not
   * reached" restates the score. The robot has always shaken at this moment and
   * never said why.
   */
  const refused = gridState.collision ? t(`game.refused.${gridState.collision}`) : null;
  const problem = failure ?? refused ?? describeStop(result, t);
  const cellSize = useCellSize(gridState.width, gridState.height);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* The board */}
        <div className="flex w-full shrink-0 flex-col bg-[#f2f0eb] lg:w-[480px]">
          <div className="flex items-center gap-3 border-b border-[#e5e0d5] bg-surface px-4 py-3">
            {/* An SVG, not an emoji: the same picture on every machine. */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-[#4C97FF] text-white">
              <Bot className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-text">{task}</p>
          </div>

          <div className="flex max-h-[50vh] flex-1 items-center justify-center overflow-hidden p-3 lg:max-h-none lg:p-5">
            <GridRenderer state={gridState} cellSize={cellSize} />
          </div>

          <div className="flex items-center justify-between border-t border-[#e5e0d5] bg-surface px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-surface-2 px-2 py-1 text-2xs font-semibold text-text-muted">
                {gridState.stepsUsed} {t("game.steps")}
              </span>
              {result && (
                <span className="rounded-md bg-surface-2 px-2 py-1 text-2xs font-semibold text-text-muted">
                  {result.size} {t("game.statements")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                title={t("game.reset")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6] text-white shadow-sm transition hover:bg-[#7c3aed] active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={handleStep}
                disabled={running}
                title={t("game.step")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-200 text-text-muted transition hover:bg-ink-300 active:scale-95 disabled:opacity-30"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {running ? (
                <button
                  onClick={handlePause}
                  title={paused ? t("game.resume") : t("game.pause")}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-[#FFA400] px-5 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:bg-[#e69400] active:scale-95"
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  title={`${t("game.run")} — ${t("game.runShortcut")}`}
                  // The shortcut is a hint for the eye and a fact for assistive
                  // tech — but not part of the button's name, which stays "Run".
                  aria-keyshortcuts="Control+Enter"
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-[#FFA400] px-6 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:bg-[#e69400] active:scale-95"
                >
                  <Play className="h-4 w-4" />
                  {t("game.run")}
                  <span
                    aria-hidden="true"
                    className="hidden text-2xs font-medium opacity-80 sm:inline"
                  >
                    {t("game.runShortcut")}
                  </span>
                </button>
              )}

              <div className="ml-1 hidden items-center gap-1 sm:flex">
                <Gauge className="h-3.5 w-3.5 text-text-subtle" />
                <input
                  type="range"
                  min={50}
                  max={600}
                  step={50}
                  value={650 - speed}
                  onChange={(e) => setSpeed(650 - parseInt(e.target.value, 10))}
                  className="h-1 w-12 accent-[#FFA400]"
                  aria-label={t("game.speed")}
                />
              </div>
            </div>

            <div>
              {hints.length > 0 && !finished && (
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1 rounded-lg bg-warning-soft px-2.5 py-1.5 text-xs font-semibold text-warning-fg transition-colors"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  {t("game.hint")}
                </button>
              )}
            </div>
          </div>

          {(finished || problem || showHint) && (
            <div className="border-t border-border-strong bg-surface px-4 py-3">
              {finished && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((n) => (
                        <Star
                          key={n}
                          className={`h-5 w-5 transition ${
                            n <= stars ? "scale-110 fill-warning text-warning" : "text-text-subtle"
                          }`}
                        />
                      ))}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-primary">
                        {t("game.levelComplete")}
                      </span>
                      <span className="ml-2 text-xs text-text-subtle">
                        {result?.steps} {t("game.steps")} · {result?.size}{" "}
                        {t("game.statements")}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSubmit}>
                    {t("game.submit")}
                  </Button>
                </div>
              )}

              {problem && !finished && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-danger-fg">{problem}</span>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    {t("game.tryAgain")}
                  </Button>
                </div>
              )}

              {showHint && hints.length > 0 && !finished && (
                <div className="mt-2 rounded-lg bg-warning-soft p-2.5 text-xs text-warning-fg">
                  <p>{hints[hintIndex]}</p>
                  {hintIndex < hints.length - 1 && (
                    <button
                      onClick={() => setHintIndex(hintIndex + 1)}
                      className="mt-1 underline"
                    >
                      {t("game.nextHint")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* The program */}
        <div className="flex min-h-[250px] min-w-0 flex-1 flex-col border-t border-[#e5e0d5] lg:border-l lg:border-t-0">
          <div className="flex items-center gap-1 border-b border-border-strong/60 bg-surface px-4 py-2">
            <button
              onClick={() => setMode("blocks")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "blocks"
                  ? "bg-primary-soft text-success-fg"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Blocks className="h-3.5 w-3.5" /> {t("game.blocksTab")}
            </button>
            <button
              onClick={() => setMode("python")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "python"
                  ? "bg-primary-soft text-success-fg"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Code className="h-3.5 w-3.5" /> {t("game.pythonTab")}
            </button>
          </div>

          <div className="min-h-0 flex-1">
            {mode === "python" ? (
              <Editor
                height="100%"
                language="python"
                value={pythonCode}
                onChange={(v) => setPythonCode(v || "")}
                theme={isDark ? "vs-dark" : "vs-light"}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                  registerCommandCompletion(monaco, commands);
                  // Run without leaving the keyboard — what every code editor
                  // a pupil has seen does.
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
                    playRef.current(),
                  );
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  padding: { top: 12 },
                  fontFamily: "'Geist Mono', 'Fira Code', 'Consolas', monospace",
                }}
              />
            ) : (
              <BlocklyWorkspace
                toolbox={toolbox}
                mode="blocks"
                onCodeChange={(_js, python) => {
                  blocklyPython.current = python;
                }}
                className="h-full w-full"
              />
            )}
          </div>

          {/* The commands this level offers, spelled out and clickable. They
              used to exist only as comments in the starter file, so clearing
              it took the reference with it. */}
          {mode === "python" && commands.length > 0 && (
            <div className="border-t border-border-strong bg-surface">
              <button
                onClick={() => setShowCommands((s) => !s)}
                className="flex w-full items-center gap-1.5 px-4 py-1.5 text-2xs font-semibold uppercase tracking-wider text-text-subtle hover:text-text"
              >
                {showCommands ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {t("game.commandsTitle")}
              </button>
              {showCommands && (
                <div className="flex flex-wrap gap-1 px-4 pb-2">
                  {commands.map((c) => {
                    const call =
                      c === "paint" && paintColors.length ? `paint("${paintColors[0]}")` : `${c}()`;
                    return (
                      <button
                        key={c}
                        onClick={() => insertCommand(call)}
                        title={t(`game.command.${c}`)}
                        className="rounded-md bg-surface-2 px-2 py-1 font-mono text-2xs text-text-muted transition-colors hover:bg-primary-soft hover:text-success-fg"
                      >
                        {call}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* The console: what the program printed, and what broke — labelled
              and told apart, not one unnamed strip holding both. */}
          {result && (result.output || result.error) && (
            <div className="max-h-32 overflow-auto border-t border-border-strong bg-surface-2">
              <div className="flex items-center gap-1.5 px-4 pt-2 text-2xs font-semibold uppercase tracking-wider text-text-subtle">
                <Terminal className="h-3 w-3" />
                {t("game.console")}
              </div>
              <div className="px-4 pb-2 font-mono text-2xs">
                {result.error && (
                  <p className="font-semibold text-danger-fg">
                    {result.error.line !== null ? `${t("game.line")} ${result.error.line}: ` : ""}
                    {result.error.type}: {result.error.message}
                  </p>
                )}
                {result.output && (
                  <pre className="whitespace-pre-wrap text-text-muted">
                    {result.output}
                    {result.output_truncated ? `\n… ${t("game.outputTruncated")}` : ""}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function useCellSize(width: number, height: number) {
  const [size, setSize] = useState(60);
  useEffect(() => {
    const measure = () =>
      setSize(
        Math.floor(
          Math.min(
            window.innerWidth < 1024 ? window.innerWidth - 40 : 460,
            window.innerWidth < 1024
              ? window.innerHeight * 0.4
              : window.innerHeight - 180,
          ) / Math.max(width, height),
        ),
      );
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [width, height]);
  return size;
}

/** The goal, in words. It is the pupil's instructions, not a secret (FR-031). */
function describeGoal(win: unknown, t: (key: string) => string): string {
  const node = win as { op?: string; of?: unknown[]; cond?: string } | undefined;
  if (!node) return t("game.completeTask");
  if (node.op) {
    const parts = (node.of || []).map((child) => describeGoal(child, t));
    if (node.op === "not") return `${t("game.goalNot")} ${parts[0]}`;
    const joiner = node.op === "and" ? t("game.goalAnd") : t("game.goalOr");
    return parts.join(` ${joiner} `);
  }
  return t(`game.goal.${node.cond}`);
}

/** Why the run stopped, when it stopped badly. */
function describeStop(
  result: RobotRunResult | null,
  t: (key: string) => string,
): string | null {
  if (!result || result.won) return null;
  if (result.stopped === "steps_exhausted") return t("game.stepsExhausted");
  if (result.error) return null; // shown in the output pane, with its line
  return t("game.goalNotReached");
}

/** Offer exactly the commands this level allows, and nothing else. */
function registerCommandCompletion(
  monaco: typeof import("monaco-editor"),
  commands: string[],
) {
  monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: commands.map((name) => ({
          label: name,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `${name}()`,
          range,
        })),
      };
    },
  });
}
