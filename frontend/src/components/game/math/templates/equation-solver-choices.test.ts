import { describe, expect, it } from "vitest";

import { buildSolverChoices, GENERIC_DISTRACTORS } from "./equation-solver-choices";

const identity = <T,>(arr: T[]): T[] => arr;

describe("buildSolverChoices", () => {
  it("uses authored distractors verbatim", () => {
    const choices = buildSolverChoices(
      { id: "s1", actionLabel: "Divide both sides by 2", distractors: ["Add 2", "Subtract 2"] },
      identity
    );
    expect(choices.map((c) => c.label)).toEqual([
      "Divide both sides by 2",
      "Add 2",
      "Subtract 2",
    ]);
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
  });

  it("cleans blanks, duplicates and the correct label from authored lists", () => {
    const choices = buildSolverChoices(
      {
        id: "s1",
        actionLabel: "Divide both sides by 2",
        distractors: ["  ", "Add 2", "Add 2", "Divide both sides by 2"],
      },
      identity
    );
    expect(choices.map((c) => c.label)).toEqual(["Divide both sides by 2", "Add 2"]);
  });

  it("falls back to two generic distractors when none authored", () => {
    const choices = buildSolverChoices({ id: "s1", actionLabel: "Divide both sides by 2" }, identity);
    expect(choices).toHaveLength(3);
    const wrong = choices.filter((c) => !c.correct).map((c) => c.label);
    for (const w of wrong) expect(GENERIC_DISTRACTORS).toContain(w);
  });

  it("never offers the correct action as a generic distractor", () => {
    const choices = buildSolverChoices({ id: "s1", actionLabel: "Add 1 to both sides" }, identity);
    const wrong = choices.filter((c) => !c.correct).map((c) => c.label);
    expect(wrong).not.toContain("Add 1 to both sides");
  });
});
