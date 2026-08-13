import { describe, expect, it } from "vitest";

import { renderPlotSvg, type MathPlotAttrs } from "./math-plot";

const WINDOW: MathPlotAttrs = { expr: "x^2", xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

const countPolylines = (svg: string) => (svg.match(/<polyline/g) || []).length;

describe("renderPlotSvg", () => {
  it("draws a continuous curve as a single polyline", () => {
    const { svg, error } = renderPlotSvg(WINDOW);
    expect(error).toBeNull();
    expect(countPolylines(svg)).toBe(1);
  });

  it("draws one polyline per branch at an asymptote", () => {
    expect(countPolylines(renderPlotSvg({ ...WINDOW, expr: "1/x" }).svg)).toBe(2);
    expect(countPolylines(renderPlotSvg({ ...WINDOW, expr: "tan(x)" }).svg)).toBe(7);
  });

  it("plots several expressions in different colours", () => {
    const { svg } = renderPlotSvg({ ...WINDOW, expr: "x ; x^2 ; sin(x)" });
    expect(svg).toContain("var(--viz-1)");
    expect(svg).toContain("var(--viz-2)");
    expect(svg).toContain("var(--viz-3)");
  });

  it("uses theme tokens, never raw scale values", () => {
    // The grid elsewhere in the app used --ink-100, which stays light in dark
    // mode. Any raw ramp value here would repeat that bug.
    const { svg } = renderPlotSvg(WINDOW);
    expect(svg).toContain("var(--color-border)");
    expect(svg).not.toMatch(/var\(--(ink|green|sun|clay)-/);
  });

  it("clips the curve to the plot area", () => {
    const { svg } = renderPlotSvg({ ...WINDOW, expr: "x^3" });
    expect(svg).toContain("clip-path=");
  });

  it("explains a bad expression instead of drawing nothing", () => {
    const { svg, error } = renderPlotSvg({ ...WINDOW, expr: "y+1" });
    expect(svg).toBe("");
    expect(error).toMatch(/Unknown name "y"/);
  });

  it("rejects an inside-out range", () => {
    expect(renderPlotSvg({ ...WINDOW, xMin: 10, xMax: -10 }).error).toMatch(/smaller number/);
    expect(renderPlotSvg({ ...WINDOW, yMin: 5, yMax: 5 }).error).toMatch(/smaller number/);
  });

  it("keeps teacher text out of the markup", () => {
    // The expression lands in an aria-label, and it is whatever was typed.
    const { error } = renderPlotSvg({ ...WINDOW, expr: '"><script>alert(1)</script>' });
    // It does not parse, so it never reaches the SVG — the escaping in
    // renderPlotSvg is the second line of defence behind that.
    expect(error).not.toBeNull();
    expect(renderPlotSvg(WINDOW).svg).not.toContain("<script");
  });
});
