"use client";

/**
 * ExerciseConfigPanel — reusable inline editor for all 24 exercise types.
 *
 * Drop-in replacement for the body of /admin/content-library/[exerciseId]/page.tsx
 * minus the page-level chrome (back button, route header). Used by the lesson
 * WYSIWYG editor to edit exercises inline without leaving the page.
 *
 * - Loads the exercise on mount
 * - Renders title (optional) + type-specific config dispatch + quiz questions /
 *   code test-cases sub-editors when applicable
 * - Debounced auto-save on title / config change (1.2 s) — no manual Save button
 *
 * Note: the legacy content-library page still works untouched. This file
 * duplicates a few small helper editors (QuizConfigEditor, CodeConfigEditor,
 * FileUploadConfigEditor, QuizQuestionsEditor, TestCasesEditor) from that
 * page. Long-term those should move into shared files and the content-library
 * page should wrap this panel — see tasks/todo.md follow-up.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Download, HelpCircle, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

import {
  exercisesApi,
  type Exercise,
  type ExerciseType,
  type ExerciseQuestion,
  type ExerciseTestCase,
} from "@/lib/api/exercises";
import { getApiError } from "@/lib/api-client";
import {
  TrueFalseConfigEditor,
  FillBlanksConfigEditor,
  MatchingConfigEditor,
  OrderingConfigEditor,
  CategorizeConfigEditor,
  TranslationConfigEditor,
  SentenceBuilderConfigEditor,
  DialogueConfigEditor,
  ConjugationConfigEditor,
  ReadingConfigEditor,
  WebEditorConfigEditor,
  SRSFlashcardConfigEditor,
  CrosswordConfigEditor,
  WordSearchConfigEditor,
  MapPinDropConfigEditor,
  BubbleSheetConfigEditor,
} from "@/app/(admin)/admin/content-library/[exerciseId]/exercise-config-editors";
import { SCORMConfigEditor } from "@/components/exercises/scorm-package-exercise";
import { MathStepwiseConfigEditor } from "@/components/exercises/math-stepwise-exercise";

const Robot2DEditor = dynamic(
  () => import("@/components/game/robot-2d/robot-2d-editor"),
  { ssr: false }
);
const MathEditor = dynamic(
  () => import("@/components/game/math/math-editor"),
  { ssr: false }
);
const World3DEditor = dynamic(
  () => import("@/components/game/world-3d/world-3d-editor"),
  { ssr: false }
);

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const TYPE_DEFAULTS: Partial<Record<ExerciseType, Record<string, unknown>>> = {
  quiz: { passing_score: 70 },
  code_challenge: {
    language: "python",
    time_limit_seconds: 10,
    memory_limit_mb: 256,
    starter_code: "",
    solution_code: "",
  },
  file_upload: { allowed_types: [".pdf", ".png", ".jpg", ".doc", ".docx"], max_file_mb: 50 },
  true_false: { statement: "", correct_answer: true },
  fill_blanks: { text: "", blanks: [] },
  matching: { pairs: [] },
  ordering: { items: [], correct_order: [] },
  categorize: { categories: [] },
  translation: {
    source_text: "",
    source_language: "English",
    target_language: "Russian",
    accepted_answers: [],
  },
  sentence_builder: { correct_order: [], words: [], hint: "" },
  dialogue: { messages: [] },
  conjugation: { verb: "", language: "", tense: "", table: [] },
  reading: { passage: "", questions: [] },
  web_editor: { instructions: "", starter_html: "", starter_css: "", starter_js: "" },
  scorm_package: { package_id: "", launch_url: "", format: "scorm12", title: "" },
  math_stepwise: { problem: "", final_answer: "", validate_steps: true, hints: [], max_steps: 10 },
  srs_flashcard: { cards: [], mastery_threshold: 0.7 },
  crossword: { grid_size: 10, words: [] },
  word_search: { grid_size: 10, words: [] },
  map_pin_drop: { image_url: "", instructions: "", pins: [] },
  bubble_sheet: { questions: [], num_options: 4, passing_score: 70 },
};

function applyDefaults(type: ExerciseType, raw: Record<string, unknown>): Record<string, unknown> {
  const d = TYPE_DEFAULTS[type];
  if (!d) return raw;
  return { ...d, ...raw };
}

export interface ExerciseConfigPanelProps {
  exerciseId: string;
  /** Hide the title field (parent renders its own). Default false. */
  hideTitle?: boolean;
  /** Notified when the exercise is saved successfully. */
  onSaved?: (exercise: Exercise) => void;
}

export function ExerciseConfigPanel({ exerciseId, hideTitle, onSaved }: ExerciseConfigPanelProps) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const initialLoadRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchExercise = useCallback(() => {
    exercisesApi
      .get(exerciseId)
      .then(({ data }) => {
        setExercise(data);
        setTitle(data.title);
        setConfig(applyDefaults(data.exercise_type, data.config || {}));
      })
      .catch(() => toast.error("Exercise not found"))
      .finally(() => {
        setLoading(false);
        initialLoadRef.current = true;
      });
  }, [exerciseId]);

  useEffect(() => {
    setLoading(true);
    initialLoadRef.current = false;
    fetchExercise();
  }, [fetchExercise]);

  // Debounced auto-save on title / config change.
  useEffect(() => {
    if (!initialLoadRef.current || !exercise) return;
    setSaveStatus("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const { data } = await exercisesApi.update(exerciseId, { title, config });
        setExercise(data);
        setSaveStatus("saved");
        onSaved?.(data);
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch (e) {
        setSaveStatus("error");
        toast.error(getApiError(e, "Failed to save"));
      }
    }, 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, config]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!exercise) {
    return <div className="text-sm text-text-subtle">Exercise not found.</div>;
  }

  const type = exercise.exercise_type;

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Exercise title"
            className="flex-1 rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm font-medium text-ink-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
          />
          <SaveBadge status={saveStatus} />
        </div>
      )}
      {hideTitle && (
        <div className="flex justify-end">
          <SaveBadge status={saveStatus} />
        </div>
      )}

      {/* Type-specific config dispatch */}
      {type === "quiz" && <QuizConfigEditor config={config} onChange={setConfig} />}
      {type === "code_challenge" && <CodeConfigEditor config={config} onChange={setConfig} />}
      {type === "file_upload" && <FileUploadConfigEditor config={config} onChange={setConfig} />}
      {type === "true_false" && <TrueFalseConfigEditor config={config} onChange={setConfig} />}
      {type === "fill_blanks" && <FillBlanksConfigEditor config={config} onChange={setConfig} />}
      {type === "matching" && <MatchingConfigEditor config={config} onChange={setConfig} />}
      {type === "ordering" && <OrderingConfigEditor config={config} onChange={setConfig} />}
      {type === "categorize" && <CategorizeConfigEditor config={config} onChange={setConfig} />}
      {type === "translation" && <TranslationConfigEditor config={config} onChange={setConfig} />}
      {type === "sentence_builder" && <SentenceBuilderConfigEditor config={config} onChange={setConfig} />}
      {type === "dialogue" && <DialogueConfigEditor config={config} onChange={setConfig} />}
      {type === "conjugation" && <ConjugationConfigEditor config={config} onChange={setConfig} />}
      {type === "reading" && <ReadingConfigEditor config={config} onChange={setConfig} />}
      {type === "web_editor" && <WebEditorConfigEditor config={config} onChange={setConfig} />}
      {type === "srs_flashcard" && <SRSFlashcardConfigEditor config={config} onChange={setConfig} />}
      {type === "crossword" && <CrosswordConfigEditor config={config} onChange={setConfig} />}
      {type === "word_search" && <WordSearchConfigEditor config={config} onChange={setConfig} />}
      {type === "map_pin_drop" && <MapPinDropConfigEditor config={config} onChange={setConfig} />}
      {type === "bubble_sheet" && <BubbleSheetConfigEditor config={config} onChange={setConfig} />}
      {type === "scorm_package" && (
        <SCORMConfigEditor config={config} onChange={setConfig} exerciseId={exerciseId} />
      )}
      {type === "math_stepwise" && <MathStepwiseConfigEditor config={config} onChange={setConfig} />}
      {type === "robot_2d" && <Robot2DEditor config={config} onConfigChange={setConfig} />}
      {type === "math_interactive" && <MathEditor config={config} onConfigChange={setConfig} />}
      {type === "world_3d" && <World3DEditor config={config} onConfigChange={setConfig} />}

      {/* Sub-editors */}
      {type === "quiz" && (
        <QuizQuestionsEditor
          exerciseId={exerciseId}
          questions={exercise.questions || []}
          onRefresh={fetchExercise}
        />
      )}
      {type === "code_challenge" && (
        <TestCasesEditor
          exerciseId={exerciseId}
          testCases={exercise.test_cases || []}
          onRefresh={fetchExercise}
        />
      )}
    </div>
  );
}

/* ─── Save badge ─────────────────────────────────────────────────────── */

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return <span className="text-xs text-text-subtle">·</span>;
  if (status === "dirty") return <span className="text-xs text-text-subtle">Unsaved…</span>;
  if (status === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-text-subtle">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving
      </span>
    );
  if (status === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-primary">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  if (status === "error") return <span className="text-xs text-danger-fg">Save failed</span>;
  return null;
}

/* ─── Quiz / Code / FileUpload config editors ────────────────────────── */

function QuizConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Passing Score (%)</label>
            <input
              type="number"
              value={(config.passing_score as number) ?? 70}
              onChange={(e) => onChange({ ...config, passing_score: parseInt(e.target.value) || 70 })}
              className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Time Limit (min)</label>
            <input
              type="number"
              value={(config.time_limit_minutes as number) ?? ""}
              onChange={(e) =>
                onChange({
                  ...config,
                  time_limit_minutes: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="No limit"
              className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CodeConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const description = (config.description as string) || "";
  const examples =
    (config.examples as { input: string; output: string; explanation?: string }[]) || [];

  const updateExample = (i: number, patch: Partial<{ input: string; output: string; explanation: string }>) => {
    const next = examples.map((e, j) => (j === i ? { ...e, ...patch } : e));
    onChange({ ...config, examples: next });
  };
  const addExample = () => {
    onChange({ ...config, examples: [...examples, { input: "", output: "", explanation: "" }] });
  };
  const removeExample = (i: number) => {
    onChange({ ...config, examples: examples.filter((_, j) => j !== i) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Code Challenge Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => onChange({ ...config, description: e.target.value })}
              rows={5}
              placeholder="Describe the problem the student should solve. Plain text or simple markdown."
              className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-text-subtle">
              Shown to the student above the editor.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Language</label>
              <select
                value={(config.language as string) || "python"}
                onChange={(e) => onChange({ ...config, language: e.target.value })}
                className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Time Limit (s)</label>
              <input
                type="number"
                value={(config.time_limit_seconds as number) ?? 10}
                onChange={(e) => onChange({ ...config, time_limit_seconds: parseInt(e.target.value) || 10 })}
                className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Memory (MB)</label>
              <input
                type="number"
                value={(config.memory_limit_mb as number) ?? 256}
                onChange={(e) => onChange({ ...config, memory_limit_mb: parseInt(e.target.value) || 256 })}
                className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Examples (sample I/O shown to the student, like Codeforces) */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-ink-700">
                Examples ({examples.length})
              </label>
              <Button variant="outline" size="sm" onClick={addExample}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Example
              </Button>
            </div>
            <p className="mb-2 text-xs text-text-subtle">
              Public sample input/output shown to the student. Separate from grading test cases below.
            </p>
            <div className="space-y-2">
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="group relative rounded-lg border border-border-strong bg-paper-2 p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted">Example {i + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-fg opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeExample(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] uppercase tracking-wider text-text-subtle">
                        Input
                      </label>
                      <textarea
                        value={ex.input}
                        onChange={(e) => updateExample(i, { input: e.target.value })}
                        rows={2}
                        className="w-full rounded border border-border-strong px-2 py-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] uppercase tracking-wider text-text-subtle">
                        Output
                      </label>
                      <textarea
                        value={ex.output}
                        onChange={(e) => updateExample(i, { output: e.target.value })}
                        rows={2}
                        className="w-full rounded border border-border-strong px-2 py-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="mb-0.5 block text-[10px] uppercase tracking-wider text-text-subtle">
                      Explanation (optional)
                    </label>
                    <input
                      type="text"
                      value={ex.explanation || ""}
                      onChange={(e) => updateExample(i, { explanation: e.target.value })}
                      placeholder="Why this output…"
                      className="w-full rounded border border-border-strong px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Starter Code</label>
            <textarea
              value={(config.starter_code as string) || ""}
              onChange={(e) => onChange({ ...config, starter_code: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Solution Code</label>
            <textarea
              value={(config.solution_code as string) || ""}
              onChange={(e) => onChange({ ...config, solution_code: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FileUploadConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const allowedTypes = (config.allowed_types as string[]) || [".pdf", ".png", ".jpg", ".doc", ".docx"];
  return (
    <Card>
      <CardHeader>
        <CardTitle>File Upload Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Allowed File Types</label>
            <input
              type="text"
              value={allowedTypes.join(", ")}
              onChange={(e) =>
                onChange({
                  ...config,
                  allowed_types: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder=".pdf, .png, .jpg"
              className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Max File Size (MB)</label>
            <input
              type="number"
              value={(config.max_file_mb as number) ?? 50}
              onChange={(e) => onChange({ ...config, max_file_mb: parseInt(e.target.value) || 50 })}
              className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Quiz questions sub-editor ──────────────────────────────────────── */

function QuizQuestionsEditor({
  exerciseId,
  questions,
  onRefresh,
}: {
  exerciseId: string;
  questions: ExerciseQuestion[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    question_text: "",
    question_type: "multiple_choice" as "multiple_choice" | "text_answer",
    options: [
      { id: 0, text: "", is_correct: true },
      { id: 1, text: "", is_correct: false },
    ] as { id: number; text: string; is_correct: boolean }[],
    correct_answer: "",
    points: 1,
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm({
      question_text: "",
      question_type: "multiple_choice",
      options: [
        { id: 0, text: "", is_correct: true },
        { id: 1, text: "", is_correct: false },
      ],
      correct_answer: "",
      points: 1,
    });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (q: ExerciseQuestion) => {
    setForm({
      question_text: q.question_text,
      question_type: q.question_type as "multiple_choice" | "text_answer",
      options: (q.options || []).map((o, i) => ({
        id: o.id ?? i,
        text: o.text,
        is_correct: !!o.is_correct,
      })),
      correct_answer: q.correct_answer || "",
      points: q.points,
    });
    setEditId(q.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.question_text.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        question_text: form.question_text,
        question_type: form.question_type,
        points: form.points,
      };
      if (form.question_type === "multiple_choice") {
        payload.options = form.options;
        const correct = form.options.findIndex((o) => o.is_correct);
        payload.correct_answer = String(correct >= 0 ? correct : 0);
      } else {
        payload.correct_answer = form.correct_answer;
      }
      if (editId) {
        await exercisesApi.updateQuestion(exerciseId, editId, payload);
        toast.success("Question updated");
      } else {
        await exercisesApi.addQuestion(exerciseId, payload);
        toast.success("Question added");
      }
      resetForm();
      onRefresh();
    } catch (e) {
      toast.error(getApiError(e, "Failed to save question"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      await exercisesApi.deleteQuestion(exerciseId, questionId);
      toast.success("Question deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete question");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Questions ({questions.length})</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            resetForm();
            setShowForm(true);
            setForm((f) => ({
              ...f,
              options: [
                { id: 0, text: "", is_correct: true },
                { id: 1, text: "", is_correct: false },
              ],
            }));
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Question
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="group relative rounded-lg border border-border p-4 transition-colors hover:bg-surface-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-700">
                  <span className="mr-2 text-text-subtle">#{idx + 1}</span>
                  {q.question_text}
                </p>
                {q.options && (
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`text-xs ${
                          opt.is_correct ? "font-medium text-primary" : "text-text-muted"
                        }`}
                      >
                        {opt.is_correct ? "✓" : "○"} {opt.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="sm" onClick={() => startEdit(q)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-fg"
                  onClick={() => handleDelete(q.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {showForm && (
          <div className="rounded-lg border-2 border-dashed border-primary-soft p-4">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Question text"
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
              />
              <div className="flex gap-4">
                <select
                  value={form.question_type}
                  onChange={(e) =>
                    setForm({ ...form, question_type: e.target.value as "multiple_choice" | "text_answer" })
                  }
                  className="rounded-lg border border-border-strong px-3 py-2 text-sm"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="text_answer">Text Answer</option>
                </select>
                <input
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 1 })}
                  className="w-20 rounded-lg border border-border-strong px-3 py-2 text-sm"
                  placeholder="Points"
                />
              </div>
              {form.question_type === "multiple_choice" ? (
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={opt.is_correct}
                        onChange={() =>
                          setForm({
                            ...form,
                            options: form.options.map((o, j) => ({ ...o, is_correct: j === i })),
                          })
                        }
                        className="accent-green-600"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const opts = [...form.options];
                          opts[i] = { ...opts[i], text: e.target.value };
                          setForm({ ...form, options: opts });
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 rounded-lg border border-border-strong px-3 py-1.5 text-sm"
                      />
                      {form.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setForm({
                              ...form,
                              options: form.options.filter((_, j) => j !== i),
                            })
                          }
                          className="text-danger-fg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        options: [
                          ...form.options,
                          { id: form.options.length, text: "", is_correct: false },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Option
                  </Button>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Correct answer"
                  value={form.correct_answer}
                  onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
                  className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
                />
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={saving}>
                  {saving ? "Saving..." : editId ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Test cases sub-editor (code challenge) ─────────────────────────── */

function TestCasesEditor({
  exerciseId,
  testCases,
  onRefresh,
}: {
  exerciseId: string;
  testCases: ExerciseTestCase[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ input: "", expected_output: "", is_hidden: false });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showCsvHelp, setShowCsvHelp] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!form.expected_output.trim()) return;
    setSaving(true);
    try {
      await exercisesApi.addTestCase(exerciseId, form);
      toast.success("Test case added");
      setForm({ input: "", expected_output: "", is_hidden: false });
      setShowForm(false);
      onRefresh();
    } catch (e) {
      toast.error(getApiError(e, "Failed to add test case"));
    } finally {
      setSaving(false);
    }
  };

  const toggleHidden = async (tc: ExerciseTestCase) => {
    try {
      await exercisesApi.updateTestCase(exerciseId, tc.id, { is_hidden: !tc.is_hidden });
      onRefresh();
    } catch (e) {
      toast.error(getApiError(e, "Failed to update test case"));
    }
  };

  const handleDelete = async (tcId: string) => {
    try {
      await exercisesApi.deleteTestCase(exerciseId, tcId);
      toast.success("Test case deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete test case");
    }
  };

  /** Minimal CSV parser (RFC 4180-ish): handles quoted fields with embedded
   * commas, escaped quotes (""), and CRLF / LF line endings. Header row
   * required: `input,expected_output[,is_hidden]`. Returns parsed rows.
   */
  const parseCsv = (text: string): { input: string; expected_output: string; is_hidden: boolean }[] => {
    const rows: string[][] = [];
    let cur = "";
    let row: string[] = [];
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuote) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === ",") {
          row.push(cur);
          cur = "";
        } else if (ch === "\n" || ch === "\r") {
          if (ch === "\r" && text[i + 1] === "\n") i++;
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
        } else {
          cur += ch;
        }
      }
    }
    if (cur.length > 0 || row.length > 0) {
      row.push(cur);
      rows.push(row);
    }
    if (rows.length === 0) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const inputIdx = header.indexOf("input");
    const outputIdx = header.findIndex((h) => h === "expected_output" || h === "output");
    const hiddenIdx = header.findIndex((h) => h === "is_hidden" || h === "hidden");
    if (outputIdx === -1) throw new Error("CSV header must contain 'expected_output' (or 'output')");
    const out: { input: string; expected_output: string; is_hidden: boolean }[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length === 1 && r[0].trim() === "") continue;
      out.push({
        input: inputIdx >= 0 ? (r[inputIdx] ?? "") : "",
        expected_output: r[outputIdx] ?? "",
        is_hidden:
          hiddenIdx >= 0
            ? ["true", "1", "yes", "y", "hidden"].includes((r[hiddenIdx] ?? "").trim().toLowerCase())
            : false,
      });
    }
    return out;
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("CSV had no data rows");
        return;
      }
      // Sequential to preserve sort_order; small batches in olympiad practice.
      let ok = 0;
      for (const row of parsed) {
        try {
          await exercisesApi.addTestCase(exerciseId, row);
          ok++;
        } catch {
          /* keep going */
        }
      }
      toast.success(`Imported ${ok} of ${parsed.length} test cases`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse CSV");
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // Sample CSV used both for "Download example" + visible inline preview.
  const SAMPLE_CSV =
    "input,expected_output,is_hidden\n" +
    "5,25,false\n" +
    "10,100,false\n" +
    "-3,9,true\n" +
    '"1,2,3","6",false\n' +
    '"hello ""world""","HELLO ""WORLD""",false\n';

  const downloadExampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test_cases_example.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Test Cases ({testCases.length})</CardTitle>
        <div className="flex gap-2">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowCsvHelp((v) => !v)}
            title="What CSV format?"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
            title="CSV columns: input, expected_output, is_hidden (optional)"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {importing ? "Importing…" : "Import CSV"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Test Case
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCsvHelp && (
          <div className="rounded-lg border border-border-strong bg-surface-2 p-3 text-xs text-text-muted">
            <div className="mb-2 flex items-center justify-between">
              <strong className="text-ink-700">CSV format for test cases</strong>
              <Button size="sm" variant="ghost" onClick={downloadExampleCsv}>
                <Download className="mr-1 h-3.5 w-3.5" />
                Download example
              </Button>
            </div>
            <ul className="mb-2 list-disc space-y-0.5 pl-4">
              <li>
                First row is the header. Required column:
                <code className="mx-1 rounded bg-paper-2 px-1">expected_output</code>
                (also accepts <code className="mx-1 rounded bg-paper-2 px-1">output</code>).
              </li>
              <li>
                Optional columns:
                <code className="mx-1 rounded bg-paper-2 px-1">input</code>,
                <code className="mx-1 rounded bg-paper-2 px-1">is_hidden</code>
                (accepts <code className="rounded bg-paper-2 px-1">true / 1 / yes / hidden</code>).
              </li>
              <li>
                Wrap a field in <code className="mx-1 rounded bg-paper-2 px-1">&quot;double quotes&quot;</code>
                if it contains a comma or a newline. Escape an inner quote by doubling it:
                <code className="mx-1 rounded bg-paper-2 px-1">&quot;&quot;</code>.
              </li>
              <li>Line endings: LF or CRLF, both work.</li>
            </ul>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-text-subtle">
              Example
            </p>
            <pre className="overflow-x-auto rounded bg-paper-2 p-2 font-mono text-[11px] leading-snug text-ink-700">
{SAMPLE_CSV}</pre>
            <p className="mt-2 text-[11px] text-text-subtle">
              Row 4 is a single field with the literal value <code>1,2,3</code>.<br />
              Row 5 is a single field containing the literal text <code>hello &quot;world&quot;</code>.
            </p>
          </div>
        )}
        {testCases.map((tc, idx) => (
          <div key={tc.id} className="group relative rounded-lg border border-border p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-muted">#{idx + 1}</span>
                  <label className="flex cursor-pointer items-center gap-1 text-[10px] text-text-muted">
                    <input
                      type="checkbox"
                      checked={tc.is_hidden}
                      onChange={() => toggleHidden(tc)}
                      className="h-3 w-3 accent-green-600"
                    />
                    Hidden
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase text-text-subtle">Input</p>
                    <pre className="mt-0.5 rounded bg-surface-2 p-2 font-mono text-xs text-ink-700">
                      {tc.input || "(empty)"}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-text-subtle">Expected Output</p>
                    <pre className="mt-0.5 rounded bg-surface-2 p-2 font-mono text-xs text-ink-700">
                      {tc.expected_output}
                    </pre>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-fg opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => handleDelete(tc.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {showForm && (
          <div className="rounded-lg border-2 border-dashed border-primary-soft p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Input (stdin)
                  </label>
                  <textarea
                    value={form.input}
                    onChange={(e) => setForm({ ...form, input: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-border-strong px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Expected Output
                  </label>
                  <textarea
                    value={form.expected_output}
                    onChange={(e) => setForm({ ...form, expected_output: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-border-strong px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={form.is_hidden}
                  onChange={(e) => setForm({ ...form, is_hidden: e.target.checked })}
                  className="accent-green-600"
                />
                Hidden test case (not visible to students)
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={saving}>
                  {saving ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
