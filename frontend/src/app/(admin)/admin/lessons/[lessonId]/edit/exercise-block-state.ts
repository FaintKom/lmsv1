/**
 * What an exercise block is, from the editor's point of view.
 *
 * Three states hid behind one `if (!exercise)` here, and two of them looked
 * identical on screen: a block whose type the teacher has not picked yet, and
 * a block whose exercise somebody deleted. Both drew the type chooser, so a
 * lesson that had quietly lost an exercise looked like a lesson that was
 * merely unfinished — and the pupil saw nothing at all, because the player
 * skips a block it cannot resolve.
 *
 * Deleting an exercise now takes its blocks off the pages, so "orphan" should
 * be rare. It is not impossible: a teacher with the editor already open
 * autosaves the content they loaded, references and all, after someone else
 * has deleted one. Data cleanup cannot win that race; saying so on screen can.
 */

export type ExerciseBlockState = "unset" | "orphan" | "ready";

export function exerciseBlockState(
  exerciseId: string | undefined,
  exerciseIds: readonly string[],
): ExerciseBlockState {
  if (!exerciseId) return "unset";
  return exerciseIds.includes(exerciseId) ? "ready" : "orphan";
}
