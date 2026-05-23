"use client";

/**
 * WYSIWYG Lesson Editor — prototype.
 *
 * Methodist edits ONE lesson at a time on a dedicated page that looks like the
 * student view, with hover-revealed edit chrome on each block and an inline
 * "+ add block" zone between every pair. Auto-saves on debounce.
 *
 * Reuses existing renderers (ContentRenderer, VideoPlayer, ExerciseRenderer) so
 * what the methodist sees matches what the student sees byte-for-byte.
 *
 * Route: /admin/lessons/[lessonId]/edit?courseId=...&moduleId=...
 * (courseId + moduleId required for the PUT endpoint; passed from course editor.)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Loader2,
  PlayCircle,
  Plus,
  Puzzle,
  Trash2,
  X,
  Code,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ContentRenderer } from "@/components/common/content-renderer";
import { VideoPlayer } from "@/components/video-player";
import ExerciseRenderer from "@/components/exercises/exercise-renderer";
import QuizBuilder from "@/components/assessments/quiz-builder";
import ChallengeBuilder from "@/components/code-editor/challenge-builder";
import FileUploadConfig from "@/components/submissions/file-upload-config";
import InteractiveBuilder from "@/components/submissions/interactive-builder";
import { EXERCISE_TYPES_META, EXERCISE_TYPE_LABELS } from "@/lib/api/exercises";
import type { LessonBlock } from "@/types/api";

const BlockEditor = dynamic(
  () => import("@/components/editor/block-editor").then((m) => ({ default: m.BlockEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-border-strong">
        <p className="text-xs text-text-subtle">Loading editor…</p>
      </div>
    ),
  }
);

type BlockKind = "text" | "html" | "video" | "exercise";
type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface ExerciseSummary {
  id: string;
  exercise_type: string;
  title: string;
  config: Record<string, unknown>;
  questions?: unknown[];
  test_cases?: unknown[];
}

function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildV2Content(blocks: LessonBlock[]): Record<string, unknown> {
  return {
    version: 2,
    blocks: blocks.map((b, i) => ({ ...b, sort_order: i })),
  };
}

/** Read existing v2 blocks or migrate single-content lesson into a one-block array. */
function extractBlocks(content: Record<string, unknown> | undefined, contentType: string): LessonBlock[] {
  if (content && content.version === 2 && Array.isArray(content.blocks)) {
    return (content.blocks as LessonBlock[]).slice().sort((a, b) => a.sort_order - b.sort_order);
  }
  if (contentType === "text") {
    return [
      {
        id: generateBlockId(),
        type: "text",
        sort_order: 0,
        page: 1,
        body: (content?.body as string | Record<string, unknown>) || "",
        format: (content?.format as string) || "tiptap",
      },
    ];
  }
  if (contentType === "video") {
    return [
      {
        id: generateBlockId(),
        type: "video",
        sort_order: 0,
        page: 1,
        url: (content?.url as string) || "",
      },
    ];
  }
  return [];
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function LessonEditorPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const confirm = useConfirm();

  const lessonId = params.lessonId as string;
  const courseId = search.get("courseId") || "";
  const moduleId = search.get("moduleId") || "";

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [previewMode, setPreviewMode] = useState(false);
  const [drawerBlockId, setDrawerBlockId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");

  const initialLoadRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Initial fetch ── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseId || !moduleId) {
        toast.error("Missing courseId/moduleId in URL.");
        setLoading(false);
        return;
      }
      try {
        const [lessonRes, exercisesRes, courseRes] = await Promise.all([
          apiClient.get(`/courses/${courseId}/lessons/${lessonId}`),
          apiClient.get(`/exercises/by-lesson/${lessonId}`),
          apiClient.get(`/courses/${courseId}`),
        ]);
        if (cancelled) return;
        const lesson = lessonRes.data;
        setTitle(lesson.title || "");
        setDuration(lesson.duration_minutes ? String(lesson.duration_minutes) : "");
        setBlocks(extractBlocks(lesson.content, lesson.content_type));
        setExercises(exercisesRes.data || []);
        setCourseTitle(courseRes.data?.title || "");
      } catch (err) {
        if (!cancelled) toast.error("Failed to load lesson");
        console.error(err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          initialLoadRef.current = true;
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId, moduleId]);

  /* ── Debounced auto-save ── */
  const triggerSave = useCallback(() => {
    if (!initialLoadRef.current) return;
    setSaveStatus("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await apiClient.put(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`, {
          title: title.trim() || "Untitled lesson",
          content: buildV2Content(blocks),
          duration_minutes: duration ? parseInt(duration, 10) : null,
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      } catch (err) {
        setSaveStatus("error");
        console.error("autosave failed", err);
      }
    }, 1200);
  }, [blocks, courseId, duration, lessonId, moduleId, title]);

  // Fire save whenever title/blocks/duration change after initial load.
  useEffect(() => {
    triggerSave();
  }, [triggerSave]);

  /* ── Block ops ── */
  const updateBlock = useCallback((id: string, patch: Partial<LessonBlock>) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const deleteBlock = useCallback(
    async (id: string) => {
      const ok = await confirm({
        message: "Delete this block?",
        variant: "danger",
        confirmLabel: "Delete",
      });
      if (!ok) return;
      setBlocks((bs) => bs.filter((b) => b.id !== id));
    },
    [confirm]
  );

  const addBlock = useCallback((kind: BlockKind, position: number) => {
    setBlocks((bs) => {
      const newBlock: LessonBlock = {
        id: generateBlockId(),
        type: kind,
        sort_order: position,
        page: 1,
      };
      if (kind === "text") {
        newBlock.body = "";
        newBlock.format = "tiptap";
      } else if (kind === "html") {
        newBlock.body = "";
        newBlock.format = "html";
      } else if (kind === "video") {
        newBlock.url = "";
      } else if (kind === "exercise") {
        newBlock.exercise_id = "";
      }
      const next = [...bs];
      next.splice(position, 0, newBlock);
      return next;
    });
  }, []);

  /* ── DnD ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((bs) => {
      const oldIndex = bs.findIndex((b) => b.id === active.id);
      const newIndex = bs.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return bs;
      return arrayMove(bs, oldIndex, newIndex);
    });
  }, []);

  /* ── Exercise drawer helpers ── */
  const drawerBlock = useMemo(() => blocks.find((b) => b.id === drawerBlockId) || null, [blocks, drawerBlockId]);
  const drawerExercise = useMemo(
    () => (drawerBlock?.exercise_id ? exercises.find((e) => e.id === drawerBlock.exercise_id) : null),
    [drawerBlock, exercises]
  );

  const refreshExercises = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/exercises/by-lesson/${lessonId}`);
      setExercises(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [lessonId]);

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-subtle" />
      </div>
    );
  }

  const backHref = courseId ? `/admin/courses/${courseId}/edit` : "/admin/courses";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-text-muted hover:bg-ink-100 hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            {courseTitle ? courseTitle : "Back to course"}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button
              onClick={() => setPreviewMode((p) => !p)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                previewMode
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border-strong text-text-muted hover:border-ink-300"
              }`}
            >
              {previewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {previewMode ? "Edit mode" : "Preview"}
            </button>
          </div>
        </div>
      </div>

      {/* Main lesson canvas */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          {/* Lesson header */}
          <div className="mb-8 space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled lesson"
              disabled={previewMode}
              className="w-full border-none bg-transparent text-3xl font-bold text-text outline-none placeholder:text-ink-300 disabled:cursor-default"
            />
            {!previewMode && (
              <div className="flex items-center gap-2 text-sm text-text-subtle">
                <span>Duration:</span>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="15"
                  min={1}
                  className="w-16 rounded border border-border-strong px-2 py-0.5 text-sm focus:border-primary focus:outline-none"
                />
                <span>min</span>
              </div>
            )}
            {previewMode && duration && (
              <p className="text-sm text-text-subtle">{duration} min</p>
            )}
          </div>

          {/* Blocks list */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {!previewMode && <AddZone onAdd={(kind) => addBlock(kind, 0)} />}
                {blocks.map((block, i) => (
                  <div key={block.id}>
                    <SortableBlock
                      block={block}
                      exercises={exercises}
                      previewMode={previewMode}
                      onUpdate={(patch) => updateBlock(block.id, patch)}
                      onDelete={() => deleteBlock(block.id)}
                      onOpenDrawer={() => setDrawerBlockId(block.id)}
                    />
                    {!previewMode && (
                      <AddZone onAdd={(kind) => addBlock(kind, i + 1)} />
                    )}
                  </div>
                ))}
                {blocks.length === 0 && !previewMode && (
                  <p className="py-8 text-center text-sm text-text-subtle">
                    Empty lesson. Pick a block above to start.
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Exercise config drawer */}
      {drawerBlock && drawerBlock.type === "exercise" && (
        <ExerciseDrawer
          block={drawerBlock}
          existingExercise={drawerExercise ?? null}
          lessonId={lessonId}
          onClose={() => setDrawerBlockId(null)}
          onCreated={async (exerciseId) => {
            updateBlock(drawerBlock.id, { exercise_id: exerciseId });
            await refreshExercises();
          }}
          onChanged={refreshExercises}
        />
      )}
    </div>
  );
}

/* ─── Save indicator ─────────────────────────────────────────────────── */

function SaveIndicator({ status }: { status: SaveStatus }) {
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
  if (status === "error")
    return <span className="text-xs text-danger-fg">Save failed</span>;
  return null;
}

/* ─── Add zone (inline +) ────────────────────────────────────────────── */

function AddZone({ onAdd }: { onAdd: (kind: BlockKind) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group relative my-1 flex h-6 items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-transparent group-hover:border-ink-200" />
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
      >
        <Plus className="inline h-3 w-3" /> add block
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-20 mt-1 flex -translate-x-1/2 gap-1 rounded-lg border border-border-strong bg-paper p-1 shadow-lg">
          <BlockTypeChip icon={<FileText className="h-3 w-3" />} label="Text" onClick={() => { onAdd("text"); setOpen(false); }} />
          <BlockTypeChip icon={<Code className="h-3 w-3" />} label="HTML" onClick={() => { onAdd("html"); setOpen(false); }} />
          <BlockTypeChip icon={<PlayCircle className="h-3 w-3" />} label="Video" onClick={() => { onAdd("video"); setOpen(false); }} />
          <BlockTypeChip icon={<Puzzle className="h-3 w-3" />} label="Exercise" onClick={() => { onAdd("exercise"); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

function BlockTypeChip({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-ink-100 hover:text-text"
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Sortable block wrapper ─────────────────────────────────────────── */

function SortableBlock({
  block,
  exercises,
  previewMode,
  onUpdate,
  onDelete,
  onOpenDrawer,
}: {
  block: LessonBlock;
  exercises: ExerciseSummary[];
  previewMode: boolean;
  onUpdate: (patch: Partial<LessonBlock>) => void;
  onDelete: () => void;
  onOpenDrawer: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/block relative">
      {!previewMode && (
        <div className="absolute -left-10 top-1 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover/block:opacity-100">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded p-1 text-ink-300 hover:bg-ink-100 hover:text-text active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-ink-300 hover:bg-danger-soft hover:text-danger-fg"
            title="Delete block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      <BlockBody
        block={block}
        exercises={exercises}
        previewMode={previewMode}
        onUpdate={onUpdate}
        onOpenDrawer={onOpenDrawer}
      />
    </div>
  );
}

/* ─── Per-type block bodies ──────────────────────────────────────────── */

function BlockBody({
  block,
  exercises,
  previewMode,
  onUpdate,
  onOpenDrawer,
}: {
  block: LessonBlock;
  exercises: ExerciseSummary[];
  previewMode: boolean;
  onUpdate: (patch: Partial<LessonBlock>) => void;
  onOpenDrawer: () => void;
}) {
  if (block.type === "text") {
    return <TextBlockBody block={block} previewMode={previewMode} onUpdate={onUpdate} />;
  }
  if (block.type === "html") {
    return <HtmlBlockBody block={block} previewMode={previewMode} onUpdate={onUpdate} />;
  }
  if (block.type === "video") {
    return <VideoBlockBody block={block} previewMode={previewMode} onUpdate={onUpdate} />;
  }
  if (block.type === "exercise") {
    return (
      <ExerciseBlockBody
        block={block}
        exercises={exercises}
        previewMode={previewMode}
        onOpenDrawer={onOpenDrawer}
      />
    );
  }
  return null;
}

function TextBlockBody({
  block,
  previewMode,
  onUpdate,
}: {
  block: LessonBlock;
  previewMode: boolean;
  onUpdate: (patch: Partial<LessonBlock>) => void;
}) {
  if (previewMode) {
    if (!block.body) return <div className="text-sm italic text-text-subtle">Empty text block</div>;
    return (
      <div className={block.format === "tiptap" ? "" : "prose prose-slate max-w-none"}>
        <ContentRenderer body={block.body} format={(block.format as "markdown" | "html" | "tiptap") || "tiptap"} />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-transparent transition-colors hover:border-ink-200">
      <BlockEditor
        content={typeof block.body === "object" ? (block.body as never) : null}
        onChange={(json) => onUpdate({ body: json as never, format: "tiptap" })}
      />
    </div>
  );
}

function HtmlBlockBody({
  block,
  previewMode,
  onUpdate,
}: {
  block: LessonBlock;
  previewMode: boolean;
  onUpdate: (patch: Partial<LessonBlock>) => void;
}) {
  if (previewMode) {
    return (
      <div className="prose prose-slate max-w-none">
        <ContentRenderer body={typeof block.body === "string" ? block.body : ""} format="html" />
      </div>
    );
  }
  return (
    <textarea
      value={typeof block.body === "string" ? block.body : ""}
      onChange={(e) => onUpdate({ body: e.target.value, format: "html" })}
      placeholder="<div>Raw HTML…</div>"
      rows={6}
      className="w-full rounded-lg border border-border-strong bg-surface-2 p-3 font-mono text-xs focus:border-primary focus:outline-none"
    />
  );
}

function VideoBlockBody({
  block,
  previewMode,
  onUpdate,
}: {
  block: LessonBlock;
  previewMode: boolean;
  onUpdate: (patch: Partial<LessonBlock>) => void;
}) {
  if (previewMode) {
    if (!block.url) return <div className="text-sm italic text-text-subtle">No video URL</div>;
    return <VideoPlayer url={block.url} lessonId="preview" />;
  }
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={block.url || ""}
        onChange={(e) => onUpdate({ url: e.target.value })}
        placeholder="https://youtube.com/watch?v=…"
        className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      {block.url && <VideoPlayer url={block.url} lessonId="preview" />}
    </div>
  );
}

function ExerciseBlockBody({
  block,
  exercises,
  previewMode,
  onOpenDrawer,
}: {
  block: LessonBlock;
  exercises: ExerciseSummary[];
  previewMode: boolean;
  onOpenDrawer: () => void;
}) {
  const exercise = block.exercise_id ? exercises.find((e) => e.id === block.exercise_id) : null;

  if (previewMode) {
    if (!exercise) {
      return (
        <div className="rounded-lg border border-dashed border-ink-300 bg-surface-2 p-4 text-center text-sm text-text-subtle">
          Empty exercise block
        </div>
      );
    }
    return (
      <ExerciseRenderer
        exercise={exercise as never}
        courseId=""
        prevLesson={null}
        nextLesson={null}
      />
    );
  }

  if (!exercise) {
    return (
      <button
        onClick={onOpenDrawer}
        className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-primary-soft bg-primary-soft/30 px-4 py-3 text-left hover:border-primary"
      >
        <Puzzle className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold text-primary">Pick exercise type & configure</p>
          <p className="text-xs text-text-subtle">Click to choose from 24 types and set up</p>
        </div>
      </button>
    );
  }

  const meta = EXERCISE_TYPES_META.find((m) => m.value === exercise.exercise_type);
  const questionCount = Array.isArray(exercise.questions) ? exercise.questions.length : 0;
  const testCaseCount = Array.isArray(exercise.test_cases) ? exercise.test_cases.length : 0;
  const summary =
    questionCount > 0 ? `${questionCount} questions` : testCaseCount > 0 ? `${testCaseCount} test cases` : "configured";

  return (
    <button
      onClick={onOpenDrawer}
      className="flex w-full items-center gap-3 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 text-left transition-colors hover:border-primary"
    >
      <span className="text-2xl">{meta?.icon || "📝"}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text">{exercise.title}</p>
        <p className="text-xs text-text-subtle">
          {(EXERCISE_TYPE_LABELS as Record<string, string>)[exercise.exercise_type] || exercise.exercise_type} · {summary}
        </p>
      </div>
      <span className="text-xs font-medium text-primary">Configure →</span>
    </button>
  );
}

/* ─── Exercise drawer ────────────────────────────────────────────────── */

function ExerciseDrawer({
  block,
  existingExercise,
  lessonId,
  onClose,
  onCreated,
  onChanged,
}: {
  block: LessonBlock;
  existingExercise: ExerciseSummary | null;
  lessonId: string;
  onClose: () => void;
  onCreated: (exerciseId: string) => void;
  onChanged: () => void;
}) {
  const [selectedType, setSelectedType] = useState(existingExercise?.exercise_type || "quiz");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const isNew = !block.exercise_id;

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Title required");
      return;
    }
    setCreating(true);
    try {
      const { data } = await apiClient.post("/exercises", {
        lesson_id: lessonId,
        exercise_type: selectedType,
        title: newTitle.trim(),
        config: {},
      });
      onCreated(data.id);
      toast.success("Exercise created");
    } catch {
      toast.error("Failed to create");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-900/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-xl flex-col border-l border-border bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">
            {isNew ? "New exercise" : `Edit: ${existingExercise?.title}`}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-ink-300 hover:bg-ink-100 hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isNew ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXERCISE_TYPES_META.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setSelectedType(t.value)}
                      className={`rounded-lg border-2 px-2 py-2 text-left text-xs transition-colors ${
                        selectedType === t.value
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-transparent bg-ink-100 text-text-muted hover:bg-ink-200"
                      }`}
                    >
                      <span className="mr-1">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Quick check"
                  className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="w-full">
                {creating ? "Creating…" : "Create & configure"}
              </Button>
            </div>
          ) : (
            <ExerciseConfigSurface
              exerciseType={existingExercise!.exercise_type}
              lessonId={lessonId}
              onSaved={onChanged}
            />
          )}
        </div>
      </aside>
    </>
  );
}

function ExerciseConfigSurface({
  exerciseType,
  lessonId,
  onSaved,
}: {
  exerciseType: string;
  lessonId: string;
  onSaved: () => void;
}) {
  // Prototype: route to existing builders for the 4 historical types.
  // Other 20 types fall back to "open full editor" CTA to /admin/content-library/[id].
  if (exerciseType === "quiz") {
    return <QuizBuilder lessonId={lessonId} existingQuiz={undefined} onSaved={onSaved} />;
  }
  if (exerciseType === "code_challenge") {
    return <ChallengeBuilder lessonId={lessonId} onSaved={onSaved} />;
  }
  if (exerciseType === "file_upload") {
    return (
      <FileUploadConfig
        courseId=""
        moduleId=""
        lessonId={lessonId}
        initialContent={{}}
        onSaved={onSaved}
      />
    );
  }
  if (exerciseType === "interactive") {
    return (
      <InteractiveBuilder
        courseId=""
        moduleId=""
        lessonId={lessonId}
        initialContent={{}}
        onSaved={onSaved}
      />
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-ink-300 bg-surface-2 p-6 text-center">
      <p className="text-sm text-text-muted">
        Inline editor for <strong>{exerciseType}</strong> not wired yet in prototype.
      </p>
      <p className="mt-1 text-xs text-text-subtle">
        Use the full content library editor for now.
      </p>
    </div>
  );
}
