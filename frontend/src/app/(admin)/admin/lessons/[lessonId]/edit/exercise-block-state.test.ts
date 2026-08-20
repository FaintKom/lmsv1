import { describe, expect, it } from "vitest";

import { exerciseBlockState } from "./exercise-block-state";

const PRESENT = "00000000-0000-0000-0000-000000000001";
const DELETED = "00000000-0000-0000-0000-000000000002";

describe("exerciseBlockState", () => {
  it("calls a block whose exercise is gone an orphan", () => {
    // The case the editor could not see: the block names an exercise, and the
    // exercise is not among the lesson's. Before this it drew the type
    // chooser, indistinguishable from a block nobody had filled in yet.
    expect(exerciseBlockState(DELETED, [PRESENT])).toBe("orphan");
  });

  it("still calls a block with no exercise chosen unset", () => {
    // The guard that keeps the new message from swallowing the old flow: a
    // freshly added block must go on offering the type chooser.
    expect(exerciseBlockState(undefined, [PRESENT])).toBe("unset");
    expect(exerciseBlockState("", [PRESENT])).toBe("unset");
  });

  it("calls a block whose exercise is there ready", () => {
    expect(exerciseBlockState(PRESENT, [PRESENT, DELETED])).toBe("ready");
  });

  it("calls a block an orphan when the lesson has no exercises at all", () => {
    expect(exerciseBlockState(DELETED, [])).toBe("orphan");
  });
});
