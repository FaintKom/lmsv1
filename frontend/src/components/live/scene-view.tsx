"use client";

import { useEffect, useRef, useState } from "react";

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
}

export function SceneView({ lessonId, scene, boardHandleRef, interactive }: Props) {
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
      <TaskPane exerciseId={scene.payload.exercise_id as string} interactive={interactive} />
    );
  }
  if (scene.type === "solution") {
    return <SolutionPane payload={scene.payload} />;
  }
  return (
    <div className="flex h-full items-center justify-center text-2xl text-text-muted">
      {t("live.lesson")}
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

function TaskPane({ exerciseId, interactive }: { exerciseId: string; interactive: boolean }) {
  const { t } = useTranslation();
  const [exercise, setExercise] = useState<{
    id: string;
    exercise_type: string;
    title?: string;
    config: Record<string, unknown>;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setExercise(null);
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
  if (isV2LiveType(exercise.exercise_type)) {
    return (
      <V2ExerciseLive key={exercise.id} exercise={exercise} onAnswersChange={handleAnswers} />
    );
  }
  return (
    <div className="mx-auto h-full max-w-[880px] overflow-y-auto p-4">
      <ExerciseRenderer
        key={exercise.id}
        exercise={exercise as never}
        onAnswersChange={handleAnswers}
      />
    </div>
  );
}

function SolutionPane({ payload }: { payload: Record<string, unknown> }) {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-4 font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
        {payload.anonymous ? t("live.anonymous") : String(payload.student_name ?? "")}
      </div>
      {payload.source_code ? (
        <pre className="overflow-x-auto rounded-md bg-ink-900 p-4 font-mono text-sm text-paper">
          {String(payload.source_code)}
        </pre>
      ) : null}
      {payload.answers ? (
        <pre className="mt-4 overflow-x-auto rounded-md bg-surface-2 p-4 font-mono text-sm text-text">
          {JSON.stringify(payload.answers, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
