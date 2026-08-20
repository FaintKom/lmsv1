/**
 * What a lesson holds, for the line under its name in the course editor.
 *
 * That line used to be written by a function that knew two storage shapes:
 * the flat v2 block list, and the v1 body keyed on `content_type`. Lessons
 * became pages in the p4g3sv3rs10n migration and it was never taught the
 * third, so it fell through to the v1 "text" branch, found no `body`, and
 * printed "No content yet" — under every lesson in the product, including
 * ones with eight blocks in them.
 *
 * The author opens a course to see where the gaps are. Getting "empty"
 * everywhere left them one option: open all the lessons, one at a time —
 * exactly the work this line exists to save.
 *
 * Returns data, not a sentence: the wording is six locales' business, and a
 * function that returned English could not be checked against anything.
 */

export type BlockKind = "text" | "html" | "video" | "presentation" | "exercise" | "assignment";

/** The order the add-content menu offers, so the summary reads like the menu. */
const KIND_ORDER: readonly BlockKind[] = [
  "text",
  "html",
  "video",
  "presentation",
  "exercise",
  "assignment",
];

export type LessonSummary =
  | { kind: "empty" }
  | { kind: "filled"; pages: number; counts: { type: BlockKind; count: number }[] };

export function lessonSummary(content: unknown): LessonSummary {
  const pages = pagesOf(content);
  if (!pages) return { kind: "empty" };

  const tally = new Map<BlockKind, number>();
  for (const page of pages) {
    for (const block of blocksOf(page)) {
      const type = (block as { type?: unknown } | null)?.type;
      if (isBlockKind(type)) tally.set(type, (tally.get(type) ?? 0) + 1);
    }
  }
  if (tally.size === 0) return { kind: "empty" };

  return {
    kind: "filled",
    pages: pages.length,
    counts: KIND_ORDER.filter((k) => tally.has(k)).map((type) => ({
      type,
      count: tally.get(type) as number,
    })),
  };
}

function pagesOf(content: unknown): unknown[] | null {
  if (!content || typeof content !== "object") return null;
  const record = content as Record<string, unknown>;
  if (record.version !== 3 || !Array.isArray(record.pages)) return null;
  return record.pages;
}

function blocksOf(page: unknown): unknown[] {
  if (!page || typeof page !== "object") return [];
  const blocks = (page as Record<string, unknown>).blocks;
  return Array.isArray(blocks) ? blocks : [];
}

function isBlockKind(value: unknown): value is BlockKind {
  return typeof value === "string" && (KIND_ORDER as readonly string[]).includes(value);
}
