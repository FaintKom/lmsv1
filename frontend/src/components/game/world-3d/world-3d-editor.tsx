"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GridCell3D, CellType3D } from "./scene-engine";
import type { Difficulty } from "@/components/game/blockly/toolbox-configs";

interface World3DEditorProps {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const CELL_TYPES: { type: CellType3D; label: string; color: string; desc: string }[] = [
  { type: "wall", label: "Wall", color: "#4d5a51", desc: "Blocks movement" },
  { type: "platform", label: "Platform", color: "#4d5a51", desc: "Elevated surface (set Y > 0)" },
  { type: "collectible", label: "Collectible", color: "#f5b800", desc: "Item to pick up" },
  { type: "button", label: "Button", color: "#ff7a5c", desc: "Opens linked door" },
  { type: "door", label: "Door", color: "#8b5cf6", desc: "Blocks until button pressed" },
  { type: "goal", label: "Goal", color: "#3fb04b", desc: "Finish point" },
];

const GRID_SIZES = [
  { label: "5x5", w: 5, d: 5 },
  { label: "6x6", w: 6, d: 6 },
  { label: "8x8", w: 8, d: 8 },
  { label: "10x10", w: 10, d: 10 },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner (6-8)" },
  { value: "intermediate", label: "Intermediate (9-12)" },
  { value: "advanced", label: "Advanced (13-16)" },
];

export default function World3DEditor({ config, onConfigChange }: World3DEditorProps) {
  const gridWidth = (config.grid_width as number) || 6;
  const gridDepth = (config.grid_depth as number) || 6;
  const cells = (config.cells as GridCell3D[]) || [];
  const playerStart = (config.player_start as Record<string, unknown>) || { x: 0, y: 0, z: 0, direction: "east" };
  const difficulty = (config.difficulty as Difficulty) || "beginner";
  const winCondition = (config.win_condition as string) || "reach_goal";
  const hints = (config.hints as string[]) || [];
  const allowPython = (config.allow_python as boolean) || false;

  const [activeTool, setActiveTool] = useState<CellType3D>("wall");
  const [placeY, setPlaceY] = useState(0);

  const updateConfig = useCallback(
    (updates: Partial<Record<string, unknown>>) => {
      onConfigChange({ ...config, ...updates });
    },
    [config, onConfigChange]
  );

  const handleCellClick = (x: number, z: number) => {
    // Remove existing cell of same type at same position
    let newCells = cells.filter(
      (c) => !(c.x === x && c.z === z && c.type === activeTool)
    );

    // For goal, allow only one
    if (activeTool === "goal") {
      newCells = newCells.filter((c) => c.type !== "goal");
    }

    // Check if clicking existing cell to remove it
    const existing = cells.find(
      (c) => c.x === x && c.z === z && c.type === activeTool && c.y === placeY
    );
    if (existing) {
      // Remove it
      newCells = cells.filter((c) => c !== existing);
    } else {
      // Add new cell
      const newCell: GridCell3D = {
        x,
        z,
        y: placeY,
        type: activeTool,
        id: `${activeTool}_${x}_${z}_${Date.now()}`,
        color: CELL_TYPES.find((t) => t.type === activeTool)?.color,
      };
      newCells.push(newCell);
    }

    updateConfig({ cells: newCells });
  };

  const handleGridResize = (w: number, d: number) => {
    const filtered = cells.filter((c) => c.x < w && c.z < d);
    updateConfig({ grid_width: w, grid_depth: d, cells: filtered });
  };

  return (
    <div className="space-y-6">
      {/* Settings row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-500">Grid Size</label>
          <select value={`${gridWidth}x${gridDepth}`}
            onChange={(e) => { const s = GRID_SIZES.find((s) => `${s.w}x${s.d}` === e.target.value); if (s) handleGridResize(s.w, s.d); }}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200">
            {GRID_SIZES.map((s) => <option key={s.label} value={`${s.w}x${s.d}`}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-500">Difficulty</label>
          <select value={difficulty} onChange={(e) => updateConfig({ difficulty: e.target.value })}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200">
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-500">Win Condition</label>
          <select value={winCondition} onChange={(e) => updateConfig({ win_condition: e.target.value })}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200">
            <option value="reach_goal">Reach Goal</option>
            <option value="collect_all">Collect All</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-500">Place Height (Y)</label>
          <input type="number" min={0} max={5} value={placeY}
            onChange={(e) => setPlaceY(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200" />
        </div>
      </div>

      {/* Player start */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Player X</label>
          <input type="number" min={0} max={gridWidth - 1} value={(playerStart.x as number) || 0}
            onChange={(e) => updateConfig({ player_start: { ...playerStart, x: parseInt(e.target.value) || 0 } })}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Player Z</label>
          <input type="number" min={0} max={gridDepth - 1} value={(playerStart.z as number) || 0}
            onChange={(e) => updateConfig({ player_start: { ...playerStart, z: parseInt(e.target.value) || 0 } })}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Player Y (height)</label>
          <input type="number" min={0} max={5} value={(playerStart.y as number) || 0}
            onChange={(e) => updateConfig({ player_start: { ...playerStart, y: parseInt(e.target.value) || 0 } })}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Direction</label>
          <select value={(playerStart.direction as string) || "east"}
            onChange={(e) => updateConfig({ player_start: { ...playerStart, direction: e.target.value } })}
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200">
            <option value="north">North (↑)</option>
            <option value="east">East (→)</option>
            <option value="south">South (↓)</option>
            <option value="west">West (←)</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-400">
        <input type="checkbox" checked={allowPython} onChange={(e) => updateConfig({ allow_python: e.target.checked })}
          className="h-4 w-4 rounded border-ink-300 text-green-600" />
        Allow Python mode
      </label>

      {/* Tool palette + Grid */}
      <div className="flex gap-4">
        {/* Tools */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <span className="mb-1 text-xs font-medium text-ink-500">Paint Tool</span>
          {CELL_TYPES.map((t) => (
            <button key={t.type} onClick={() => setActiveTool(t.type)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTool === t.type
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                  : "bg-ink-50 text-ink-700 hover:bg-ink-100 dark:bg-white/5 dark:text-ink-400"
              }`}>
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: t.color }} />
              {t.label}
            </button>
          ))}
          <p className="mt-2 max-w-[120px] text-[10px] text-ink-400">
            {CELL_TYPES.find((t) => t.type === activeTool)?.desc}
          </p>
        </div>

        {/* Top-down grid editor */}
        <div className="flex-1 rounded-xl border border-ink-200 bg-white p-3 dark:border-white/10 dark:bg-[#1E1E1E]">
          <p className="mb-2 text-xs text-ink-400">Click cells to place objects (top-down view, Y={placeY})</p>
          <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${gridWidth}, 1fr)` }}>
            {Array.from({ length: gridDepth }, (_, z) =>
              Array.from({ length: gridWidth }, (_, x) => {
                const cellsHere = cells.filter((c) => c.x === x && c.z === z);
                const topCell = cellsHere.length > 0 ? cellsHere[cellsHere.length - 1] : null;
                const isPlayerStart = (playerStart.x as number) === x && (playerStart.z as number) === z;
                const bgColor = topCell ? (topCell.color || CELL_TYPES.find((t) => t.type === topCell.type)?.color || "#9aa39d") : "#f4f5f1";

                return (
                  <button key={`${x}-${z}`} onClick={() => handleCellClick(x, z)}
                    className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-ink-200 text-[9px] font-bold transition-colors hover:ring-2 hover:ring-green-400 dark:border-white/10"
                    style={{ backgroundColor: bgColor }}
                    title={`(${x}, ${z})${topCell ? ` — ${topCell.type} y=${topCell.y}` : ""}${isPlayerStart ? " — PLAYER" : ""}`}
                  >
                    {isPlayerStart && <span className="text-white drop-shadow">P</span>}
                    {topCell?.type === "goal" && <span className="text-white drop-shadow">🏁</span>}
                    {topCell?.type === "collectible" && <span className="drop-shadow">⭐</span>}
                    {topCell?.type === "button" && <span className="text-white drop-shadow">B</span>}
                    {topCell?.type === "door" && <span className="text-white drop-shadow">D</span>}
                    {topCell?.type === "platform" && <span className="text-white drop-shadow text-[8px]">{topCell.y}</span>}
                    {cellsHere.length > 1 && (
                      <span className="absolute -right-0.5 -top-0.5 rounded-full bg-ink-700 px-1 text-[7px] text-white">
                        {cellsHere.length}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-2 flex gap-3 text-[10px] text-ink-400">
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#4d5a51" }} /> Wall</span>
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#4d5a51" }} /> Platform</span>
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#f5b800" }} /> Item</span>
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#ff7a5c" }} /> Button</span>
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#8b5cf6" }} /> Door</span>
            <span><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#3fb04b" }} /> Goal</span>
          </div>
        </div>
      </div>

      {/* Cell list for fine-tuning */}
      {cells.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-ink-500">Cells ({cells.length})</label>
          <div className="max-h-[200px] space-y-1 overflow-y-auto">
            {cells.map((cell, i) => (
              <div key={cell.id || i} className="flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="h-3 w-3 rounded" style={{ backgroundColor: cell.color || CELL_TYPES.find((t) => t.type === cell.type)?.color }} />
                <span className="w-16 font-medium text-ink-700 dark:text-ink-300">{cell.type}</span>
                <span className="text-ink-400">({cell.x}, {cell.z})</span>
                <span className="text-ink-400">y={cell.y}</span>
                {cell.type === "button" && (
                  <input placeholder="doorId" value={(cell.properties?.doorId as string) || ""}
                    onChange={(e) => {
                      const nc = [...cells];
                      nc[i] = { ...nc[i], properties: { ...nc[i].properties, doorId: e.target.value } };
                      updateConfig({ cells: nc });
                    }}
                    className="w-24 rounded border border-ink-200 px-1.5 py-0.5 text-xs dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200" />
                )}
                <button onClick={() => updateConfig({ cells: cells.filter((_, j) => j !== i) })}
                  className="ml-auto text-coral-300 hover:text-coral-500"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hints */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-ink-500">Hints</label>
          <Button variant="ghost" size="sm" onClick={() => updateConfig({ hints: [...hints, ""] })}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        {hints.map((hint, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input value={hint} onChange={(e) => { const h = [...hints]; h[i] = e.target.value; updateConfig({ hints: h }); }}
              placeholder={`Hint ${i + 1}`}
              className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-200" />
            <Button variant="ghost" size="sm" onClick={() => updateConfig({ hints: hints.filter((_, j) => j !== i) })}>&times;</Button>
          </div>
        ))}
      </div>

      {/* Validation */}
      {!cells.some((c) => c.type === "goal") && winCondition === "reach_goal" && (
        <p className="text-xs text-sun-500 dark:text-sun-400">Place a goal cell on the grid.</p>
      )}
      {!cells.some((c) => c.type === "collectible") && winCondition === "collect_all" && (
        <p className="text-xs text-sun-500 dark:text-sun-400">Place some collectible items on the grid.</p>
      )}
    </div>
  );
}
