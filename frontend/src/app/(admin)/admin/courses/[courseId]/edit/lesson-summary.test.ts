import { describe, expect, it } from "vitest";

import { lessonSummary } from "./lesson-summary";

function pages(...pageBlocks: string[][]) {
  return {
    version: 3,
    pages: pageBlocks.map((kinds, i) => ({
      id: `page_${i + 1}`,
      blocks: kinds.map((type, j) => ({ id: `b${j}`, type, sort_order: j, page: i + 1 })),
    })),
  };
}

describe("lessonSummary", () => {
  it("describes a lesson by what is in it", () => {
    // The whole point. Before this, every lesson in the product — including
    // one with eight blocks — reported "No content yet" to its author.
    const summary = lessonSummary(pages(["text", "exercise", "exercise"]));
    expect(summary).toEqual({
      kind: "filled",
      pages: 1,
      counts: [
        { type: "text", count: 1 },
        { type: "exercise", count: 2 },
      ],
    });
  });

  it("counts the pages when there is more than one", () => {
    const summary = lessonSummary(pages(["text"], ["exercise"], ["video"]));
    expect(summary).toMatchObject({ kind: "filled", pages: 3 });
  });

  it("keeps the kinds in the order the add menu offers them", () => {
    // Not alphabetical and not first-seen: the same order the teacher picks
    // from, so the summary reads like the menu they already know.
    const summary = lessonSummary(pages(["assignment", "exercise", "video", "text"]));
    expect(summary).toMatchObject({
      counts: [
        { type: "text", count: 1 },
        { type: "video", count: 1 },
        { type: "exercise", count: 1 },
        { type: "assignment", count: 1 },
      ],
    });
  });

  it("leaves out kinds the lesson does not use", () => {
    const summary = lessonSummary(pages(["text", "text"]));
    expect(summary).toMatchObject({ counts: [{ type: "text", count: 2 }] });
  });

  it("calls a lesson with pages but no blocks empty", () => {
    // An empty lesson is a legitimate state — claiming it is full would be
    // the same defect pointing the other way.
    expect(lessonSummary(pages([]))).toEqual({ kind: "empty" });
    expect(lessonSummary(pages([], []))).toEqual({ kind: "empty" });
  });

  it("survives content that is not pages", () => {
    // None of these exist in production after the p4g3sv3rs10n migration.
    // The screen still must not break on the shape of someone else's data.
    expect(lessonSummary({})).toEqual({ kind: "empty" });
    expect(lessonSummary(undefined)).toEqual({ kind: "empty" });
    expect(lessonSummary({ version: 2, blocks: [] })).toEqual({ kind: "empty" });
    expect(lessonSummary({ body: "<p>Old text.</p>" })).toEqual({ kind: "empty" });
  });

  it("ignores blocks that are not objects with a type", () => {
    const odd = {
      version: 3,
      pages: [{ id: "page_1", blocks: [null, "text", { id: "b", type: "text" }] }],
    };
    expect(lessonSummary(odd)).toEqual({
      kind: "filled",
      pages: 1,
      counts: [{ type: "text", count: 1 }],
    });
  });
});
