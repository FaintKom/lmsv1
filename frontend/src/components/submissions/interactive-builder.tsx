"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle, Plus, Trash2, Puzzle } from "lucide-react";
import { toast } from "sonner";

interface InteractiveBuilderProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  initialContent: Record<string, unknown>;
  onSaved?: () => void;
}

const EXERCISE_TYPES = [
  { value: "matching", label: "Matching" },
  { value: "ordering", label: "Ordering" },
  { value: "fill_blanks", label: "Fill in the Blanks" },
  { value: "true_false", label: "True / False" },
  { value: "categorize", label: "Categorize" },
];

export default function InteractiveBuilder({
  courseId,
  moduleId,
  lessonId,
  initialContent,
  onSaved,
}: InteractiveBuilderProps) {
  const [exerciseType, setExerciseType] = useState(
    (initialContent.exercise_type as string) || "matching"
  );
  const [instruction, setInstruction] = useState(
    (initialContent.instruction as string) || ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Matching state
  const [pairs, setPairs] = useState<{ left: string; right: string }[]>(
    (initialContent.pairs as { left: string; right: string }[]) || [{ left: "", right: "" }]
  );

  // Ordering state
  const [items, setItems] = useState<string[]>(
    (initialContent.items as string[]) || [""]
  );
  const [correctOrder, setCorrectOrder] = useState<string[]>(
    (initialContent.correct_order as string[]) || []
  );

  // Fill blanks state
  const [textTemplate, setTextTemplate] = useState(
    (initialContent.text_template as string) || ""
  );
  const [blanks, setBlanks] = useState<string[]>(
    (initialContent.blanks as string[]) || []
  );

  // True/false state
  const [statement, setStatement] = useState(
    (initialContent.statement as string) || ""
  );
  const [correctAnswer, setCorrectAnswer] = useState<boolean>(
    (initialContent.correct_answer as boolean) ?? true
  );

  // Categorize state
  const [categories, setCategories] = useState<{ name: string; items: string[] }[]>(
    (initialContent.categories as { name: string; items: string[] }[]) || [{ name: "", items: [""] }]
  );

  const buildContent = (): Record<string, unknown> => {
    const base = { exercise_type: exerciseType, instruction };

    switch (exerciseType) {
      case "matching":
        return { ...base, pairs: pairs.filter((p) => p.left && p.right) };
      case "ordering": {
        const filtered = items.filter(Boolean);
        return {
          ...base,
          items: filtered,
          correct_order: correctOrder.length ? correctOrder : filtered,
        };
      }
      case "fill_blanks":
        return { ...base, text_template: textTemplate, blanks };
      case "true_false":
        return { ...base, statement, correct_answer: correctAnswer };
      case "categorize": {
        const cats = categories.filter((c) => c.name).map((c) => ({
          name: c.name,
          items: c.items.filter(Boolean),
        }));
        const allItems = cats.flatMap((c) => c.items);
        return { ...base, categories: cats, all_items: allItems };
      }
      default:
        return base;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.put(
        `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`,
        { content: buildContent() }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (onSaved) onSaved();
      toast.success("Exercise saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (newType: string) => {
    setExerciseType(newType);
    // Reset fields (keep instruction)
    setPairs([{ left: "", right: "" }]);
    setItems([""]);
    setCorrectOrder([]);
    setTextTemplate("");
    setBlanks([]);
    setStatement("");
    setCorrectAnswer(true);
    setCategories([{ name: "", items: [""] }]);
  };

  // Count blanks in template
  const blankCount = (textTemplate.match(/\{\{blank\}\}/g) || []).length;
  if (blanks.length !== blankCount) {
    const newBlanks = [...blanks];
    while (newBlanks.length < blankCount) newBlanks.push("");
    setBlanks(newBlanks.slice(0, blankCount));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
        <Puzzle className="h-4 w-4 text-green-500" />
        Interactive Exercise Builder
      </div>

      {/* Exercise type selector */}
      <div className="flex flex-wrap gap-2">
        {EXERCISE_TYPES.map((et) => (
          <button
            key={et.value}
            onClick={() => handleTypeChange(et.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              exerciseType === et.value
                ? "border-green-300 bg-green-50 text-green-700"
                : "border-ink-200 text-ink-500 hover:border-ink-300"
            }`}
          >
            {et.label}
          </button>
        ))}
      </div>

      {/* Instruction */}
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-700">Instruction</label>
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Instructions for the student..."
          className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>

      {/* ── MATCHING ── */}
      {exerciseType === "matching" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-700">Pairs</label>
          {pairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={pair.left}
                onChange={(e) => {
                  const p = [...pairs];
                  p[i] = { ...p[i], left: e.target.value };
                  setPairs(p);
                }}
                placeholder="Term"
                className="flex-1 rounded border border-ink-300 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
              />
              <span className="text-ink-400">↔</span>
              <input
                type="text"
                value={pair.right}
                onChange={(e) => {
                  const p = [...pairs];
                  p[i] = { ...p[i], right: e.target.value };
                  setPairs(p);
                }}
                placeholder="Definition"
                className="flex-1 rounded border border-ink-300 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
              />
              <button
                onClick={() => setPairs(pairs.filter((_, j) => j !== i))}
                className="rounded p-1 text-ink-400 hover:bg-coral-50 hover:text-coral-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setPairs([...pairs, { left: "", right: "" }])}>
            <Plus className="mr-1 h-3 w-3" /> Add Pair
          </Button>
        </div>
      )}

      {/* ── ORDERING ── */}
      {exerciseType === "ordering" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-700">
            Items (enter in CORRECT order — they will be shuffled for students)
          </label>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-center text-xs font-bold text-ink-400">{i + 1}</span>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const it = [...items];
                  it[i] = e.target.value;
                  setItems(it);
                  setCorrectOrder(it.filter(Boolean));
                }}
                placeholder={`Item ${i + 1}`}
                className="flex-1 rounded border border-ink-300 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  const it = items.filter((_, j) => j !== i);
                  setItems(it);
                  setCorrectOrder(it.filter(Boolean));
                }}
                className="rounded p-1 text-ink-400 hover:bg-coral-50 hover:text-coral-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setItems([...items, ""])}>
            <Plus className="mr-1 h-3 w-3" /> Add Item
          </Button>
        </div>
      )}

      {/* ── FILL BLANKS ── */}
      {exerciseType === "fill_blanks" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">
              {"Text template (use {{blank}} for blanks)"}
            </label>
            <textarea
              value={textTemplate}
              onChange={(e) => setTextTemplate(e.target.value)}
              placeholder={"A {{blank}} is a named storage location."}
              rows={4}
              className="w-full rounded border border-ink-300 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          {blankCount > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">
                Correct answers ({blankCount} blanks)
              </label>
              <div className="space-y-1.5">
                {blanks.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-ink-400">Blank {i + 1}:</span>
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => {
                        const nb = [...blanks];
                        nb[i] = e.target.value;
                        setBlanks(nb);
                      }}
                      className="flex-1 rounded border border-ink-300 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TRUE/FALSE ── */}
      {exerciseType === "true_false" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">Statement</label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="JavaScript is a statically typed language."
              rows={2}
              className="w-full rounded border border-ink-300 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">Correct Answer</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCorrectAnswer(true)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  correctAnswer
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-ink-200 text-ink-500"
                }`}
              >
                True
              </button>
              <button
                onClick={() => setCorrectAnswer(false)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  !correctAnswer
                    ? "border-coral-300 bg-coral-50 text-coral-700"
                    : "border-ink-200 text-ink-500"
                }`}
              >
                False
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORIZE ── */}
      {exerciseType === "categorize" && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-ink-700">Categories & Items</label>
          {categories.map((cat, ci) => (
            <div key={ci} className="rounded-lg border border-ink-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => {
                    const c = [...categories];
                    c[ci] = { ...c[ci], name: e.target.value };
                    setCategories(c);
                  }}
                  placeholder="Category name"
                  className="flex-1 rounded border border-ink-300 px-2 py-1.5 text-sm font-medium focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={() => setCategories(categories.filter((_, j) => j !== ci))}
                  className="rounded p-1 text-ink-400 hover:bg-coral-50 hover:text-coral-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {cat.items.map((item, ii) => (
                <div key={ii} className="mb-1 flex items-center gap-2 pl-4">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const c = [...categories];
                      const items = [...c[ci].items];
                      items[ii] = e.target.value;
                      c[ci] = { ...c[ci], items };
                      setCategories(c);
                    }}
                    placeholder="Item"
                    className="flex-1 rounded border border-ink-300 px-2 py-1 text-sm focus:border-green-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const c = [...categories];
                      c[ci] = { ...c[ci], items: c[ci].items.filter((_, j) => j !== ii) };
                      setCategories(c);
                    }}
                    className="rounded p-0.5 text-ink-400 hover:text-coral-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const c = [...categories];
                  c[ci] = { ...c[ci], items: [...c[ci].items, ""] };
                  setCategories(c);
                }}
                className="ml-4 mt-1 text-xs font-medium text-green-600 hover:text-green-800"
              >
                + Add item
              </button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCategories([...categories, { name: "", items: [""] }])}
          >
            <Plus className="mr-1 h-3 w-3" /> Add Category
          </Button>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3 border-t border-ink-200 pt-3">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-3 w-3" />
          {saving ? "Saving..." : "Save Exercise"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <CheckCircle className="h-3 w-3" />
            Saved!
          </span>
        )}
      </div>
    </div>
  );
}
