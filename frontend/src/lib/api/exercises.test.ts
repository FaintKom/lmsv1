import { describe, expect, it } from "vitest";

import { ALL_EXERCISE_TYPES, EXERCISE_GROUPS } from "./exercises";

// specs/017-lesson-container US4: the five subject groups must partition the
// full registry — a type missing from the mapping or listed twice must be
// impossible to lose silently.
describe("exercise catalogue groups", () => {
  it("partitions every registered type into exactly one group", () => {
    const grouped = EXERCISE_GROUPS.flatMap((g) => g.types);
    const dupes = grouped.filter((t, i) => grouped.indexOf(t) !== i);
    expect(dupes).toEqual([]);
    expect([...grouped].sort()).toEqual([...ALL_EXERCISE_TYPES].sort());
  });

  it("keeps the owner-defined group compositions", () => {
    const byKey = Object.fromEntries(EXERCISE_GROUPS.map((g) => [g.key, g.types]));
    expect([...byKey.basic].sort()).toEqual(
      [
        "quiz",
        "matching",
        "ordering",
        "fill_blanks",
        "true_false",
        "categorize",
        "file_upload",
        "map_pin_drop",
        "bubble_sheet",
      ].sort()
    );
    expect([...byKey.math].sort()).toEqual(
      ["math_interactive", "math_stepwise", "math_system", "stereometry"].sort()
    );
    expect(byKey.scorm).toEqual(["scorm_package"]);
  });
});
