import { describe, expect, it } from "vitest";

import { computeSolid, dimensionsFor, placesFor, roundTo } from "@/lib/math/solids";

/**
 * These are the same numbers as `backend/tests/test_stereometry.py`, on
 * purpose. Two copies of the formulas only stay honest if they are checked
 * against the same cases — if one drifts, one of the two suites turns red
 * rather than a student being marked against a number no editor ever showed.
 */
describe("computeSolid", () => {
  it("matches the server on volume", () => {
    expect(computeSolid("box", { a: 2, b: 3, c: 4 }, "volume")).toBe(24);
    expect(computeSolid("pyramid", { a: 3, h: 4 }, "volume")).toBeCloseTo(12, 10);
    expect(computeSolid("cylinder", { r: 2, h: 5 }, "volume")).toBeCloseTo(20 * Math.PI, 10);
    expect(computeSolid("cone", { r: 3, h: 4 }, "volume")).toBeCloseTo(12 * Math.PI, 10);
    expect(computeSolid("sphere", { r: 3 }, "volume")).toBeCloseTo(36 * Math.PI, 10);
  });

  it("takes a pyramid's slant height to the base edge, not to a corner", () => {
    // a = 6, h = 4 gives an apothem of 5. To a corner it would be about 5.83.
    expect(computeSolid("pyramid", { a: 6, h: 4 }, "lateral_area")).toBeCloseTo(60, 10);
    expect(computeSolid("pyramid", { a: 6, h: 4 }, "surface_area")).toBeCloseTo(96, 10);
  });

  it("uses a cone's slant height, not its height", () => {
    // r = 3, h = 4 gives slant 5, so 15pi rather than 12pi.
    expect(computeSolid("cone", { r: 3, h: 4 }, "lateral_area")).toBeCloseTo(15 * Math.PI, 10);
    expect(computeSolid("cone", { r: 3, h: 4 }, "surface_area")).toBeCloseTo(24 * Math.PI, 10);
  });

  it("separates a box's lateral area from its surface by the two bases", () => {
    const d = { a: 2, b: 3, c: 4 };
    expect(computeSolid("box", d, "lateral_area")).toBe(40);
    expect(computeSolid("box", d, "surface_area")).toBe(40 + 12);
  });

  it("gives a sphere the same lateral and surface area", () => {
    expect(computeSolid("sphere", { r: 2 }, "lateral_area")).toBe(
      computeSolid("sphere", { r: 2 }, "surface_area"),
    );
  });

  it("reads a measurement typed as text, because an input gives strings", () => {
    expect(computeSolid("box", { a: "2", b: "3", c: "4" }, "volume")).toBe(24);
  });

  it("returns null rather than throwing on anything unusable", () => {
    expect(computeSolid("torus", { r: 1 }, "volume")).toBeNull();
    expect(computeSolid("box", { a: 1, b: 1, c: 1 }, "diagonal")).toBeNull();
    expect(computeSolid("box", { a: 1, b: 2 }, "volume")).toBeNull();
    expect(computeSolid("sphere", { r: 0 }, "volume")).toBeNull();
    expect(computeSolid("cylinder", { r: 2, h: -1 }, "volume")).toBeNull();
    // Half-typed input, which the editor sees on most keystrokes.
    expect(computeSolid("sphere", { r: "" }, "volume")).toBeNull();
    expect(computeSolid("sphere", { r: "-" }, "volume")).toBeNull();
  });

  it("lists what each solid needs", () => {
    expect(dimensionsFor("cone")).toEqual(["r", "h"]);
    expect(dimensionsFor("box")).toEqual(["a", "b", "c"]);
  });
});

describe("rounding", () => {
  it("defaults to two places and clamps to what a person would ask for", () => {
    expect(placesFor(undefined)).toBe(2);
    expect(placesFor(1.5)).toBe(2);
    expect(placesFor(0)).toBe(0);
    expect(placesFor(9)).toBe(6);
    expect(placesFor(-1)).toBe(0);
  });

  it("rounds the way the answer is asked for", () => {
    expect(roundTo(12 * Math.PI, 2)).toBe(37.7);
    expect(roundTo(12 * Math.PI, 0)).toBe(38);
  });
});
