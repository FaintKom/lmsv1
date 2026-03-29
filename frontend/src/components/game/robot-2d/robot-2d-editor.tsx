"use client";

import { useState, useCallback } from "react";
import {
  Square,
  Box,
  Star,
  Flag,
  Play as PlayIcon,
  Eraser,
  Save,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GridRenderer from "./grid-renderer";
import type { Cell, CellType, GridState } from "./grid-engine";
import type { Difficulty } from "@/components/game/blockly/toolbox-configs";
import { DIFFICULTY_BLOCKS } from "@/components/game/blockly/toolbox-configs";

interface Robot2DEditorProps {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const GRID_SIZES = [
  { label: "5x5", w: 5, h: 5 },
  { label: "6x6", w: 6, h: 6 },
  { label: "8x8", w: 8, h: 8 },
  { label: "10x10", w: 10, h: 10 },
];

const CELL_TOOLS: { type: CellType; label: string; icon: typeof Square }[] = [
  { type: "empty", label: "Empty", icon: Eraser },
  { type: "wall", label: "Wall", icon: Box },
  { type: "item", label: "Item", icon: Star },
  { type: "start", label: "Start", icon: PlayIcon },
  { type: "goal", label: "Goal", icon: Flag },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner (6-8)" },
  { value: "intermediate", label: "Intermediate (9-12)" },
  { value: "advanced", label: "Advanced (13-16)" },
];

const WIN_CONDITIONS = [
  { value: "reach_goal", label: "Reach the goal" },
  { value: "collect_all", label: "Collect all items" },
  { value: "custom", label: "Custom" },
];

export default function Robot2DEditor({
  config,
  onConfigChange,
}: Robot2DEditorProps) {
  const gridWidth = (config.grid_width as number) || 5;
  const gridHeight = (config.grid_height as number) || 5;
  const cells = (config.cells as Cell[]) || [];
  const difficulty = (config.difficulty as Difficulty) || "beginner";
  const winCondition = (config.win_condition as string) || "reach_goal";
  const maxBlocks = config.max_blocks as number | undefined;
  const hints = (config.hints as string[]) || [];
  const allowPython = (config.allow_python as boolean) || false;

  const [activeTool, setActiveTool] = useState<CellType>("wall");
  const [showPreview, setShowPreview] = useState(false);

  const updateConfig = useCallback(
    (updates: Partial<Record<string, unknown>>) => {
      onConfigChange({ ...config, ...updates });
    },
    [config, onConfigChange]
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      const newCells = cells.filter((c) => !(c.x === x && c.y === y));

      // For start/goal, ensure only one exists
      if (activeTool === "start") {
        const filtered = newCells.filter((c) => c.type !== "start");
        filtered.push({ x, y, type: "start" });
        updateConfig({ cells: filtered });
        return;
      }
      if (activeTool === "goal") {
        const filtered = newCells.filter((c) => c.type !== "goal");
        filtered.push({ x, y, type: "goal" });
        updateConfig({ cells: filtered });
        return;
      }

      if (activeTool !== "empty") {
        newCells.push({ x, y, type: activeTool });
      }
      updateConfig({ cells: newCells });
    },
    [cells, activeTool, updateConfig]
  );

  const handleGridResize = useCallback(
    (w: number, h: number) => {
      // Remove cells outside new bounds
      const filtered = cells.filter((c) => c.x < w && c.y < h);
      updateConfig({ grid_width: w, grid_height: h, cells: filtered });
    },
    [cells, updateConfig]
  );

  const handleHintChange = useCallback(
    (index: number, value: string) => {
      const newHints = [...hints];
      newHints[index] = value;
      updateConfig({ hints: newHints });
    },
    [hints, updateConfig]
  );

  // Build preview grid state
  const startX = cells.find((c) => c.type === "start")?.x ?? 0;
  const startY = cells.find((c) => c.type === "start")?.y ?? 0;
  const previewState: GridState = {
    width: gridWidth,
    height: gridHeight,
    cells,
    robot: {
      x: startX,
      y: startY,
      direction: "right",
      collected: 0,
      inventory: [],
    },
    totalItems: cells.filter((c) => c.type === "item").length,
    goalReached: false,
    stepsUsed: 0,
    trail: [{ x: startX, y: startY, success: true }],
    lastCollision: false,
  };

  return (
    <div className="space-y-6">
      {/* Grid settings */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Grid size */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Grid Size
          </label>
          <select
            value={`${gridWidth}x${gridHeight}`}
            onChange={(e) => {
              const size = GRID_SIZES.find((s) => `${s.w}x${s.h}` === e.target.value);
              if (size) handleGridResize(size.w, size.h);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200"
          >
            {GRID_SIZES.map((s) => (
              <option key={s.label} value={`${s.w}x${s.h}`}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) =>
              updateConfig({
                difficulty: e.target.value,
                available_blocks: DIFFICULTY_BLOCKS[e.target.value as Difficulty],
              })
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Win condition */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Win Condition
          </label>
          <select
            value={winCondition}
            onChange={(e) => updateConfig({ win_condition: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200"
          >
            {WIN_CONDITIONS.map((wc) => (
              <option key={wc.value} value={wc.value}>
                {wc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Max blocks */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Max Blocks
          </label>
          <input
            type="number"
            min={0}
            value={maxBlocks ?? ""}
            onChange={(e) =>
              updateConfig({
                max_blocks: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="Unlimited"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200"
          />
        </div>
      </div>

      {/* Allow Python toggle */}
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <input
          type="checkbox"
          checked={allowPython}
          onChange={(e) => updateConfig({ allow_python: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        Allow Python mode (for advanced students)
      </label>

      {/* Cell tool palette + Grid editor */}
      <div className="flex gap-4">
        {/* Tool palette */}
        <div className="flex flex-col gap-1.5">
          <span className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Paint Tool
          </span>
          {CELL_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.type}
                onClick={() => setActiveTool(tool.type)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  activeTool === tool.type
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tool.label}
              </button>
            );
          })}
        </div>

        {/* Grid canvas */}
        <div
          className="flex-1 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1E1E1E]"
          style={{ maxWidth: gridWidth * 52 + 32 }}
        >
          <GridRenderer
            state={previewState}
            cellSize={Math.min(48, 400 / Math.max(gridWidth, gridHeight))}
            editMode
            activeTool={activeTool}
            onCellClick={handleCellClick}
          />
        </div>
      </div>

      {/* Hints */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Hints
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateConfig({ hints: [...hints, ""] })}
          >
            + Add Hint
          </Button>
        </div>
        {hints.map((hint, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input
              value={hint}
              onChange={(e) => handleHintChange(i, e.target.value)}
              placeholder={`Hint ${i + 1}`}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newHints = hints.filter((_, idx) => idx !== i);
                updateConfig({ hints: newHints });
              }}
            >
              &times;
            </Button>
          </div>
        ))}
      </div>

      {/* Validation warnings */}
      {!cells.some((c) => c.type === "start") && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Place a start position on the grid.
        </p>
      )}
      {winCondition === "reach_goal" && !cells.some((c) => c.type === "goal") && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Place a goal on the grid.
        </p>
      )}
      {winCondition === "collect_all" && !cells.some((c) => c.type === "item") && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Place some items on the grid.
        </p>
      )}
    </div>
  );
}
