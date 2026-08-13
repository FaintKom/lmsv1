import { describe, expect, it } from "vitest";

import { compileExpression } from "@/lib/math/expression";
import { sampleFunction, toSvgPoints } from "@/lib/math/plot";

const WINDOW = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

describe("sampleFunction", () => {
  it("returns one segment for a continuous curve", () => {
    const segments = sampleFunction(compileExpression("x/2"), WINDOW);
    expect(segments).toHaveLength(1);
    expect(segments[0].length).toBeGreaterThan(100);
  });

  it("samples the endpoints exactly", () => {
    const [seg] = sampleFunction((x) => x, { ...WINDOW, samples: 5 });
    expect(seg[0].x).toBeCloseTo(-10);
    expect(seg[seg.length - 1].x).toBeCloseTo(10);
  });

  // The two cases this module exists for.
  it("breaks 1/x at the pole instead of drawing through it", () => {
    const segments = sampleFunction(compileExpression("1/x"), WINDOW);
    expect(segments.length).toBe(2);
    // One branch left of zero, one right of it.
    expect(segments[0].every((p) => p.x < 0)).toBe(true);
    expect(segments[1].every((p) => p.x > 0)).toBe(true);
  });

  it("breaks tan(x) at every asymptote in view", () => {
    // Over -10..10 tan has poles near ±pi/2, ±3pi/2, ±5pi/2 — six of them,
    // so seven branches.
    const segments = sampleFunction(compileExpression("tan(x)"), WINDOW);
    expect(segments.length).toBe(7);
  });

  it("keeps a steep but continuous curve in one piece", () => {
    // x^3 leaves the window through the bottom and returns through the top,
    // but it never jumps: breaking it here would be the false positive.
    const segments = sampleFunction(compileExpression("x^3"), WINDOW);
    expect(segments).toHaveLength(1);
  });

  it("drops the parts where the function is undefined", () => {
    const segments = sampleFunction(compileExpression("sqrt(x)"), WINDOW);
    expect(segments).toHaveLength(1);
    expect(segments[0].every((p) => p.x >= 0)).toBe(true);
  });

  it("returns nothing when the function is undefined everywhere in view", () => {
    expect(sampleFunction(compileExpression("sqrt(x)"), { ...WINDOW, xMax: -1 })).toEqual([]);
  });

  it("never emits a one-point segment", () => {
    // A polyline of one point draws nothing; emitting it would just be litter.
    const segments = sampleFunction(compileExpression("1/x"), WINDOW);
    expect(segments.every((s) => s.length > 1)).toBe(true);
  });

  it("refuses a range that is not a range", () => {
    expect(sampleFunction((x) => x, { ...WINDOW, xMin: 5, xMax: 5 })).toEqual([]);
    expect(sampleFunction((x) => x, { ...WINDOW, samples: 1 })).toEqual([]);
  });
});

describe("toSvgPoints", () => {
  it("formats a segment for the points attribute", () => {
    const points = toSvgPoints(
      [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
      ],
      (x) => x * 10,
      (y) => 100 - y * 10,
    );
    expect(points).toBe("0.00,100.00 10.00,80.00");
  });
});
