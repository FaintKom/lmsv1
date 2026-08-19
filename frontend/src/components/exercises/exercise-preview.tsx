"use client";

/**
 * One exercise, shown to a teacher exactly as the student will get it.
 *
 * This exists because the choice it makes was duplicated: the content
 * library preview routed v2 types to their live widgets while the lesson
 * editor's preview handed every type to the legacy renderer. A teacher
 * previewing a matching task there saw the old two-column list with no
 * connection lines, and ordering with arrow buttons and no dragging —
 * neither of which is what the student gets. One component now owns the
 * decision, so a third preview cannot get it wrong again.
 *
 * `previewMode` is passed on both paths: verdicts go through the
 * non-persisting /check route, no attempt is spent, nothing is submitted.
 */

import ExerciseRenderer from "@/components/exercises/exercise-renderer";
import { V2ExerciseLive } from "@/components/exercises/v2-exercise-live";
import { isV2LiveType } from "@/lib/exercises/v2-adapter";

interface ExercisePreviewProps {
  /** The exercise as the editor currently has it — unsaved edits included. */
  exercise: { exercise_type: string; [key: string]: unknown };
}

export function ExercisePreview({ exercise }: ExercisePreviewProps) {
  if (isV2LiveType(exercise.exercise_type)) {
    return <V2ExerciseLive exercise={exercise as never} previewMode />;
  }
  return (
    <ExerciseRenderer
      exercise={exercise as never}
      courseId=""
      prevLesson={null}
      nextLesson={null}
      previewMode
    />
  );
}
