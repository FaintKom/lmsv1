/**
 * Which config key holds an exercise's answer, so the editor can say when
 * there isn't one.
 *
 * An exercise whose answer key is empty is not merely unfinished: every
 * `_grade_*` helper answers "full marks, passed" when its part of the config
 * is empty, which is right for content that legitimately has nothing to get
 * wrong and disastrous for content that was authored wrong. On 2026-08-17 a
 * crossword whose config used keys no reader understood rendered as an empty
 * board and scored 100 for anyone who pressed submit; a seeded bubble sheet
 * did the same the next day.
 *
 * The server logs that case. This is the other half: the teacher sees it
 * while they can still fix it.
 *
 * The map mirrors `_ANSWER_KEY_BY_TYPE` in backend/app/submissions/service.py,
 * and answer-key.test.ts reads that file to prove the two still agree.
 */

export const ANSWER_KEY_BY_TYPE: Record<string, string> = {
  matching: "pairs",
  ordering: "correct_order",
  fill_blanks: "blanks",
  categorize: "categories",
  crossword: "words",
  word_search: "words",
  srs_flashcard: "cards",
  reading: "questions",
  conjugation: "table",
  bubble_sheet: "questions",
  dialogue: "messages",
  translation: "accepted_answers",
  sentence_builder: "correct_order",
  map_pin_drop: "pins",
  math_stepwise: "final_answer",
};

/**
 * The config key this exercise is graded from, when it holds nothing.
 *
 * Returns null when the type has no single answer key (quiz keeps answers in
 * its questions relation, the games are marked by replaying them), or when
 * the key is filled — in both cases there is nothing to warn about.
 */
export function missingAnswerKey(
  exerciseType: string,
  config: Record<string, unknown> | undefined,
): string | null {
  const key = ANSWER_KEY_BY_TYPE[exerciseType];
  if (!key) return null;
  const value = config?.[key];
  if (value == null) return key;
  if (Array.isArray(value)) return value.length === 0 ? key : null;
  if (typeof value === "string") return value.trim() === "" ? key : null;
  if (typeof value === "object") return Object.keys(value).length === 0 ? key : null;
  return null;
}
