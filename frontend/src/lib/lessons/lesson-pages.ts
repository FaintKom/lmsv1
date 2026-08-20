/**
 * A lesson as pages — the shape the editor and the student player share.
 *
 * A page is what the owner calls a block: a screen the student scrolls
 * through and leaves by pressing Next. It has no type of its own; the
 * typed things (text, video, presentation, HTML, exercise, assignment)
 * live inside it, mixed freely.
 *
 * One shape, read and written: {version:3, pages:[{id, title?, blocks:[…]}]}.
 *
 * The flat v2 block list and the v1 body/url pair were rewritten in the
 * table by the p4g3sv3rs10n migration, so nothing here reads them any more.
 * Content that is neither — the type-specific config of a legacy quiz or
 * theory lesson, which pages cannot express — yields a single empty page
 * here and is drawn by its own viewer.
 */

import type { LessonBlock } from "@/types/api";

export interface LessonPage {
  id: string;
  title?: string;
  blocks: LessonBlock[];
}

export function generatePageId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sorted(blocks: LessonBlock[]): LessonBlock[] {
  return blocks.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** One page holding everything — how v1 and v2 lessons are presented. */
function singlePage(blocks: LessonBlock[]): LessonPage[] {
  return [{ id: "page_1", blocks }];
}

/**
 * The lesson's pages.
 *
 * Always returns at least one page: an empty lesson is a blank page the
 * teacher can fill, not an absence the callers have to special-case.
 */
export function extractPages(content: Record<string, unknown> | undefined): LessonPage[] {
  if (content && content.version === 3 && Array.isArray(content.pages)) {
    const pages = (content.pages as LessonPage[])
      .filter((p) => p && typeof p === "object")
      .map((p, i) => ({
        id: p.id || `page_${i + 1}`,
        ...(p.title ? { title: p.title } : {}),
        blocks: sorted(Array.isArray(p.blocks) ? p.blocks : []),
      }));
    return pages.length > 0 ? pages : singlePage([]);
  }
  return singlePage([]);
}

/**
 * Pages back into lesson content.
 *
 * `sort_order` is rewritten from array position and `page` from the page
 * index, so a block always agrees with where it actually sits — the two
 * numbers are derived, never edited by hand.
 */
export function buildPagesContent(pages: LessonPage[]): Record<string, unknown> {
  return {
    version: 3,
    pages: pages.map((p, pageIndex) => ({
      id: p.id,
      ...(p.title ? { title: p.title } : {}),
      blocks: p.blocks.map((b, i) => ({ ...b, sort_order: i, page: pageIndex + 1 })),
    })),
  };
}

/** Every block of every page, in reading order. */
export function flattenPages(pages: LessonPage[]): LessonBlock[] {
  return pages.flatMap((p) => p.blocks);
}
