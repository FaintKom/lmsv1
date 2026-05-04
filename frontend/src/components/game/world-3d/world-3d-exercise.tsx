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
import { SceneEngine, type WorldState, type GridCell3D } from "./scene-engine";
import {
 StepExecutor,
 parseCommands,
 type GameCommand,
} from "@/components/game/engine/step-executor";
import type { Difficulty } from "@/components/game/blockly/toolbox-configs";
import { DIFFICULTY_3D_TOOLBOXES } from "@/components/game/blockly/toolbox-configs";

const BlocklyWorkspace = dynamic(
 () => import("@/components/game/blockly/blockly-workspace"),
 { ssr: false }
);

const SceneRenderer = dynamic(() => import("./scene-renderer"), {
 ssr: false,
 loading: () => (
 <div className="flex h-full items-center justify-center bg-[#1a1a2e] text-text-subtle text-sm">
 Loading 3D scene...
 </div>
 ),
});

interface World3DExerciseProps {
 exerciseId: string;
 config: Record<string, unknown>;
 onSubmit: (result: {
 completed: boolean;
 score: number;
 steps_used: number;
 time_seconds: number;
 code_snapshot: string | null;
 }) => void;
}

export default function World3DExercise({
 exerciseId,
 config,
 onSubmit,
}: World3DExerciseProps) {
 const gridWidth = (config.grid_width as number) || 6;
 const gridDepth = (config.grid_depth as number) || 6;
 const cells = (config.cells as GridCell3D[]) || [];
 const playerStart = (config.player_start as { x: number; y?: number; z: number; direction?: "north" | "east" | "south" | "west" }) || { x: 0, z: 0 };
 const winCondition = (config.win_condition as "reach_goal" | "collect_all" | "custom") || "reach_goal";
 const difficulty = (config.difficulty as Difficulty) || "beginner";
 const maxBlocks = config.max_blocks as number | undefined;
 const hints = (config.hints as string[]) || [];
 const allowPython = (config.allow_python as boolean) || false;

 const [worldState, setWorldState] = useState<WorldState | null>(null);
 const [mode, setMode] = useState<"blocks" | "python">("blocks");
 const [isRunning, setIsRunning] = useState(false);
 const [isPaused, setIsPaused] = useState(false);
 const [speed, setSpeed] = useState(400);
 const [showHint, setShowHint] = useState(false);
 const [hintIndex, setHintIndex] = useState(0);
 const [completed, setCompleted] = useState(false);
 const [failed, setFailed] = useState<string | null>(null);
 const [stepsUsed, setStepsUsed] = useState(0);

 const engineRef = useRef<SceneEngine | null>(null);
 const executorRef = useRef<StepExecutor>(new StepExecutor());
 const codeRef = useRef({ js: "", python: "", xml: "" });
 const startTimeRef = useRef<number>(0);

 useEffect(() => {
 const engine = new SceneEngine(gridWidth, gridDepth, cells, playerStart, winCondition);
 engineRef.current = engine;
 setWorldState(engine.getState());
 setCompleted(false);
 setFailed(null);
 setStepsUsed(0);
 }, []);

 const handleCodeChange = useCallback((js: string, python: string, xml: string) => {
 codeRef.current = { js, python, xml };
 }, []);

 const handleReset = useCallback(() => {
 executorRef.current.reset();
 if (engineRef.current) {
 setWorldState(engineRef.current.reset());
 }
 setIsRunning(false);
 setIsPaused(false);
 setCompleted(false);
 setFailed(null);
 setStepsUsed(0);
 }, []);

 const handlePlay = useCallback(async () => {
 if (!engineRef.current) return;
 const engine = engineRef.current;
 handleReset();

 const commands = parseCommands(codeRef.current.js);
 if (commands.length === 0) {
 setFailed("No commands to execute. Add some blocks!");
 return;
 }

 const executor = executorRef.current;
 executor.load(commands, (cond) => engine.evaluateCondition(cond));
 executor.setSpeed(speed);
 startTimeRef.current = Date.now();

 executor.onStep = (cmd: GameCommand) => {
 const result = engine.executeCommand(cmd.type);
 setWorldState(engine.getState());
 setStepsUsed(executor.totalSteps);

 if (!result.success) {
 setFailed(result.message || "Command failed");
 return true;
 }
 if (engine.checkWinCondition()) {
 setCompleted(true);
 return true;
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
 code_snapshot: codeRef.current.python || codeRef.current.js,
 });
 }, [onSubmit, stepsUsed]);

 if (!worldState) return null;

 return (
 <div className="flex h-full flex-col gap-0">
 {/* Toolbar */}
 <div className="flex items-center justify-between border-b border-border-strong bg-paper-2 px-4 py-2 ">
 <div className="flex items-center gap-2">
 {allowPython && (
 <div className="flex rounded-lg border border-border-strong ">
 <button onClick={() => setMode("blocks")}
 className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${mode === "blocks" ? "bg-primary-soft text-success-fg " : "text-text-muted"}`}>
 <Blocks className="h-3.5 w-3.5" /> Blocks
 </button>
 <button onClick={() => setMode("python")}
 className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${mode === "python" ? "bg-primary-soft text-success-fg " : "text-text-muted"}`}>
 <Code className="h-3.5 w-3.5" /> Python
 </button>
 </div>
 )}
 <span className="text-xs text-text-subtle">Steps: {stepsUsed}</span>
 </div>

 <div className="flex items-center gap-2">
 <Gauge className="h-3.5 w-3.5 text-text-subtle" />
 <input type="range" min={50} max={800} step={50} value={850 - speed}
 onChange={(e) => setSpeed(850 - parseInt(e.target.value))}
 className="h-1.5 w-16 accent-emerald-500" title="Speed" />

 {isRunning ? (
 <Button size="sm" onClick={handlePause}>
 {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
 {isPaused ? "Resume" : "Pause"}
 </Button>
 ) : (
 <Button size="sm" onClick={handlePlay} disabled={completed}>
 <Play className="h-3.5 w-3.5" /> Run
 </Button>
 )}

 <Button variant="outline" size="sm" onClick={handleReset}>
 <RotateCcw className="h-3.5 w-3.5" />
 </Button>
 </div>
 </div>

 {/* Main: Blockly + 3D Scene */}
 <div className="flex flex-1" style={{ minHeight: 520 }}>
 {/* Blockly */}
 <div className="w-[380px] border-r border-border-strong ">
 <BlocklyWorkspace
 toolbox={DIFFICULTY_3D_TOOLBOXES[difficulty]}
 mode={mode}
 maxBlocks={maxBlocks}
 onCodeChange={handleCodeChange}
 className="h-full w-full"
 />
 </div>

 {/* 3D Viewport + status */}
 <div className="flex flex-1 flex-col">
 <div className="flex-1">
 <SceneRenderer state={worldState} isRunning={isRunning} />
 </div>

 {/* Status */}
 <div className="border-t border-border-strong bg-paper-2 p-3 ">
 {completed ? (
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-primary ">
 <Trophy className="h-5 w-5" />
 <span className="text-sm font-semibold">Level Complete!</span>
 <span className="text-xs text-text-subtle">{stepsUsed} steps</span>
 </div>
 <Button size="sm" onClick={handleSubmit}>Submit</Button>
 </div>
 ) : failed ? (
 <div className="space-y-2">
 <p className="text-sm text-danger-fg ">{failed}</p>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" onClick={handleReset}>Try Again</Button>
 {hints.length > 0 && (
 <Button variant="ghost" size="sm" onClick={() => { setShowHint(true); setHintIndex(Math.min(hintIndex, hints.length - 1)); }}>
 <Lightbulb className="mr-1 h-3.5 w-3.5" /> Hint
 </Button>
 )}
 </div>
 </div>
 ) : (
 <div className="flex items-center justify-between text-xs text-text-subtle">
 <span>
 {winCondition === "reach_goal" ? "Navigate to the green goal" :
 winCondition === "collect_all" ? `Collect all items (${worldState.player.collected}/${worldState.cells.filter(o => o.type === "collectible").length})` :
 "Complete the objective"}
 </span>
 {hints.length > 0 && (
 <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1 text-warning-fg hover:text-warning-fg">
 <Lightbulb className="h-3 w-3" /> Hint
 </button>
 )}
 </div>
 )}

 {showHint && hints.length > 0 && (
 <div className="mt-2 rounded-lg bg-sun-50 p-2.5 text-xs text-warning-fg ">
 <p>{hints[hintIndex]}</p>
 {hintIndex < hints.length - 1 && (
 <button onClick={() => setHintIndex(hintIndex + 1)} className="mt-1 text-warning-fg underline ">Next hint</button>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
