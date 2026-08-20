import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { ANSWER_KEY_BY_TYPE, missingAnswerKey } from "./answer-key";

/**
 * The warning is only as true as the map it reads, and the real map lives in
 * Python. So this test reads the Python and compares — a type added to the
 * grader's list without being added here would mean an exercise that scores
 * everybody full marks and says nothing.
 */
const SERVICE = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "backend",
  "app",
  "submissions",
  "service.py",
);

function backendMap(): Record<string, string> {
  const source = readFileSync(SERVICE, "utf-8");
  const block = source.split("_ANSWER_KEY_BY_TYPE = {")[1]?.split("}")[0] ?? "";
  const map: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*"([a-z_]+)":\s*"([a-z_]+)"/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

describe("the answer-key map matches the grader's", () => {
  it("names the same types and the same keys", () => {
    expect(ANSWER_KEY_BY_TYPE).toEqual(backendMap());
  });
});

describe("missingAnswerKey", () => {
  it("names the empty key — the crossword that scored 100 for everyone", () => {
    expect(missingAnswerKey("crossword", { words: [], grid_size: 10 })).toBe("words");
    expect(missingAnswerKey("bubble_sheet", { questions: [], num_options: 4 })).toBe("questions");
  });

  it("treats a missing key as empty", () => {
    expect(missingAnswerKey("matching", {})).toBe("pairs");
    expect(missingAnswerKey("matching", undefined)).toBe("pairs");
  });

  it("says nothing when the key is filled", () => {
    expect(missingAnswerKey("crossword", { words: [{ word: "CAT" }] })).toBeNull();
    expect(missingAnswerKey("conjugation", { table: [{ pronoun: "je" }] })).toBeNull();
    expect(missingAnswerKey("math_stepwise", { final_answer: "42" })).toBeNull();
  });

  it("says nothing for types graded another way", () => {
    // quiz answers live in the questions relation; the games are marked by
    // replaying the pupil's program on the server.
    expect(missingAnswerKey("quiz", {})).toBeNull();
    expect(missingAnswerKey("robot_2d", {})).toBeNull();
    expect(missingAnswerKey("math_interactive", {})).toBeNull();
  });

  it("counts an empty string and an empty object as empty", () => {
    expect(missingAnswerKey("math_stepwise", { final_answer: "  " })).toBe("final_answer");
    expect(missingAnswerKey("conjugation", { table: {} })).toBe("table");
  });
});
