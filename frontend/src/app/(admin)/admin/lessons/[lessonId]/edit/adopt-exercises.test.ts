import { describe, expect, it } from "vitest";

import type { LessonBlock } from "@/types/api";
import { adoptDetachedExercises } from "./adopt-exercises";

const block = (over: Partial<LessonBlock>): LessonBlock => ({
  id: "b1",
  type: "text",
  sort_order: 0,
  page: 1,
  ...over,
});

describe("adoptDetachedExercises", () => {
  it("appends detached exercises after existing blocks, in by-lesson order", () => {
    const blocks = [
      block({ id: "b1", type: "text" }),
      block({ id: "b2", type: "exercise", exercise_id: "ex-embedded", sort_order: 1 }),
    ];
    // by-lesson returns embedded + two detached; detached order must survive
    const out = adoptDetachedExercises(blocks, ["ex-embedded", "ex-a", "ex-b"]);
    expect(out.map((b) => b.exercise_id ?? b.type)).toEqual([
      "text",
      "ex-embedded",
      "ex-a",
      "ex-b",
    ]);
    expect(out[2].type).toBe("exercise");
    expect(out[3].sort_order).toBe(3);
  });

  it("adopts onto the last page so pagination does not shuffle content", () => {
    const blocks = [block({ id: "b1", page: 2 })];
    const out = adoptDetachedExercises(blocks, ["ex-a"]);
    expect(out[1].page).toBe(2);
  });

  it("returns the same array when nothing is detached", () => {
    const blocks = [block({ id: "b2", type: "exercise", exercise_id: "ex-1" })];
    expect(adoptDetachedExercises(blocks, ["ex-1"])).toBe(blocks);
    expect(adoptDetachedExercises(blocks, [])).toBe(blocks);
  });

  it("gives adopted blocks stable ids so autosave does not duplicate them", () => {
    const out1 = adoptDetachedExercises([], ["ex-a"]);
    const out2 = adoptDetachedExercises(out1, ["ex-a"]);
    expect(out2).toBe(out1);
  });
});
