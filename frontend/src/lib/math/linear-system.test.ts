import { describe, expect, it } from "vitest";

import { readEquation, readSystem, solveSystem } from "@/lib/math/linear-system";

const XY = ["x", "y"];

describe("readEquation", () => {
  it("reads coefficients and the constant off a standard-form equation", () => {
    expect(readEquation("2x + 3y = 12", XY)).toEqual({ coefficients: [2, 3], constant: 12 });
  });

  it("moves variables across the equals sign", () => {
    expect(readEquation("y = 2x - 1", XY)).toEqual({ coefficients: [-2, 1], constant: -1 });
  });

  it("expands brackets, because a teacher may not", () => {
    expect(readEquation("4(x - y) = 8", XY)).toEqual({ coefficients: [4, -4], constant: 8 });
  });

  it("returns null for a non-linear equation instead of drawing a wrong line", () => {
    expect(readEquation("x^2 + y = 1", XY)).toBeNull();
    expect(readEquation("x*y = 6", XY)).toBeNull();
  });

  it("throws when the text is not an equation at all", () => {
    expect(() => readEquation("2x + 3y", XY)).toThrow();
  });
});

describe("solveSystem", () => {
  const solve = (equations: string[], variables = XY) => {
    const rows = readSystem(equations, variables);
    expect(rows).not.toBeNull();
    return solveSystem(rows!, variables);
  };

  it("solves lines that cross", () => {
    expect(solve(["x + y = 5", "x - y = 1"])).toEqual({ kind: "unique", values: { x: 3, y: 2 } });
  });

  it("reports parallel lines as having no solution", () => {
    expect(solve(["x + y = 1", "2x + 2y = 5"])).toEqual({ kind: "none" });
  });

  it("reports one line written twice as having infinitely many", () => {
    expect(solve(["x + y = 1", "3x + 3y = 3"])).toEqual({ kind: "infinite" });
  });

  it("solves three variables", () => {
    const xyz = ["x", "y", "z"];
    expect(solve(["x + y + z = 6", "x - y = -1", "z - y = 1"], xyz)).toEqual({
      kind: "unique",
      values: { x: 1, y: 2, z: 3 },
    });
  });

  it("treats an under-determined system as infinitely many, not as a solution", () => {
    expect(solve(["x + y = 4"])).toEqual({ kind: "infinite" });
  });

  it("never returns -0, which would render as a different number", () => {
    const solution = solve(["x + y = 0", "x - y = 0"]);
    expect(Object.is(solution.values!.x, -0)).toBe(false);
    expect(Object.is(solution.values!.y, -0)).toBe(false);
  });
});
