import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  readableAs,
  readableOn,
  suggestSecondary,
  tooClose,
} from "./contrast";

/**
 * The colour maths, on its own.
 *
 * Every one of these ran red before `contrast.ts` existed, which is the point:
 * today the product picks the text colour on a brand fill from a fixed token
 * and never looks at the brand colour at all. A school with a light brand gets
 * white text on a light fill and is told nothing.
 */

describe("contrastRatio", () => {
  it("gives 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#22c55e", "#22c55e")).toBeCloseTo(1, 5);
  });

  it("does not care which colour is named first", () => {
    expect(contrastRatio("#facc15", "#1a1a18")).toBeCloseTo(
      contrastRatio("#1a1a18", "#facc15"),
      10,
    );
  });
});

describe("readableOn", () => {
  it("puts dark text on a light brand and light text on a dark one", () => {
    expect(readableOn("#facc15")).toBe("#0b0b0b");
    expect(readableOn("#0f172a")).toBe("#ffffff");
  });

  it("clears 4.5:1 for the greens this product ships with", () => {
    for (const brand of ["#22c55e", "#0a8754", "#16a34a"]) {
      expect(contrastRatio(brand, readableOn(brand))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("still answers for a mid-tone that clears nothing, picking the better half", () => {
    // A mid grey is the knife-edge case: neither white nor near-black is
    // comfortable on it. The function must not throw and must not invent a
    // third option — the warning in the settings form is what tells the school.
    const fg = readableOn("#808080");
    expect(["#ffffff", "#0b0b0b"]).toContain(fg);
    expect(contrastRatio("#808080", fg)).toBeGreaterThanOrEqual(
      contrastRatio("#808080", fg === "#ffffff" ? "#0b0b0b" : "#ffffff"),
    );
  });
});

describe("readableAs", () => {
  it("reaches 4.5:1 against a white page", () => {
    const shade = readableAs("#22c55e", "#ffffff");
    expect(contrastRatio(shade, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("reaches 4.5:1 against a dark page, going the other way", () => {
    const shade = readableAs("#0f172a", "#1a1a18");
    expect(contrastRatio(shade, "#1a1a18")).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the hue, because the school's colour has to stay recognisable", () => {
    // A green that darkens is still a green. If this drifts, the school's
    // links stop looking like the school.
    const shade = readableAs("#22c55e", "#ffffff");
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(shade.slice(i, i + 2), 16));
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it("leaves a colour alone when it already clears the bar", () => {
    const already = "#0a5c2e";
    expect(contrastRatio(already, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(readableAs(already, "#ffffff")).toBe(already);
  });
});

describe("suggestSecondary", () => {
  it("offers four colours, all different from the primary", () => {
    const out = suggestSecondary("#22c55e");
    expect(out).toHaveLength(4);
    expect(new Set(out).size).toBe(4);
    expect(out).not.toContain("#22c55e");
  });

  it("returns the same list in the same order every time", () => {
    // The first entry is what a school that never touched the field ends up
    // saving. If the order drifts, their second colour changes underneath them
    // on the next save.
    expect(suggestSecondary("#22c55e")).toEqual(suggestSecondary("#22c55e"));
  });

  it("gives usable hex, not something the colour input will reject", () => {
    for (const hex of suggestSecondary("#facc15")) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("tooClose", () => {
  it("flags a pair that would merge into one line on a chart", () => {
    expect(tooClose("#22c55e", "#24c760")).toBe(true);
  });

  it("passes a pair anyone can tell apart", () => {
    expect(tooClose("#22c55e", "#1e3a8a")).toBe(false);
  });

  it("does not flag the pairs we suggest ourselves", () => {
    // Found by looking rather than by testing: the first version measured
    // contrast alone, so a suggestion sitting at the same lightness as the
    // primary — which all of them do — tripped our own warning the moment it
    // was offered.
    for (const primary of ["#22c55e", "#facc15", "#7c3aed", "#0891b2"]) {
      for (const secondary of suggestSecondary(primary)) {
        expect(tooClose(primary, secondary), `${primary} vs ${secondary}`).toBe(false);
      }
    }
  });

  it("still flags a colour beside a slightly different shade of itself", () => {
    expect(tooClose("#facc15", "#f7c91a")).toBe(true);
  });
});
