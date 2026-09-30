import { describe, expect, it } from "vitest";

import { SUBJECT_SURFACE, subjectOf } from "./subject";

describe("subjectOf", () => {
  // Every value courses.category held on prod on 2026-09-30.
  it.each([
    ["Languages", "lang"],
    ["Programming", "code"],
    ["programming", "code"],
    ["Mathematics", "math"],
    ["platform", "other"],
    ["testing", "other"],
    [null, "other"],
  ] as const)("prod category %s → %s", (category, subject) => {
    expect(subjectOf(category)).toBe(subject);
  });

  it.each([
    ["  LANGUAGE ", "lang"],
    ["Языки", "lang"],
    ["Math", "math"],
    ["Algebra", "math"],
    ["Математика", "math"],
    ["Computer Science", "code"],
    ["Программирование", "code"],
    ["", "other"],
    [undefined, "other"],
  ] as const)("%s → %s", (category, subject) => {
    expect(subjectOf(category)).toBe(subject);
  });

  it("gives every subject a surface class", () => {
    for (const s of ["lang", "math", "code", "other"] as const) {
      expect(SUBJECT_SURFACE[s]).toMatch(/^bg-subject-/);
    }
  });
});
