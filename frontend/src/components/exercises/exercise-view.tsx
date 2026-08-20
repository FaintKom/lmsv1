"use client";

/**
 * One exercise — the only place that decides how one is drawn.
 *
 * Every caller goes through here: the student's lesson, the teacher's
 * preview in the lesson editor, and the preview panel in the exercise
 * library. The decision used to be copied per caller and drifted: the
 * lesson editor handed every type to the legacy renderer, so a matching
 * task appeared without its connection lines and ordering without its
 * dragging — neither of which is what the student gets.
 *
 * Sixteen types are drawn by their own widget with the server as judge
 * (`/exercises/{id}/check` and `/submit`). The rest — the robot, the 3D
 * world, math interactive, the code challenge, the web editor, SCORM,
 * step-by-step, flashcards, word search, file upload — have exactly one
 * implementation, and it lives behind ExerciseRenderer.
 *
 * `preview` keeps a teacher's run off every persisting path: verdicts go
 * through /check, no attempt is spent, nothing is submitted.
 */

import ExerciseRenderer from "@/components/exercises/exercise-renderer";
import { V2ExerciseLive } from "@/components/exercises/v2-exercise-live";
import { isV2LiveType } from "@/lib/exercises/v2-adapter";
import { missingAnswerKey } from "@/lib/exercises/answer-key";
import { useTranslation } from "@/lib/i18n/context";

interface LessonNavItem {
  id: string;
  title: string;
}

interface ExerciseViewProps {
  /** The exercise as the caller has it — an editor's unsaved edits included.
   *  Null while a block has been added but no type picked yet. */
  exercise: { exercise_type: string; [key: string]: unknown } | null | undefined;
  /** Teacher test run: nothing is recorded. */
  preview?: boolean;
  /** Student-path context, used by the types that draw their own lesson nav. */
  courseId?: string;
  prevLesson?: LessonNavItem | null;
  nextLesson?: LessonNavItem | null;
  /** Live-lesson draft capture, forwarded to whichever component draws. */
  onAnswersChange?: (answers: Record<string, unknown>) => void;
}

export function ExerciseView({
  exercise,
  preview = false,
  courseId = "",
  prevLesson = null,
  nextLesson = null,
  onAnswersChange,
}: ExerciseViewProps) {
  const { t } = useTranslation();

  if (!exercise) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface-2 p-4 text-center text-sm text-text-subtle">
        {t("admin.lessonEditor.emptyExercise")}
      </div>
    );
  }

  if (isV2LiveType(exercise.exercise_type)) {
    return (
      <V2ExerciseLive
        exercise={exercise as never}
        previewMode={preview}
        onAnswersChange={onAnswersChange}
      />
    );
  }
  return (
    <ExerciseRenderer
      exercise={exercise as never}
      courseId={courseId}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
      previewMode={preview}
      onAnswersChange={onAnswersChange}
    />
  );
}

/**
 * A teacher's preview — the same view, with nothing recorded, plus the one
 * thing a preview can say that a student's screen must not: that this
 * exercise has no answer to mark against, and will pass everybody.
 */
export function ExercisePreview({ exercise }: { exercise: ExerciseViewProps["exercise"] }) {
  const { t } = useTranslation();
  const missing = exercise
    ? missingAnswerKey(
        exercise.exercise_type,
        exercise.config as Record<string, unknown> | undefined,
      )
    : null;

  return (
    <>
      {missing && (
        <p className="mb-3 rounded-lg border border-warning bg-warning-soft px-3 py-2 text-sm text-warning-fg">
          {fill(t("admin.exercisePreview.noAnswerKey"), { key: missing })}
        </p>
      )}
      <ExerciseView exercise={exercise} preview />
    </>
  );
}

/** `t()` takes no parameters; the key carries a `{key}` placeholder. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}
