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
  const difficulty = (config.difficulty as Difficulty) || "beginner";
  const hints = (config.hints as string[]) || [];
  const allowPython = (config.allow_python as boolean) || false;

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
  const [isDark, setIsDark] = useState(false);

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
      setFailed(mode === "python" ? "No commands found. Write robot.move_forward() etc." : "No commands to execute. Add some blocks!");
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
        setFailed("Program finished but the goal was not reached.");
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
    onSubmit({
      completed: true,
      score: 1.0,
      steps_used: stepsUsed,
      time_seconds: elapsed,
      code_snapshot: mode === "python" ? pythonCode : (codeRef.current.python || codeRef.current.js),
    });
  }, [onSubmit, stepsUsed]);

  if (!gridState) return null;

  return (
    <div className="flex h-full flex-col gap-0 -mx-5 -mb-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-[#1E1E1E]">
        <div className="flex items-center gap-2">
          {allowPython && (
            <div className="flex rounded-lg border border-slate-200 dark:border-white/10">
              <button
                onClick={() => setMode("blocks")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "blocks"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <Blocks className="h-3.5 w-3.5" />
                Blocks
              </button>
              <button
                onClick={() => setMode("python")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "python"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                Python
              </button>
            </div>
          )}
          <span className="text-xs text-slate-400">
            Steps: {stepsUsed}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed control */}
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="range"
              min={50}
              max={600}
              step={50}
              value={650 - speed}
              onChange={(e) => setSpeed(650 - parseInt(e.target.value))}
              className="h-1.5 w-16 accent-indigo-500"
              title="Speed"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleStep}
            disabled={isRunning || completed}
            title="Step"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>

          {isRunning ? (
            <Button size="sm" onClick={handlePause}>
              {isPaused ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
              {isPaused ? "Resume" : "Pause"}
            </Button>
          ) : (
            <Button size="sm" onClick={handlePlay} disabled={completed}>
              <Play className="h-3.5 w-3.5" />
              Run
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main content: Editor + Grid */}
      <div className="flex flex-1" style={{ minHeight: 500 }}>
        {/* Code workspace */}
        <div className="flex-1 border-r border-slate-200 dark:border-white/10">
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

        {/* Grid + status */}
        <div className="flex w-[380px] flex-col">
          <div className="flex-1 flex items-center justify-center bg-slate-50 p-4 dark:bg-[#161622]">
            <GridRenderer state={gridState} cellSize={Math.min(48, 320 / Math.max(gridWidth, gridHeight))} />
          </div>

          {/* Status bar */}
          <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#1E1E1E]">
            {completed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Trophy className="h-5 w-5" />
                  <span className="text-sm font-semibold">Level Complete!</span>
                  <span className="text-xs text-slate-400">
                    {stepsUsed} steps
                  </span>
                </div>
                <Button size="sm" onClick={handleSubmit}>
                  Submit
                </Button>
              </div>
            ) : failed ? (
              <div className="space-y-2">
                <p className="text-sm text-red-500 dark:text-red-400">
                  {failed}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    Try Again
                  </Button>
                  {hints.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowHint(true);
                        setHintIndex(
                          Math.min(hintIndex, hints.length - 1)
                        );
                      }}
                    >
                      <Lightbulb className="mr-1 h-3.5 w-3.5" />
                      Hint
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {winCondition === "reach_goal"
                    ? "Guide the robot to the goal"
                    : winCondition === "collect_all"
                      ? `Collect all items (${gridState.robot.collected}/${gridState.totalItems})`
                      : "Complete the objective"}
                </span>
                {hints.length > 0 && (
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-1 text-amber-500 hover:text-amber-600"
                  >
                    <Lightbulb className="h-3 w-3" />
                    Hint
                  </button>
                )}
              </div>
            )}

            {showHint && hints.length > 0 && (
              <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <p>{hints[hintIndex]}</p>
                {hints.length > 1 && hintIndex < hints.length - 1 && (
                  <button
                    onClick={() => setHintIndex(hintIndex + 1)}
                    className="mt-1 text-amber-600 underline dark:text-amber-400"
                  >
                    Next hint
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
