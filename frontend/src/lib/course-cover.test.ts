import { describe, expect, it } from "vitest";

import { COVER_W, coverArt } from "./course-cover";
import type { Subject } from "./subject";

const SUBJECTS: Subject[] = ["lang", "math", "code", "other"];
const IDS = Array.from({ length: 24 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);

/** Right-most x reached by lines, rects and path points. */
function rightEdge(svg: string): number {
  const xs: number[] = [];
  for (const m of svg.matchAll(/\b(?:x1|x2|x)="([\d.]+)"/g)) xs.push(+m[1]);
  for (const m of svg.matchAll(/<rect x="([\d.]+)"[^>]*width="([\d.]+)"/g)) xs.push(+m[1] + +m[2]);
  for (const m of svg.matchAll(/[ML]([\d.]+),/g)) xs.push(+m[1]);
  return Math.max(...xs);
}

describe("coverArt (specs/073)", () => {
  it.each(SUBJECTS)("%s: the same course always gets the same drawing", (s) => {
    expect(coverArt(s, IDS[0])).toBe(coverArt(s, IDS[0]));
  });

  it.each(SUBJECTS)("%s: neighbouring courses do not all look alike", (s) => {
    const distinct = new Set(IDS.map((id) => coverArt(s, id)));
    expect(distinct.size).toBeGreaterThan(IDS.length / 2);
  });

  it("maths draws more than one kind of function", () => {
    // The first point of the curve sits at a different height per function.
    const starts = new Set(IDS.map((id) => coverArt("math", id).match(/d="M[\d.]+,([\d.]+)/)![1].split(".")[0]));
    expect(starts.size).toBeGreaterThan(2);
  });

  it.each(["lang", "math", "code"] as Subject[])("%s: keeps a margin from the right edge", (s) => {
    for (const id of IDS) expect(rightEdge(coverArt(s, id)), id).toBeLessThanOrEqual(COVER_W - 16);
  });

  it.each(SUBJECTS)("%s: numbers only, colour from the token", (s) => {
    for (const id of IDS) {
      const svg = coverArt(s, id);
      expect(svg).not.toMatch(/NaN|undefined|Infinity|#[0-9a-f]{3}/i);
      expect(svg).toContain(`var(--subject-line-${s})`);
    }
  });
});
