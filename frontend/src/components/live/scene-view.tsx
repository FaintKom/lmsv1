"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

import { ContentRenderer } from "@/components/common/content-renderer";
import ExerciseRenderer from "@/components/exercises/exercise-renderer";
import { V2ExerciseLive } from "@/components/exercises/v2-exercise-live";
import apiClient from "@/lib/api-client";
import { saveDraft, type Scene } from "@/lib/api/live";
import { isV2LiveType } from "@/lib/exercises/v2-adapter";
import { useTranslation } from "@/lib/i18n/context";

import { BoardView, type BoardViewHandle } from "./board-view";

interface Props {
  lessonId: string;
  scene: Scene;
  boardHandleRef: React.MutableRefObject<BoardViewHandle | null>;
  interactive: boolean; // false on projector
  /** strict follow mode: the student cannot close the assigned task */
  canQuit?: boolean;
}

export function SceneView({ lessonId, scene, boardHandleRef, interactive, canQuit = true }: Props) {
  const { t } = useTranslation();

  if (scene.type === "board") {
    return (
      <BoardView
        lessonId={lessonId}
        boardId={scene.payload.board_id as string}
        handleRef={boardHandleRef}
      />
    );
  }
  if (scene.type === "material") {
    return (
      <div className="relative h-full">
        <MaterialPane payload={scene.payload} />
        {scene.payload.annotation_board_id ? (
          <div className="pointer-events-none absolute inset-0">
            <BoardView
              lessonId={lessonId}
              boardId={scene.payload.annotation_board_id as string}
              handleRef={boardHandleRef}
            />
          </div>
        ) : null}
      </div>
    );
  }
  if (scene.type === "task") {
    return (
      <TaskPane payload={scene.payload} interactive={interactive} canQuit={canQuit} />
    );
  }
  if (scene.type === "solution") {
    return <SolutionPane payload={scene.payload} />;
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <span className="flex items-center gap-2 rounded-pill bg-coral-50 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-coral-700">
        <span className="h-2 w-2 animate-pulse rounded-pill bg-coral-500" />
        {t("live.lesson")}
      </span>
      <div className="text-xl font-extrabold text-text">{t("live.waiting")}</div>
    </div>
  );
}

interface MaterialBlock {
  id: string;
  type: string;
  body?: string;
  format?: string;
  page?: number;
  sort_order?: number;
}

function MaterialPane({ payload }: { payload: Record<string, unknown> }) {
  // Lessons come back in v2 blocks format (normalize_lesson_content wraps
  // legacy content.body into a text block) — render the readable blocks.
  // ponytail: text/html blocks only; exercises go through the task scene.
  const [blocks, setBlocks] = useState<MaterialBlock[] | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setBlocks(null);
    setTitle(null);
    void apiClient
      .get(`/courses/${payload.course_id}/lessons/${payload.lesson_id}`)
      .then(({ data }) => {
        if (cancelled) return;
        setTitle((data.title as string) ?? "");
        const all = (data.content?.blocks ?? []) as MaterialBlock[];
        setBlocks(
          all
            .filter(
              (b) =>
                (b.type === "text" || b.type === "html") &&
                typeof b.body === "string" &&
                b.body.trim().length > 0,
            )
            .sort(
              (a, b) => (a.page ?? 1) - (b.page ?? 1) || (a.sort_order ?? 0) - (b.sort_order ?? 0),
            ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [payload.course_id, payload.lesson_id]);
  if (title === null) return null; // loading
  if (!blocks || blocks.length === 0) {
    // nothing readable (empty or exercises-only lesson) — show its title,
    // not a blank stage
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-sun-100 text-2xl text-sun-700">
          📖
        </span>
        <span className="text-xl font-extrabold text-text">{title}</span>
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-[820px]">
        <h1 className="mb-6 text-2xl font-extrabold text-text">{title}</h1>
        {blocks.map((b) => (
          <div key={b.id} className="mb-8">
            <ContentRenderer
              body={b.body as string}
              format={(b.format as never) || ("html" as never)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskPane({
  payload,
  interactive,
  canQuit = true,
}: {
  payload: Record<string, unknown>;
  interactive: boolean;
  canQuit?: boolean;
}) {
  const { t } = useTranslation();
  const exerciseId = payload.exercise_id as string;
  // the task payload carries its source material so students can peek at
  // the theory without leaving the exercise
  const materialLessonId = (payload.material_lesson_id as string) ?? null;
  const materialCourseId = (payload.material_course_id as string) ?? null;
  const [showMaterial, setShowMaterial] = useState(false);
  const [exercise, setExercise] = useState<{
    id: string;
    exercise_type: string;
    title?: string;
    config: Record<string, unknown>;
  } | null>(null);
  const [done, setDone] = useState<null | "solved" | "closed">(null);
  useEffect(() => {
    let cancelled = false;
    setExercise(null);
    setDone(null);
    void apiClient
      .get(`/exercises/${exerciseId}`)
      .then(({ data }) => {
        if (!cancelled) setExercise(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);
  // live-lesson draft autosave: throttled + dirty-checked (spec §11)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<string>("");
  const latestAnswers = useRef<Record<string, unknown> | null>(null);

  const flushDraft = () => {
    draftTimer.current = null;
    const body = JSON.stringify(latestAnswers.current);
    if (body === lastSent.current || latestAnswers.current == null) return;
    lastSent.current = body;
    const src = (latestAnswers.current as { source_code?: string }).source_code;
    void saveDraft(exerciseId, latestAnswers.current, src);
  };

  const handleAnswers = (answers: Record<string, unknown>) => {
    latestAnswers.current = answers;
    if (draftTimer.current != null) return;
    draftTimer.current = setTimeout(flushDraft, 7000);
  };

  // scene switch / unmount: don't lose the last few seconds of typing
  useEffect(
    () => () => {
      if (draftTimer.current != null) {
        clearTimeout(draftTimer.current);
        flushDraft();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exerciseId],
  );

  if (!exercise) return null;
  if (!interactive) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="text-3xl font-extrabold text-text">{exercise.title ?? ""}</div>
        <div className="font-mono text-xs font-bold uppercase tracking-wide text-text-subtle">
          {t("live.scene.task")}
        </div>
      </div>
    );
  }
  const materialOverlay =
    materialLessonId && materialCourseId ? (
      <>
        <button
          onClick={() => setShowMaterial(true)}
          className="btn-pop btn-pop--secondary absolute left-1/2 top-4 z-30 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-sm border border-border bg-paper-2 px-3.5 py-1.5 text-xs font-bold text-text"
        >
          📖 {t("live.scene.material")}
        </button>
        {showMaterial && (
          <div className="absolute inset-0 z-40 bg-paper-2">
            <MaterialPane
              payload={{ lesson_id: materialLessonId, course_id: materialCourseId }}
            />
            <button
              onClick={() => setShowMaterial(false)}
              aria-label={t("common.close")}
              className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-text-muted shadow-sm transition-colors hover:bg-ink-100"
            >
              ✕
            </button>
          </div>
        )}
      </>
    ) : null;

  if (done) {
    // finished or closed the player — a clear resting state instead of a
    // reset player or a blank stage (audit S4)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-lg ${
            done === "solved" ? "bg-green-100 text-green-700" : "bg-surface-2 text-ink-400"
          }`}
        >
          <Check size={28} strokeWidth={2.5} />
        </span>
        <div className="text-xl font-extrabold text-text">{exercise.title ?? ""}</div>
        {done === "solved" && (
          <div className="font-mono text-xs font-bold uppercase tracking-wide text-green-700">
            {t("live.solved")}
          </div>
        )}
        <button
          onClick={() => setDone(null)}
          className="btn-pop btn-pop--secondary inline-flex items-center gap-1.5 rounded-md border border-border bg-paper-2 px-4 py-2 text-sm font-bold text-text"
        >
          <RotateCcw size={14} /> {t("live.scene.task")}
        </button>
      </div>
    );
  }
  if (isV2LiveType(exercise.exercise_type)) {
    return (
      <div className="relative h-full">
        {materialOverlay}
        <V2ExerciseLive
          key={exercise.id}
          exercise={exercise}
          onAnswersChange={handleAnswers}
          onFinish={() => setDone("solved")}
          onQuit={canQuit ? () => setDone("closed") : undefined}
        />
      </div>
    );
  }
  return (
    <div className="relative h-full">
      {materialOverlay}
      <div className="mx-auto h-full max-w-[880px] overflow-y-auto p-4">
        <ExerciseRenderer
          key={exercise.id}
          exercise={exercise as never}
          onAnswersChange={handleAnswers}
        />
      </div>
    </div>
  );
}

function SolutionPane({ payload }: { payload: Record<string, unknown> }) {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-y-auto p-8">
      {payload.exercise_title ? (
        <h2 className="mb-1 text-xl font-extrabold text-text">
          {String(payload.exercise_title)}
        </h2>
      ) : null}
      <div className="mb-4 font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
        {payload.anonymous ? t("live.anonymous") : String(payload.student_name ?? "")}
      </div>
      {payload.source_code ? (
        <pre className="overflow-x-auto rounded-md bg-ink-900 p-4 font-mono text-sm text-paper">
          {String(payload.source_code)}
        </pre>
      ) : null}
      {payload.answers ? <AnswerList answers={payload.answers as Record<string, unknown>} /> : null}
    </div>
  );
}

/** Human-readable answers instead of a JSON dump. Arrays render as
 * numbered chips, primitives as labeled rows; anything nested falls back
 * to compact JSON. Also used by the teacher's review inspector. */
export function AnswerList({ answers }: { answers: Record<string, unknown> }) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {Object.entries(answers).map(([key, value]) => (
        <div key={key}>
          <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-text-subtle">
            {key.replace(/_/g, " ")}
          </div>
          {Array.isArray(value) ? (
            <div className="flex flex-wrap gap-1.5">
              {value.map((v, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-paper-2 px-2.5 py-1 text-sm font-semibold text-text"
                >
                  <span className="font-mono text-[10px] font-bold text-ink-300">{i + 1}</span>
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              ))}
            </div>
          ) : typeof value === "object" && value !== null ? (
            <pre className="overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-xs text-text">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <span className="text-sm font-semibold text-text">{String(value)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
