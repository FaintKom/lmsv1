/**
 * Declarative registry of every exercise type the QA harness covers.
 *
 * Single source of truth, shared with the Python seed:
 *   - This file imports qa/exercise-fixtures.json (resolveJsonModule)
 *   - scripts/seed_qa.py reads the same JSON via assert_fixture_coverage()
 *
 * Adding a new exercise type:
 *   1. Add the value to ExerciseType (backend enum + frontend union)
 *   2. Add a fixture entry to qa/exercise-fixtures.json
 *   3. The seed parity guard and the vitest parity test will both pass
 *      once the new entry covers the enum value.
 */
import fixtures from "../../../qa/exercise-fixtures.json";

import type { ExerciseType } from "@/lib/api/exercises";

export interface ExerciseQuestionFixture {
  question_text: string;
  question_type: "multiple_choice" | "text_answer";
  options?: Array<{ text: string; is_correct?: boolean }> | null;
  correct_answer?: string | null;
  points?: number;
}

export interface ExerciseTestCaseFixture {
  input?: string;
  expected_output: string;
  is_hidden?: boolean;
}

export interface ExerciseTypeSpec {
  type: ExerciseType;
  label: string;
  config: Record<string, unknown>;
  questions?: ExerciseQuestionFixture[];
  test_cases?: ExerciseTestCaseFixture[];
  /**
   * If set, lifecycle tests skip this type and report the reason. Use for
   * types that need out-of-band setup (SCORM .zip upload, file binary).
   */
  skipReason?: string;
}

interface FixturesFile {
  $schema_version: number;
  $doc?: string;
  fixtures: ExerciseTypeSpec[];
}

const raw = fixtures as FixturesFile;

export const EXERCISE_REGISTRY: readonly ExerciseTypeSpec[] = raw.fixtures;

export function getSpec(type: ExerciseType): ExerciseTypeSpec {
  const found = EXERCISE_REGISTRY.find((s) => s.type === type);
  if (!found) {
    throw new Error(`No fixture registered for exercise type: ${type}`);
  }
  return found;
}
