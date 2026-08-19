import type { LessonBlock } from "@/types/api";

/**
 * Adopt exercises attached to the lesson but not embedded in any block
 * (specs/017 US2). They are appended as exercise blocks in by-lesson order —
 * the same order the student page renders them today for its "not already
 * embedded" tail — so adoption changes nothing students see.
 */
export function adoptDetachedExercises(
  blocks: LessonBlock[],
  byLessonIds: string[]
): LessonBlock[] {
  const embedded = new Set(
    blocks.filter((b) => b.type === "exercise" && b.exercise_id).map((b) => b.exercise_id)
  );
  const lastPage = blocks.reduce((m, b) => Math.max(m, b.page || 1), 1);
  const adopted = byLessonIds
    .filter((id) => !embedded.has(id))
    .map(
      (exercise_id, i): LessonBlock => ({
        id: `adopted_${exercise_id}`,
        type: "exercise",
        sort_order: blocks.length + i,
        page: lastPage,
        exercise_id,
      })
    );
  return adopted.length ? [...blocks, ...adopted] : blocks;
}
