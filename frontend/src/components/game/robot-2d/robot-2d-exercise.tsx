"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Gauge,
  Code,
  Blocks,
  Lightbulb,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import GridRenderer from "./grid-renderer";
import { GridEngine, type GridState, type Cell } from "./grid-engine";
import {
  StepExecutor,
  parseCommands,
  parsePythonCommands,
  type GameCommand,
} from "@/components/game/engine/step-executor";
import type { Difficulty } from "@/components/game/blockly/toolbox-configs";
import { DIFFICULTY_TOOLBOXES } from "@/components/game/blockly/toolbox-configs";
import Editor from "@monaco-editor/react";

const BlocklyWorkspace = dynamic(
  () => import("@/components/game/blockly/blockly-workspace"),
  { ssr: false }
);

interface Robot2DExerciseProps {
  exerciseId: string;
  config: Record<string, unknown>;
  onSubmit: (result: {
    completed: boolean;
    score: number;
    steps_used: number;
    time_seconds: number;
    code_snapshot: string;
  }) => void;
}

export default function Robot2DExercise({
  exerciseId,
  config,
  onSubmit,
}: Robot2DExerciseProps) {
  // Parse config
  const gridWidth = (config.grid_width as number) || 5;
  const gridHeight = (config.grid_height as number) || 5;
  const cells = (config.cells as Cell[]) || [];
  const winCondition = (config.win_condition as "reach_goal" | "collect_all" | "custom") || "reach_goal";
  const maxBlocks = config.max_blocks as number | undefined;
  const targetSteps = config.target_steps as number | undefined;
  const optimalBlocks = config.optimal_blocks as number | undefined;
  const difficulty = (config.difficulty as Difficulty) || "beginner";
  const hints = (config.hints as string[]) || [];
  const allowPython = (config.allow_python as boolean) || false;

  const { t } = useTranslation();

  const PYTHON_STARTER = `# Команды движения:
# robot.move_up()      — вверх
# robot.move_down()    — вниз
# robot.move_left()    — влево
# robot.move_right()   — вправо
# robot.pick_up()      — подобрать предмет
#
# Проверки:
# robot.is_wall_ahead()  — стена впереди?
# robot.is_item_here()   — предмет здесь?
# robot.is_at_goal()     — на цели?
#
# Пример:
# for i in range(3):
#   robot.move_right()

`;

  // State
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [mode, setMode] = useState<"blocks" | "python">("blocks");
  const [pythonCode, setPythonCode] = useState(PYTHON_STARTER);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [stepsUsed, setStepsUsed] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [isDark, setIsDark] = useState(false);

  /** Calculate stars: 1=completed, 2=efficient steps, 3=optimal blocks */
  const getStars = (steps: number, blocks: number): number => {
    let stars = 1; // completed
    if (targetSteps && steps <= targetSteps) stars = 2;
    if (optimalBlocks && blocks <= optimalBlocks) stars = 3;
    // If no targets configured, 3 stars for completion
    if (!targetSteps && !optimalBlocks) stars = 3;
    return stars;
  };

  // Refs
  const engineRef = useRef<GridEngine | null>(null);
  const executorRef = useRef<StepExecutor>(new StepExecutor());
  const codeRef = useRef({ js: "", python: "", xml: "" });
  const startTimeRef = useRef<number>(0);

  // Initialize engine
  useEffect(() => {
    const engine = new GridEngine(gridWidth, gridHeight, cells, winCondition);
    engineRef.current = engine;
    setGridState(engine.getState());
    setCompleted(false);
    setFailed(null);
    setStepsUsed(0);
  }, [gridWidth, gridHeight, cells, winCondition]);

  // Dark mode detection
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const check = () => setIsDark(document.documentElement.classList.contains("dark") || mq.matches);
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    mq.addEventListener("change", check);
    return () => { obs.disconnect(); mq.removeEventListener("change", check); };
  }, []);

  const handleCodeChange = useCallback(
    (js: string, python: string, xml: string) => {
      codeRef.current = { js, python, xml };
      // Count blocks from XML (each <block type= is a block)
      const count = (xml.match(/<block /g) || []).length;
      setBlockCount(count);
    },
    []
  );

  const handleReset = useCallback(() => {
    executorRef.current.reset();
    if (engineRef.current) {
      const state = engineRef.current.reset();
      setGridState(state);
    }
    setIsRunning(false);
    setIsPaused(false);
    setCompleted(false);
    setFailed(null);
    setStepsUsed(0);
  }, []);

  const handleStep = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;

    if (!executorRef.current.isRunning && !isRunning) {
      // Start fresh
      handleReset();
      const commands = mode === "python"
        ? parsePythonCommands(pythonCode)
        : parseCommands(codeRef.current.js);
      executorRef.current.load(commands, (cond) =>
        engine.evaluateCondition(cond)
      );
      startTimeRef.current = Date.now();
    }

    const cmd = executorRef.current.executeNext();
    if (cmd) {
      const result = engine.executeCommand(cmd.type);
      setGridState(result.newState);
      setStepsUsed(executorRef.current.totalSteps);

      if (engine.checkWinCondition()) {
        setCompleted(true);
        setIsRunning(false);
      }
    }
  }, [isRunning, handleReset]);

  const handlePlay = useCallback(async () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;

    // Reset first
    handleReset();
    const commands = mode === "python"
      ? parsePythonCommands(pythonCode)
      : parseCommands(codeRef.current.js);

    if (commands.length === 0) {
      setFailed(mode === "python" ? t("game.noCommandsPython") : t("game.noCommands"));
      return;
    }

    const executor = executorRef.current;
    executor.load(commands, (cond) => engine.evaluateCondition(cond));
    executor.setSpeed(speed);
    startTimeRef.current = Date.now();

    executor.onStep = (cmd: GameCommand) => {
      const result = engine.executeCommand(cmd.type);
      setGridState(result.newState);
      setStepsUsed(executor.totalSteps);

      if (!result.success) {
        setFailed(result.message || "Command failed");
        return true; // stop execution
      }

      if (engine.checkWinCondition()) {
        setCompleted(true);
        return true; // stop execution
      }
    };

    executor.onComplete = () => {
      setIsRunning(false);
      if (!engine.checkWinCondition()) {
        setFailed(t("game.goalNotReached"));
      }
    };

    executor.onError = (msg: string) => {
      setFailed(msg);
      setIsRunning(false);
    };

    setIsRunning(true);
    setFailed(null);
    await executor.executeAll(speed);
    setIsRunning(false);
  }, [speed, handleReset]);

  const handlePause = useCallback(() => {
    if (isPaused) {
      executorRef.current.resume();
      setIsPaused(false);
    } else {
      executorRef.current.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  const handleSubmit = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const stars = getStars(stepsUsed, blockCount);
    onSubmit({
      completed: true,
      score: stars / 3,
      steps_used: stepsUsed,
      time_seconds: elapsed,
      code_snapshot: mode === "python" ? pythonCode : (codeRef.current.python || codeRef.current.js),
    });
  }, [onSubmit, stepsUsed, blockCount]);

  if (!gridState) return null;

  const taskText = winCondition === "reach_goal"
    ? `🏁 ${t("game.reachGoal")}`
    : winCondition === "collect_all"
      ? `⭐ ${t("game.collectAll")} (${gridState.robot.collected}/${gridState.totalItems})`
      : `✅ ${t("game.completeTask")}`;

  const gridCellSize = typeof window !== "undefined"
    ? Math.floor(Math.min(
        window.innerWidth < 1024 ? window.innerWidth - 40 : 460,
        window.innerWidth < 1024 ? window.innerHeight * 0.4 : window.innerHeight - 180,
      ) / Math.max(gridWidth, gridHeight))
    : 60;

  return (
    <div className="flex h-full flex-col">
      {/* Main: Grid (top on mobile, left on desktop) + Code */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* Grid area — the hero */}
        <div className="flex w-full lg:w-[480px] shrink-0 flex-col bg-[#f2f0eb] dark:bg-[#1a1a1a]">
          {/* Speech-bubble instruction (like Code.org) */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#e5e0d5] dark:bg-[#222] dark:border-[#333]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4C97FF] text-white text-lg">
              🤖
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{taskText}</p>
          </div>

          {/* Grid visualization */}
          <div className="flex flex-1 items-center justify-center overflow-hidden p-3 lg:p-5 max-h-[50vh] lg:max-h-none">
            <GridRenderer state={gridState} cellSize={gridCellSize} />
          </div>

          {/* Playback controls — Code.org style */}
          <div className="flex items-center justify-between bg-white border-t border-[#e5e0d5] px-3 py-2.5 dark:bg-[#222] dark:border-[#333]">
            {/* Stats badges */}
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                {stepsUsed} {t("game.steps")}
              </span>
              {mode === "blocks" && (
                <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                  maxBlocks && blockCount > maxBlocks
                    ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                }`}>
                  {blockCount}{maxBlocks ? `/${maxBlocks}` : ""} {t("game.blocks")}
                </span>
              )}
            </div>

            {/* Center controls */}
            <div className="flex items-center gap-2">
              <button onClick={handleReset} title={t("game.reset")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#8B5CF6] text-white transition-all hover:bg-[#7c3aed] active:scale-95 shadow-sm">
                <RotateCcw className="h-4 w-4" />
              </button>

              <button onClick={handleStep} disabled={isRunning || completed} title={t("game.step")}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition-all hover:bg-slate-300 active:scale-95 disabled:opacity-30 dark:bg-white/10 dark:text-slate-300">
                <SkipForward className="h-4 w-4" />
              </button>

              {isRunning ? (
                <button onClick={handlePause}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-[#FFA400] px-5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:bg-[#e69400] active:scale-95 dark:shadow-none">
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? "▶" : "⏸"}
                </button>
              ) : (
                <button onClick={handlePlay} disabled={completed}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-[#FFA400] px-6 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:bg-[#e69400] active:scale-95 disabled:opacity-40 dark:shadow-none">
                  <Play className="h-4 w-4" />
                  {t("game.run")}
                </button>
              )}

              {/* Speed slider */}
              <div className="hidden sm:flex items-center gap-1 ml-1">
                <Gauge className="h-3.5 w-3.5 text-slate-400" />
                <input type="range" min={50} max={600} step={50}
                  value={650 - speed} onChange={(e) => setSpeed(650 - parseInt(e.target.value))}
                  className="h-1 w-12 accent-[#FFA400]" />
              </div>
            </div>

            {/* Hint */}
            <div>
              {hints.length > 0 && !completed && (
                <button onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20">
                  <Lightbulb className="h-3.5 w-3.5" />
                  {t("game.hint")}
                </button>
              )}
            </div>
          </div>

          {/* Status overlay: completion / failure / hint */}
          {(completed || failed || showHint) && (
            <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1E1E1E]">
              {completed && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className={`text-xl transition-all ${n <= getStars(stepsUsed, blockCount) ? "text-amber-400 scale-110" : "text-slate-300 dark:text-slate-600"}`}>★</span>
                      ))}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t("game.levelComplete")}</span>
                      <span className="ml-2 text-xs text-slate-400">{stepsUsed} {t("game.steps")} · {blockCount} {t("game.blocks")}</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleSubmit}>{t("game.submit")}</Button>
                </div>
              )}
              {failed && !completed && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-red-500 dark:text-red-400">{failed}</span>
                  <Button variant="outline" size="sm" onClick={handleReset}>{t("game.tryAgain")}</Button>
                </div>
              )}
              {showHint && hints.length > 0 && !completed && (
                <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  <p>{hints[hintIndex]}</p>
                  {hintIndex < hints.length - 1 && (
                    <button onClick={() => setHintIndex(hintIndex + 1)} className="mt-1 text-amber-600 underline dark:text-amber-400">{t("game.nextHint")}</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Code editor (bottom on mobile, right on desktop) */}
        <div className="flex flex-1 flex-col min-w-0 min-h-[250px] border-t lg:border-t-0 lg:border-l border-[#e5e0d5] dark:border-[#333]">
          {/* Mode toggle header */}
          {allowPython && (
            <div className="flex items-center gap-1 border-b border-slate-200/60 bg-white px-4 py-2 dark:border-white/5 dark:bg-[#1E1E1E]">
              <button onClick={() => setMode("blocks")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${mode === "blocks" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                <Blocks className="h-3.5 w-3.5" /> Блоки
              </button>
              <button onClick={() => setMode("python")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${mode === "python" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                <Code className="h-3.5 w-3.5" /> Python
              </button>
            </div>
          )}

          {/* Code area */}
          <div className="flex-1 min-h-0">
            {mode === "python" ? (
              <Editor
                height="100%"
                language="python"
                value={pythonCode}
                onChange={(v) => setPythonCode(v || "")}
                theme={isDark ? "vs-dark" : "vs-light"}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 12 },
                  fontFamily: "'Geist Mono', 'Fira Code', 'Consolas', monospace",
                }}
              />
            ) : (
              <BlocklyWorkspace
                difficulty={difficulty}
                mode="blocks"
                maxBlocks={maxBlocks}
                onCodeChange={handleCodeChange}
                className="h-full w-full"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
