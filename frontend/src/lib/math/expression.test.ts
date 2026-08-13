import { describe, expect, it } from "vitest";

import { ExpressionError, compileExpression, parseExpression } from "@/lib/math/expression";

const at = (src: string, x: number) => compileExpression(src)(x);

describe("expression parser", () => {
  it("applies the usual precedence", () => {
    expect(at("2+3*4", 0)).toBe(14);
    expect(at("(2+3)*4", 0)).toBe(20);
    expect(at("10-2-3", 0)).toBe(5); // left-associative, not 11
    expect(at("12/3/2", 0)).toBe(2);
  });

  it("treats ^ as right-associative", () => {
    // The classic trap: 2^(3^2) = 512, not (2^3)^2 = 64.
    expect(at("2^3^2", 0)).toBe(512);
  });

  it("binds unary minus below ^ and above *", () => {
    expect(at("-2^2", 0)).toBe(-4); // -(2^2)
    expect(at("(-2)^2", 0)).toBe(4);
    expect(at("-x*3", 2)).toBe(-6);
  });

  it("accepts a signed exponent", () => {
    expect(at("x^-2", 2)).toBe(0.25);
  });

  it("reads implicit multiplication the way a teacher writes it", () => {
    expect(at("2x", 5)).toBe(10);
    expect(at("3(x+1)", 2)).toBe(9);
    expect(at("2sin(0)", 0)).toBe(0);
    expect(at("(x+1)(x-1)", 3)).toBe(8);
  });

  it("knows the constants", () => {
    expect(at("pi", 0)).toBeCloseTo(Math.PI);
    expect(at("e", 0)).toBeCloseTo(Math.E);
    expect(at("2pi", 0)).toBeCloseTo(2 * Math.PI);
  });

  it("evaluates the functions it advertises", () => {
    expect(at("sin(0)", 0)).toBe(0);
    expect(at("cos(0)", 0)).toBe(1);
    expect(at("sqrt(9)", 0)).toBe(3);
    expect(at("abs(-4)", 0)).toBe(4);
    expect(at("ln(e)", 0)).toBeCloseTo(1);
    expect(at("log(100)", 0)).toBeCloseTo(2);
  });

  it("is case-insensitive about names", () => {
    expect(at("SIN(0)", 0)).toBe(0);
    expect(at("X+1", 4)).toBe(5);
  });

  it("accepts decimals with and without a leading digit", () => {
    expect(at("0.5x", 4)).toBe(2);
    expect(at(".5x", 4)).toBe(2);
  });

  // The NaN cases are the point of the whole file: a plot has to break the
  // curve where the function is undefined instead of joining across the gap.
  it("returns NaN where the function is undefined", () => {
    expect(at("1/x", 0)).toBeNaN();
    expect(at("sqrt(x)", -1)).toBeNaN();
    expect(at("ln(x)", -1)).toBeNaN();
    expect(at("ln(x)", 0)).toBe(-Infinity); // Math.log(0), not undefined
  });

  it("never divides to Infinity", () => {
    // Infinity would be drawn as a line shooting off the top of the plot;
    // NaN leaves a gap, which is what an asymptote looks like.
    expect(at("1/(x-2)", 2)).toBeNaN();
    expect(Number.isFinite(at("1/(x-2)", 2.0001))).toBe(true);
  });

  it("rejects what it cannot read, with a reason", () => {
    expect(() => parseExpression("2 +")).toThrow(ExpressionError);
    expect(() => parseExpression("(2+3")).toThrow(/Missing/);
    expect(() => parseExpression("sin x")).toThrow(/brackets/);
    expect(() => parseExpression("y+1")).toThrow(/Unknown name "y"/);
    expect(() => parseExpression("2 $ 3")).toThrow(/Unexpected character/);
  });

  it("refuses to be a script engine", () => {
    // The whole reason this parser exists instead of `new Function`.
    expect(() => parseExpression("alert(1)")).toThrow(ExpressionError);
    expect(() => parseExpression("globalThis")).toThrow(ExpressionError);
    expect(() => parseExpression("x.constructor")).toThrow(ExpressionError);
  });

  it("parses to a reusable tree", () => {
    const ast = parseExpression("x^2");
    expect(ast).toEqual({
      kind: "bin",
      op: "^",
      left: { kind: "var" },
      right: { kind: "num", value: 2 },
    });
  });
});
