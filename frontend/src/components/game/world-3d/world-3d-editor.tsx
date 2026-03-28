"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SceneObject } from "./scene-engine";
import type { Difficulty } from "@/components/game/blockly/toolbox-configs";

interface World3DEditorProps {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const OBJECT_TYPES = [
  { type: "wall", label: "Wall", color: "#475569" },
  { type: "collectible", label: "Collectible", color: "#f59e0b" },
  { type: "button", label: "Button", color: "#ef4444" },
  { type: "door", label: "Door", color: "#8b5cf6" },
  { type: "goal", label: "Goal", color: "#22c55e" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner (6-8)" },
  { value: "intermediate", label: "Intermediate (9-12)" },
  { value: "advanced", label: "Advanced (13-16)" },
];

export default function World3DEditor({ config, onConfigChange }: World3DEditorProps) {
  const objects = (config.scene_objects as SceneObject[]) || [];
  const playerStart = (config.player_start as Record<string, unknown>) || { x: 0, y: 0, z: 0, direction: "north" };
  const difficulty = (config.difficulty as Difficulty) || "beginner";
  const winCondition = (config.win_condition as string) || "reach_goal";
  const hints = (config.hints as string[]) || [];
  const allowPython = (config.allow_python as boolean) || false;

  const updateConfig = useCallback(
    (updates: Partial<Record<string, unknown>>) => {
      onConfigChange({ ...config, ...updates });
    },
    [config, onConfigChange]
  );

  const addObject = (type: string) => {
    const newObj: SceneObject = {
      id: `obj_${Date.now()}`,
      type: type as SceneObject["type"],
      position: { x: 0, y: 0, z: objects.length + 1 },
      color: OBJECT_TYPES.find((t) => t.type === type)?.color,
    };
    updateConfig({ scene_objects: [...objects, newObj] });
  };

  const updateObject = (index: number, updates: Partial<SceneObject>) => {
    const newObjects = objects.map((o, i) => (i === index ? { ...o, ...updates } : o));
    updateConfig({ scene_objects: newObjects });
  };

  const removeObject = (index: number) => {
    updateConfig({ scene_objects: objects.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Settings row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Difficulty</label>
          <select value={difficulty} onChange={(e) => updateConfig({ difficulty: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200">
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Win Condition</label>
          <select value={winCondition} onChange={(e) => updateConfig({ win_condition: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200">
            <option value="reach_goal">Reach Goal</option>
            <option value="collect_all">Collect All</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Player Start X</label>
          <input type="number" value={(playerStart.x as number) || 0}
            onChange={(e) => updateConfig({ player_start: { ...playerStart, x: parseFloat(e.target.value) || 0 } })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Player Start Z</label>
          <input type="number" value={(playerStart.z as number) || 0}
            onChange={(e) => updateConfig({ player_start: { ...playerStart, z: parseFloat(e.target.value) || 0 } })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <input type="checkbox" checked={allowPython} onChange={(e) => updateConfig({ allow_python: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-violet-600" />
        Allow Python mode
      </label>

      {/* Object palette */}
      <div>
        <label className="mb-2 block text-xs font-medium text-slate-500">Add Objects</label>
        <div className="flex flex-wrap gap-2">
          {OBJECT_TYPES.map((t) => (
            <Button key={t.type} variant="outline" size="sm" onClick={() => addObject(t.type)}>
              <div className="mr-1.5 h-3 w-3 rounded-sm" style={{ backgroundColor: t.color }} />
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Object list */}
      <div>
        <label className="mb-2 block text-xs font-medium text-slate-500">
          Scene Objects ({objects.length})
        </label>
        {objects.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No objects yet. Click buttons above to add.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {objects.map((obj, i) => (
              <div key={obj.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: obj.color || OBJECT_TYPES.find((t) => t.type === obj.type)?.color }} />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-20">{obj.type}</span>

                <label className="text-xs text-slate-400">X:</label>
                <input type="number" step={1} value={obj.position.x}
                  onChange={(e) => updateObject(i, { position: { ...obj.position, x: parseFloat(e.target.value) || 0 } })}
                  className="w-14 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200" />

                <label className="text-xs text-slate-400">Z:</label>
                <input type="number" step={1} value={obj.position.z}
                  onChange={(e) => updateObject(i, { position: { ...obj.position, z: parseFloat(e.target.value) || 0 } })}
                  className="w-14 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200" />

                <button onClick={() => removeObject(i)} className="ml-auto text-red-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hints */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500">Hints</label>
          <Button variant="ghost" size="sm" onClick={() => updateConfig({ hints: [...hints, ""] })}>
            <Plus className="mr-1 h-3 w-3" /> Add Hint
          </Button>
        </div>
        {hints.map((hint, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input value={hint} onChange={(e) => { const h = [...hints]; h[i] = e.target.value; updateConfig({ hints: h }); }}
              placeholder={`Hint ${i + 1}`}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200" />
            <Button variant="ghost" size="sm" onClick={() => updateConfig({ hints: hints.filter((_, j) => j !== i) })}>
              &times;
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
