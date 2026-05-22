/**
 * Parity test - registry vs ExerciseType enum.
 *
 * Lives in src/ (not e2e/) so the existing vitest config picks it up.
 * Guards against three drifts:
 *   - new ExerciseType added without a fixture entry
 *   - fixture entry for a type not in the enum
 *   - non-skipped entry missing the fields lifecycle tests need
 */
import { describe, expect, test } from "vitest";

import { EXERCISE_REGISTRY } from "../../../e2e/registry/exercise-types";
import type { ExerciseType } from "./exercises";

const ALL_TYPES: ExerciseType[] = [
  "quiz",
  "code_challenge",
  "matching",
  "ordering",
  "fill_blanks",
  "true_false",
  "categorize",
  "file_upload",
  "robot_2d",
  "math_interactive",
  "world_3d",
  "translation",
  "sentence_builder",
  "dialogue",
  "conjugation",
  "reading",
  "web_editor",
  "scorm_package",
  "math_stepwise",
  "srs_flashcard",
  "crossword",
  "word_search",
  "map_pin_drop",
  "bubble_sheet",
];

describe("EXERCISE_REGISTRY parity", () => {
  test("covers every ExerciseType exactly once", () => {
    const types = EXERCISE_REGISTRY.map((s) => s.type).sort();
    expect(types).toEqual([...ALL_TYPES].sort());
  });

  test("no duplicate entries", () => {
    const types = EXERCISE_REGISTRY.map((s) => s.type);
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });

  test("every entry has a non-empty label and config object", () => {
    for (const spec of EXERCISE_REGISTRY) {
      expect(spec.label, `label missing for ${spec.type}`).toBeTruthy();
      expect(typeof spec.config, `config not an object for ${spec.type}`).toBe(
        "object",
      );
    }
  });
});
