"use client";

/**
 * WYSIWYG Lesson Editor — single-lesson focus.
 *
 * Methodist edits ONE lesson at a time on a dedicated page that looks like the
 * student view, with hover-revealed edit chrome on each block and an inline
 * "+ add block" zone between blocks.
 *
 * Exercise blocks render their config form INLINE on the page (no drawer, no
 * "Configure" toggle). When the methodist picks an exercise type, the exercise
 * is created immediately with a default title — there is no second "Create"
 * step. The methodist can edit title + config in place; both auto-save.
 *
 * Reuses ContentRenderer (TipTap/markdown/html), BlockEditor (TipTap edit
 * mode), VideoPlayer, ExerciseRenderer (preview), and ExerciseConfigPanel
 * (the inline 24-type dispatch).
 *
 * Route: /admin/lessons/[lessonId]/edit?courseId=...&moduleId=...
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Loader2,
  PlayCircle,
  Plus,
  Presentation,
  Puzzle,
  Trash2,
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
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ContentRenderer } from "@/components/common/content-renderer";
import { VideoPlayer } from "@/components/video-player";
import { ExercisePreview } from "@/components/exercises/exercise-view";
import { PresentationEmbed } from "@/components/lesson/presentation-embed";
import { ExerciseConfigPanel } from "@/components/exercises/exercise-config-panel";
import {
  EXERCISE_GROUPS,
  EXERCISE_TYPES_META,
  EXERCISE_TYPE_LABELS,
  getExerciseIcon,
  type ExerciseType,
} from "@/lib/api/exercises";
import { TEMPLATE_LIST } from "@/components/game/math/template-registry";
import type { LessonBlock } from "@/types/api";
import {
  buildPagesContent,
  extractPages,
  flattenPages,
  generatePageId,
  type LessonPage,
} from "@/lib/lessons/lesson-pages";
import { useTranslation } from "@/lib/i18n/context";
import { adoptDetachedExercises } from "./adopt-exercises";

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

type BlockKind = "text" | "html" | "video" | "presentation" | "exercise" | "assignment";
type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/** `t()` takes no parameters; the keys carry `{n}` placeholders instead. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

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

/** A new, empty page — what "+ Add page" drops at the end of the lesson. */
function blankPage(): LessonPage {
  return { id: generatePageId(), blocks: [] };
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function LessonEditorPage() {
  const { t } = useTranslation();
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
  // A page is the owner's "block": a screen the student scrolls and leaves
  // by pressing Next. Typed content lives inside it, mixed freely.
  const [pages, setPages] = useState<LessonPage[]>([blankPage()]);
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [previewMode, setPreviewMode] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  // Legacy typed lessons (quiz/code/file/interactive/theory without v2
  // blocks) are edited by their dedicated builders on the course page.
  // Autosaving an empty container here would replace their content and blank
  // the student view — refuse instead (specs/017 FR-003).
  const [legacyType, setLegacyType] = useState<string | null>(null);

  const initialLoadRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Initial fetch ── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseId || !moduleId) {
        toast.error(t("admin.lessonEditor.missingIds"));
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
        if (
          !["text", "video"].includes(lesson.content_type) &&
          lesson.content?.version !== 2
        ) {
          setLegacyType(lesson.content_type);
          setCourseTitle(courseRes.data?.title || "");
          setLoading(false);
          return; // initialLoadRef stays false → autosave never fires
        }
        setTitle(lesson.title || "");
        setDuration(lesson.duration_minutes ? String(lesson.duration_minutes) : "");
        // Exercises attached outside any block become trailing blocks on the
        // last page, in by-lesson order — the order students already saw
        // (specs/017 US2).
        const loaded = extractPages(lesson.content);
        const flat = flattenPages(loaded);
        const adopted = adoptDetachedExercises(
          flat,
          ((exercisesRes.data || []) as ExerciseSummary[]).map((e) => e.id)
        );
        const orphans = adopted.slice(flat.length);
        if (orphans.length > 0) {
          loaded[loaded.length - 1].blocks.push(...orphans);
        }
        setPages(loaded);
        setExercises(exercisesRes.data || []);
        setCourseTitle(courseRes.data?.title || "");
      } catch (err) {
        if (!cancelled) toast.error(t("admin.lessonEditor.failedLoad"));
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

  /* ── Debounced lesson auto-save (title / duration / blocks structure) ── */
  const triggerSave = useCallback(() => {
    if (!initialLoadRef.current || legacyType) return;
    setSaveStatus("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await apiClient.put(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`, {
          title: title.trim() || t("admin.lessonEditor.untitled"),
          content: buildPagesContent(pages),
          duration_minutes: duration ? parseInt(duration, 10) : null,
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      } catch (err) {
        setSaveStatus("error");
        console.error("autosave failed", err);
      }
    }, 1200);
  }, [pages, courseId, duration, lessonId, legacyType, moduleId, title]);

  useEffect(() => {
    triggerSave();
  }, [triggerSave]);

  /* ── Block ops (block ids are unique across pages) ── */
  const updateBlock = useCallback((id: string, patch: Partial<LessonBlock>) => {
    setPages((ps) =>
      ps.map((p) => ({
        ...p,
        blocks: p.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      }))
    );
  }, []);

  const deleteBlock = useCallback(
    async (block: LessonBlock) => {
      // Assignment blocks carry submissions — the warning must say so (specs/017 FR-009).
      const isAssignment = block.type === "assignment" && block.assignment_id;
      const ok = await confirm({
        message: isAssignment
          ? t("admin.lessonEditor.deleteAssignmentBlockMsg")
          : t("admin.lessonEditor.deleteBlockMsg"),
        variant: "danger",
        confirmLabel: t("common.delete"),
      });
      if (!ok) return;
      // Best-effort cleanup if this is an exercise block.
      if (block.type === "exercise" && block.exercise_id) {
        try {
          await apiClient.delete(`/exercises/${block.exercise_id}`);
        } catch (err) {
          console.warn("Failed to delete exercise from server (block removed locally):", err);
        }
      }
      if (isAssignment) {
        try {
          await apiClient.delete(`/assignments/${block.assignment_id}`);
        } catch (err) {
          toast.error(t("admin.lessonEditor.failedDeleteAssignment"));
          console.error(err);
          return; // keep the block so the assignment stays reachable
        }
      }
      setPages((ps) =>
        ps.map((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== block.id) }))
      );
    },
    [confirm, t]
  );

  const addBlock = useCallback((kind: BlockKind, pageIndex: number, position: number) => {
    setPages((ps) =>
      ps.map((p, i) => {
        if (i !== pageIndex) return p;
        const newBlock: LessonBlock = {
          id: generateBlockId(),
          type: kind,
          sort_order: position,
          page: pageIndex + 1,
        };
        if (kind === "text") {
          newBlock.body = "";
          newBlock.format = "tiptap";
        } else if (kind === "html") {
          newBlock.body = "";
          newBlock.format = "html";
        } else if (kind === "video") {
          newBlock.url = "";
        } else if (kind === "presentation") {
          newBlock.url = "";
        } else if (kind === "exercise") {
          newBlock.exercise_id = "";
        } else if (kind === "assignment") {
          newBlock.assignment_id = "";
        }
        const blocks = [...p.blocks];
        blocks.splice(position, 0, newBlock);
        return { ...p, blocks };
      })
    );
  }, []);

  /* ── Page ops ── */
  const addPage = useCallback(() => setPages((ps) => [...ps, blankPage()]), []);

  const movePage = useCallback((index: number, delta: number) => {
    setPages((ps) => {
      const to = index + delta;
      if (to < 0 || to >= ps.length) return ps;
      const next = [...ps];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }, []);

  const deletePage = useCallback(
    async (index: number) => {
      const page = pages[index];
      if (!page) return;
      if (pages.length === 1) {
        // The lesson always has a page to write on; emptying is enough.
        const ok = page.blocks.length === 0 ||
          (await confirm({
            message: t("admin.lessonEditor.deletePageMsg"),
            variant: "danger",
            confirmLabel: t("common.delete"),
          }));
        if (!ok) return;
        setPages([blankPage()]);
        return;
      }
      if (page.blocks.length > 0) {
        const ok = await confirm({
          message: t("admin.lessonEditor.deletePageMsg"),
          variant: "danger",
          confirmLabel: t("common.delete"),
        });
        if (!ok) return;
      }
      setPages((ps) => ps.filter((_, i) => i !== index));
    },
    [confirm, pages, t]
  );

  const renamePage = useCallback((index: number, title: string) => {
    setPages((ps) => ps.map((p, i) => (i === index ? { ...p, title } : p)));
  }, []);

  /* ── Instantly create an exercise of a given type and attach to a block.
     `config` lets the picker preset e.g. a math template (specs/017 US5). */
  const createAndAttachExercise = useCallback(
    async (blockId: string, exerciseType: ExerciseType, config: Record<string, unknown> = {}) => {
      const defaultTitle = `New ${EXERCISE_TYPE_LABELS[exerciseType] || exerciseType}`;
      try {
        const { data } = await apiClient.post("/exercises", {
          lesson_id: lessonId,
          exercise_type: exerciseType,
          title: defaultTitle,
          config,
        });
        updateBlock(blockId, { exercise_id: data.id });
        // Refresh exercise list so the preview/renderer has it.
        try {
          const { data: list } = await apiClient.get(`/exercises/by-lesson/${lessonId}`);
          setExercises(list || []);
        } catch {
          /* non-fatal */
        }
      } catch (err) {
        toast.error(t("admin.lessonEditor.failedCreateExercise"));
        console.error(err);
      }
    },
    [lessonId, updateBlock]
  );

  /* ── DnD ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** Reorder within one page. Dragging across pages is not offered — a page
   *  is a screen the teacher composes, and the page controls move whole
   *  screens. */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPages((ps) =>
      ps.map((p) => {
        const oldIndex = p.blocks.findIndex((b) => b.id === active.id);
        const newIndex = p.blocks.findIndex((b) => b.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return p;
        return { ...p, blocks: arrayMove(p.blocks, oldIndex, newIndex) };
      })
    );
  }, []);

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-subtle" />
      </div>
    );
  }

  const backHref = courseId ? `/admin/courses/${courseId}/edit` : "/admin/courses";

  if (legacyType) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-md text-sm text-text-muted">
          {t("admin.lessonEditor.legacyLessonNotice")}
        </p>
        <button
          onClick={() => router.push(backHref)}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:border-primary hover:text-primary"
        >
          <ArrowLeft className="mr-1.5 inline h-4 w-4" />
          {courseTitle || t("admin.lessonEditor.backToCourse")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            {courseTitle ? courseTitle : t("admin.lessonEditor.backToCourse")}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button
              onClick={() => setPreviewMode((p) => !p)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                previewMode
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border-strong text-text-muted hover:border-border-strong"
              }`}
            >
              {previewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {previewMode ? t("admin.lessonEditor.editMode") : t("admin.lessonEditor.previewMode")}
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
              placeholder={t("admin.lessonEditor.untitled")}
              disabled={previewMode}
              className="w-full border-none bg-transparent text-3xl font-bold text-text placeholder:text-text-subtle disabled:cursor-default"
            />
            {!previewMode && (
              <div className="flex items-center gap-2 text-sm text-text-subtle">
                <span>{t("admin.lessonEditor.durationLabel")}</span>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="15"
                  min={1}
                  className="w-16 rounded border border-border-strong px-2 py-0.5 text-sm focus:border-primary focus:outline-none"
                />
                <span>{t("admin.lessonEditor.minSuffix")}</span>
              </div>
            )}
            {previewMode && duration && (
              <p className="text-sm text-text-subtle">{duration} {t("admin.lessonEditor.minSuffix")}</p>
            )}
          </div>

          {/* Pages. Each one is a screen the student scrolls; Next takes
              them to the following page. */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-6">
              {pages.map((page, pageIndex) => (
                <section
                  key={page.id}
                  className={
                    previewMode
                      ? "space-y-1"
                      : "rounded-xl border border-border-strong bg-surface/40 p-4"
                  }
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-text-subtle">
                      {fill(t("admin.lessonEditor.pageLabel"), {
                        n: pageIndex + 1,
                        total: pages.length,
                      })}
                    </span>
                    {!previewMode && (
                      <>
                        <input
                          type="text"
                          value={page.title || ""}
                          onChange={(e) => renamePage(pageIndex, e.target.value)}
                          placeholder={t("admin.lessonEditor.pageTitlePlaceholder")}
                          className="flex-1 border-none bg-transparent text-sm font-medium text-text placeholder:text-text-subtle focus:outline-none"
                        />
                        <button
                          onClick={() => movePage(pageIndex, -1)}
                          disabled={pageIndex === 0}
                          title={t("admin.lessonEditor.movePageUp")}
                          className="rounded p-1 text-text-subtle hover:bg-surface-2 hover:text-text disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => movePage(pageIndex, 1)}
                          disabled={pageIndex === pages.length - 1}
                          title={t("admin.lessonEditor.movePageDown")}
                          className="rounded p-1 text-text-subtle hover:bg-surface-2 hover:text-text disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deletePage(pageIndex)}
                          title={t("admin.lessonEditor.deletePage")}
                          className="rounded p-1 text-text-subtle hover:bg-danger-soft hover:text-danger-fg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {previewMode && page.title && (
                      <span className="text-sm font-medium text-text">{page.title}</span>
                    )}
                  </div>

                  <SortableContext
                    items={page.blocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {!previewMode && page.blocks.length > 0 && (
                        <AddZone onAdd={(kind) => addBlock(kind, pageIndex, 0)} />
                      )}
                      {page.blocks.map((block, i) => (
                        <div key={block.id}>
                          <SortableBlock
                            block={block}
                            exercises={exercises}
                            previewMode={previewMode}
                            courseId={courseId}
                            onUpdate={(patch) => updateBlock(block.id, patch)}
                            onDelete={() => deleteBlock(block)}
                            onPickExerciseType={(t, cfg) => createAndAttachExercise(block.id, t, cfg)}
                            onExerciseChanged={async () => {
                              try {
                                const { data } = await apiClient.get(`/exercises/by-lesson/${lessonId}`);
                                setExercises(data || []);
                              } catch {
                                /* non-fatal */
                              }
                            }}
                          />
                          {!previewMode && (
                            <AddZone onAdd={(kind) => addBlock(kind, pageIndex, i + 1)} />
                          )}
                        </div>
                      ))}
                    </div>
                  </SortableContext>

                  {/* Always visible, because a control that appears on hover
                      is a control a teacher never finds. */}
                  {!previewMode && (
                    <AddContentButton
                      empty={page.blocks.length === 0}
                      onAdd={(kind) => addBlock(kind, pageIndex, page.blocks.length)}
                      t={t}
                    />
                  )}
                </section>
              ))}

              {!previewMode && (
                <button
                  onClick={addPage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong py-3 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                  {t("admin.lessonEditor.addPage")}
                </button>
              )}
            </div>
          </DndContext>
        </div>
      </div>
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

/* ─── Adding content ─────────────────────────────────────────────────── */

/** The one list of what a page can hold. Both add controls offer it. */
function BlockTypeChips({ onPick }: { onPick: (kind: BlockKind) => void }) {
  return (
    <>
      <BlockTypeChip icon={<FileText className="h-3 w-3" />} label="Text" onClick={() => onPick("text")} />
      <BlockTypeChip icon={<Code className="h-3 w-3" />} label="HTML" onClick={() => onPick("html")} />
      <BlockTypeChip icon={<PlayCircle className="h-3 w-3" />} label="Video" onClick={() => onPick("video")} />
      <BlockTypeChip icon={<Presentation className="h-3 w-3" />} label="Slides" onClick={() => onPick("presentation")} />
      <BlockTypeChip icon={<Puzzle className="h-3 w-3" />} label="Exercise" onClick={() => onPick("exercise")} />
      <BlockTypeChip icon={<ClipboardCheck className="h-3 w-3" />} label="Assignment" onClick={() => onPick("assignment")} />
    </>
  );
}

/** Hover-revealed "+" between two blocks — the quick path for someone who
 *  already knows it is there. Never the only way in: see AddContentButton. */
function AddZone({ onAdd }: { onAdd: (kind: BlockKind) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group relative my-1 flex h-6 items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-transparent group-hover:border-border-strong" />
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full bg-bg px-2 py-0.5 text-2xs font-medium text-text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
      >
        <Plus className="inline h-3 w-3" /> add block
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-20 mt-1 flex -translate-x-1/2 gap-1 rounded-lg border border-border-strong bg-bg p-1 shadow-lg">
          <BlockTypeChips onPick={(k) => { onAdd(k); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

/** The visible way to fill a page. Sits at the end of every page and never
 *  hides — the hover-only "+" is why the owner could not add a block at all. */
function AddContentButton({
  empty,
  onAdd,
  t,
}: {
  empty: boolean;
  onAdd: (kind: BlockKind) => void;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm font-medium transition-colors ${
          empty
            ? "border-primary-soft bg-primary-soft/20 text-primary hover:border-primary"
            : "border-border-strong text-text-muted hover:border-primary hover:text-primary"
        }`}
      >
        <Plus className="h-4 w-4" />
        {t("admin.lessonEditor.addContent")}
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-20 mt-1 flex -translate-x-1/2 flex-wrap justify-center gap-1 rounded-lg border border-border-strong bg-bg p-1 shadow-lg">
          <BlockTypeChips onPick={(k) => { onAdd(k); setOpen(false); }} />
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
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-2 hover:text-text"
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
  courseId,
  onUpdate,
  onDelete,
  onPickExerciseType,
  onExerciseChanged,
}: {
  block: LessonBlock;
  exercises: ExerciseSummary[];
  previewMode: boolean;
  courseId: string;
  onUpdate: (patch: Partial<LessonBlock>) => void;
  onDelete: () => void;
  onPickExerciseType: (type: ExerciseType, config?: Record<string, unknown>) => void;
  onExerciseChanged: () => void;
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
            className="cursor-grab rounded p-1 text-text-subtle hover:bg-surface-2 hover:text-text active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-text-subtle hover:bg-danger-soft hover:text-danger-fg"
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
        courseId={courseId}
        onUpdate={onUpdate}
        onPickExerciseType={onPickExerciseType}
        onExerciseChanged={onExerciseChanged}
      />
    </div>
  );
}

/* ─── Per-type block bodies ──────────────────────────────────────────── */

function BlockBody({
  block,
  exercises,
  previewMode,
  courseId,
  onUpdate,
  onPickExerciseType,
  onExerciseChanged,
}: {
  block: LessonBlock;
  exercises: ExerciseSummary[];
  previewMode: boolean;
  courseId: string;
  onUpdate: (patch: Partial<LessonBlock>) => void;
  onPickExerciseType: (type: ExerciseType, config?: Record<string, unknown>) => void;
  onExerciseChanged: () => void;
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
  if (block.type === "presentation") {
    return <PresentationBlockBody block={block} previewMode={previewMode} onUpdate={onUpdate} />;
  }
  if (block.type === "exercise") {
    return (
      <ExerciseBlockBody
        block={block}
        exercises={exercises}
        previewMode={previewMode}
        onPickExerciseType={onPickExerciseType}
        onExerciseChanged={onExerciseChanged}
      />
    );
  }
  if (block.type === "assignment") {
    return (
      <AssignmentBlockBody
        block={block}
        previewMode={previewMode}
        courseId={courseId}
        onUpdate={onUpdate}
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
    <div className="rounded-lg border border-transparent transition-colors hover:border-border-strong">
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

function PresentationBlockBody({
  block,
  previewMode,
  onUpdate,
}: {
  block: LessonBlock;
  previewMode: boolean;
  onUpdate: (patch: Partial<LessonBlock>) => void;
}) {
  const { t } = useTranslation();
  if (previewMode) {
    return <PresentationEmbed url={block.url} emptyLabel={t("admin.lessonEditor.slidesEmpty")} />;
  }
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={block.url || ""}
        onChange={(e) => onUpdate({ url: e.target.value })}
        placeholder="https://docs.google.com/presentation/d/e/…/embed"
        className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <p className="text-xs text-text-muted">{t("admin.lessonEditor.slidesHint")}</p>
      <PresentationEmbed url={block.url} emptyLabel={t("admin.lessonEditor.slidesEmpty")} />
    </div>
  );
}

function ExerciseBlockBody({
  block,
  exercises,
  previewMode,
  onPickExerciseType,
  onExerciseChanged,
}: {
  block: LessonBlock;
  exercises: ExerciseSummary[];
  previewMode: boolean;
  onPickExerciseType: (type: ExerciseType, config?: Record<string, unknown>) => void;
  onExerciseChanged: () => void;
}) {
  const { t } = useTranslation();
  const [mathExpanded, setMathExpanded] = useState(false);
  const exercise = block.exercise_id ? exercises.find((e) => e.id === block.exercise_id) : null;

  if (previewMode) {
    // The same component the exercise page previews with, so a matching
    // task draws its connection lines here and an ordering task drags. It
    // also owns the "nothing picked yet" placeholder.
    return <ExercisePreview exercise={exercise as never} />;
  }

  // Edit mode, no exercise yet: grouped type picker (specs/017 US4/US5).
  if (!exercise) {
    const metaByValue = Object.fromEntries(EXERCISE_TYPES_META.map((m) => [m.value, m]));
    return (
      <div className="rounded-lg border-2 border-dashed border-primary-soft bg-primary-soft/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
          Pick exercise type — created instantly
        </p>
        <div className="space-y-3">
          {EXERCISE_GROUPS.map((group) => (
            <div key={group.key}>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-text-subtle">
                {t(group.labelKey)}
              </p>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {group.types.map((value) => {
                  const meta = metaByValue[value];
                  if (!meta) return null;
                  const Icon = meta.Icon;
                  const isMath = value === "math_interactive";
                  return (
                    <button
                      key={value}
                      onClick={() =>
                        isMath ? setMathExpanded((x) => !x) : onPickExerciseType(value)
                      }
                      className="flex flex-col items-center gap-1.5 rounded-lg bg-bg px-2 py-2.5 text-center text-2xs text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                      title={meta.label}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                      <span className="leading-tight">
                        {meta.label}
                        {isMath && (
                          <ChevronDown
                            className={`ml-0.5 inline h-3 w-3 transition-transform ${mathExpanded ? "rotate-180" : ""}`}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Math Interactive is a family of templates — show them here
                  so "Number Line" is findable from the catalogue (US5). */}
              {group.key === "math" && mathExpanded && (
                <div className="mt-1.5 grid grid-cols-4 gap-1.5 rounded-lg border border-border-strong bg-surface p-2 sm:grid-cols-6">
                  {TEMPLATE_LIST.map(({ type, label, Icon: TplIcon }) => (
                    <button
                      key={type}
                      onClick={() =>
                        onPickExerciseType("math_interactive", { template_type: type })
                      }
                      className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-center text-2xs text-text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                      title={label}
                    >
                      <TplIcon className="h-4 w-4" strokeWidth={1.75} />
                      <span className="leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Edit mode, exercise exists: render inline config panel right on the page.
  const TypeIcon = getExerciseIcon(exercise.exercise_type as ExerciseType);
  return (
    <div className="rounded-lg border border-border-strong bg-surface-2 p-4">
      <div className="mb-3 flex items-center gap-2">
        <TypeIcon className="h-5 w-5 text-text-muted" strokeWidth={1.75} />
        <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-text-muted">
          {EXERCISE_TYPE_LABELS[exercise.exercise_type as ExerciseType] || exercise.exercise_type}
        </span>
      </div>
      <ExerciseConfigPanel exerciseId={exercise.id} onSaved={onExerciseChanged} />
    </div>
  );
}

/* ─── Assignment block (specs/017 US3) ───────────────────────────────── */

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  allow_late: boolean;
}

function AssignmentBlockBody({
  block,
  previewMode,
  courseId,
  onUpdate,
}: {
  block: LessonBlock;
  previewMode: boolean;
  courseId: string;
  onUpdate: (patch: Partial<LessonBlock>) => void;
}) {
  const { t } = useTranslation();
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [orphaned, setOrphaned] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", max_score: "100", allow_late: false });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!block.assignment_id) return;
    apiClient
      .get(`/assignments/${block.assignment_id}`)
      .then(({ data }) => {
        if (cancelled) return;
        setAssignment(data);
        setForm({
          title: data.title,
          description: data.description || "",
          due_date: data.due_date ? data.due_date.slice(0, 16) : "",
          max_score: String(data.max_score ?? 100),
          allow_late: !!data.allow_late,
        });
      })
      .catch(() => {
        if (!cancelled) setOrphaned(true);
      });
    return () => {
      cancelled = true;
    };
  }, [block.assignment_id]);

  const save = async () => {
    if (!form.title.trim() || !form.due_date) return;
    setBusy(true);
    const payload = {
      course_id: courseId,
      title: form.title.trim(),
      description: form.description.trim(),
      due_date: new Date(form.due_date).toISOString(),
      max_score: parseInt(form.max_score, 10) || 100,
      allow_late: form.allow_late,
    };
    try {
      if (block.assignment_id) {
        const { data } = await apiClient.put(`/assignments/${block.assignment_id}`, payload);
        setAssignment(data);
        setEditing(false);
      } else {
        const { data } = await apiClient.post("/assignments", payload);
        setAssignment(data);
        onUpdate({ assignment_id: data.id });
      }
      toast.success(t("admin.lessonEditor.assignmentSaved"));
    } catch (err) {
      toast.error(t("admin.lessonEditor.failedSaveAssignment"));
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  if (orphaned) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface-2 p-4 text-sm text-text-subtle">
        {t("admin.lessonEditor.assignmentRemoved")}
      </div>
    );
  }

  // Summary card (preview mode, or saved and not editing)
  if (assignment && (previewMode || !editing)) {
    return (
      <div className="rounded-lg border border-border-strong bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ClipboardCheck className="mt-0.5 h-5 w-5 text-primary" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-semibold text-text">{assignment.title}</p>
              <p className="mt-0.5 text-xs text-text-muted">
                {t("admin.lessonEditor.assignmentDue")}{" "}
                {new Date(assignment.due_date).toLocaleString()} ·{" "}
                {assignment.max_score} {t("admin.lessonEditor.assignmentPoints")}
              </p>
              {assignment.description && (
                <p className="mt-1 text-xs text-text-subtle">{assignment.description}</p>
              )}
            </div>
          </div>
          {!previewMode && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border-strong px-2.5 py-1 text-xs text-text-muted hover:border-primary hover:text-primary"
            >
              {t("common.edit")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface-2 p-4 text-sm italic text-text-subtle">
        {t("admin.lessonEditor.assignmentEmpty")}
      </div>
    );
  }

  // Create / edit form
  return (
    <div className="space-y-2 rounded-lg border-2 border-dashed border-primary-soft bg-primary-soft/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        {t("admin.lessonEditor.assignmentBlockTitle")}
      </p>
      <input
        type="text"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder={t("admin.lessonEditor.assignmentTitlePlaceholder")}
        className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder={t("admin.lessonEditor.assignmentDescPlaceholder")}
        rows={2}
        className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <input
          type="datetime-local"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          className="rounded-lg border border-border-strong px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
        <input
          type="number"
          value={form.max_score}
          onChange={(e) => setForm({ ...form, max_score: e.target.value })}
          min={1}
          className="w-20 rounded-lg border border-border-strong px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
          title={t("admin.lessonEditor.assignmentPoints")}
        />
        <label className="flex items-center gap-1.5 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={form.allow_late}
            onChange={(e) => setForm({ ...form, allow_late: e.target.checked })}
          />
          {t("admin.lessonEditor.assignmentAllowLate")}
        </label>
        <button
          onClick={save}
          disabled={busy || !form.title.trim() || !form.due_date}
          className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
