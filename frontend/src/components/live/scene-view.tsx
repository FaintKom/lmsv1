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

function MaterialPane({ payload }: { payload: Record<string, unknown> }) {
  const [content, setContent] = useState<{ body: string; format: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setContent(null);
    void apiClient
      .get(`/courses/${payload.course_id}/lessons/${payload.lesson_id}`)
      .then(({ data }) => {
        if (cancelled) return;
        const body = data.content?.body;
        if (typeof body === "string" && body.trim().length > 0) {
          setContent({ body, format: data.content?.format || "markdown" });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [payload.course_id, payload.lesson_id]);
  if (!content) return null;
  return (
    <div className="h-full overflow-y-auto p-6">
      <ContentRenderer body={content.body} format={content.format as never} />
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

  const handleAnswers = (answers: Record<string, unknown>) => {
    latestAnswers.current = answers;
    if (draftTimer.current != null) return;
    draftTimer.current = setTimeout(() => {
      draftTimer.current = null;
      const body = JSON.stringify(latestAnswers.current);
      if (body === lastSent.current) return;
      lastSent.current = body;
      void saveDraft(exerciseId, latestAnswers.current);
    }, 7000);
  };

  if (!exercise) return null;
  if (!interactive) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <div className="text-3xl font-bold">{exercise.title ?? ""}</div>
        <div className="text-text-muted">{t("live.scene.task")}</div>
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
      <ExerciseRenderer key={exercise.id} exercise={exercise as never} />
    </div>
  );
}

function SolutionPane({ payload }: { payload: Record<string, unknown> }) {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 text-sm text-text-muted">
        {payload.anonymous ? t("live.anonymous") : String(payload.student_name ?? "")}
      </div>
      {payload.source_code ? (
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-sm">
          {String(payload.source_code)}
        </pre>
      ) : null}
      {payload.answers ? (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-sm">
          {JSON.stringify(payload.answers, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
