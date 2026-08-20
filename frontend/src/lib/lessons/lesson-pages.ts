/**
 * A lesson as pages — the shape the editor and the student player share.
 *
 * A page is what the owner calls a block: a screen the student scrolls
 * through and leaves by pressing Next. It has no type of its own; the
 * typed things (text, video, presentation, HTML, exercise, assignment)
 * live inside it, mixed freely.
 *
 * Three shapes are read, one is written:
 *
 *   v3  {version:3, pages:[{id, title?, blocks:[…]}]}   ← written
 *   v2  {version:2, blocks:[…]}                          one page
 *   v1  {body}/{url} + content_type                      one page
 *
 * Old lessons are never rewritten on read, so a lesson nobody has edited
 * looks to the student exactly as it did before pages existed.
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
 * The lesson's pages, whatever shape it was saved in.
 *
 * Always returns at least one page: an empty lesson is a blank page the
 * teacher can fill, not an absence the callers have to special-case.
 */
export function extractPages(
  content: Record<string, unknown> | undefined,
  contentType?: string,
): LessonPage[] {
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

  if (content && content.version === 2 && Array.isArray(content.blocks)) {
    return singlePage(sorted(content.blocks as LessonBlock[]));
  }

  // v1: the body/url pair the lesson was authored with before blocks.
  const body = content?.body;
  const url = content?.url;
  const blocks: LessonBlock[] = [];
  if (typeof body === "string" && body.trim()) {
    blocks.push({
      id: "b0",
      type: "text",
      sort_order: 0,
      page: 1,
      body,
      format: (content?.format as string) || "html",
    });
  }
  if (contentType === "video" && typeof url === "string" && url) {
    blocks.push({ id: `b${blocks.length}`, type: "video", sort_order: blocks.length, page: 1, url });
  }
  return singlePage(blocks);
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
