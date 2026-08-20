import { describe, expect, it } from "vitest";

import {
  buildPagesContent,
  extractPages,
  flattenPages,
  type LessonPage,
} from "./lesson-pages";
import type { LessonBlock } from "@/types/api";

const text = (id: string, order = 0): LessonBlock => ({
  id,
  type: "text",
  sort_order: order,
  page: 1,
  body: `<p>${id}</p>`,
  format: "html",
});

describe("extractPages", () => {
  it("reads v3 pages as they were saved", () => {
    const pages = extractPages({
      version: 3,
      pages: [
        { id: "p1", title: "Intro", blocks: [text("a")] },
        { id: "p2", blocks: [text("b"), text("c", 1)] },
      ],
    });
    expect(pages).toHaveLength(2);
    expect(pages[0].title).toBe("Intro");
    expect(pages[1].blocks.map((b) => b.id)).toEqual(["b", "c"]);
  });

  it("orders blocks within a page by sort_order, not array position", () => {
    const [page] = extractPages({
      version: 3,
      pages: [{ id: "p1", blocks: [text("second", 5), text("first", 1)] }],
    });
    expect(page.blocks.map((b) => b.id)).toEqual(["first", "second"]);
  });

  it("gives an empty or unknown lesson a single blank page", () => {
    expect(extractPages(undefined)).toEqual([{ id: "page_1", blocks: [] }]);
    expect(extractPages({})).toEqual([{ id: "page_1", blocks: [] }]);
    expect(extractPages({ version: 3, pages: [] })).toEqual([{ id: "page_1", blocks: [] }]);
  });

  it("reads nothing from the shapes the migration retired", () => {
    // Every row was rewritten into pages by p4g3sv3rs10n; anything still
    // carrying a flat block list or a v1 body is not a lesson this module
    // draws, and inventing content for it would hide that.
    expect(extractPages({ version: 2, blocks: [text("a")] })).toEqual([
      { id: "page_1", blocks: [] },
    ]);
    expect(extractPages({ body: "<p>hello</p>", format: "html" })).toEqual([
      { id: "page_1", blocks: [] },
    ]);
  });
});

describe("buildPagesContent", () => {
  it("round-trips through extractPages", () => {
    const pages: LessonPage[] = [
      { id: "p1", title: "One", blocks: [text("a"), text("b")] },
      { id: "p2", blocks: [text("c")] },
    ];
    const back = extractPages(buildPagesContent(pages));
    expect(back.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(back[0].title).toBe("One");
    expect(back.map((p) => p.blocks.map((b) => b.id))).toEqual([["a", "b"], ["c"]]);
  });

  it("derives sort_order and page from position, whatever the block said", () => {
    const content = buildPagesContent([
      { id: "p1", blocks: [{ ...text("a"), sort_order: 99, page: 7 }] },
      { id: "p2", blocks: [{ ...text("b"), sort_order: 0, page: 7 }] },
    ]) as { pages: LessonPage[] };
    expect(content.pages[0].blocks[0].sort_order).toBe(0);
    expect(content.pages[0].blocks[0].page).toBe(1);
    expect(content.pages[1].blocks[0].page).toBe(2);
  });

  it("writes version 3", () => {
    expect(buildPagesContent([]).version).toBe(3);
  });
});

describe("flattenPages", () => {
  it("reads every block in page order", () => {
    const blocks = flattenPages([
      { id: "p1", blocks: [text("a")] },
      { id: "p2", blocks: [text("b"), text("c")] },
    ]);
    expect(blocks.map((b) => b.id)).toEqual(["a", "b", "c"]);
  });
});
