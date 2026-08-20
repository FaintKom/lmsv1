import { describe, expect, it } from "vitest";

import { equationOf } from "./math-problem";

/**
 * Обход авторства 2026-08-20, находка 12: пример из плейсхолдера не
 * принимался генератором шагов. Поле показывало `Solve for x: x^2 - 5x + 6 = 0`,
 * а SymPy получал эту строку целиком и отвечал отказом без объяснения.
 */

describe("уравнение внутри условия", () => {
  it("вступление отбрасывается", () => {
    expect(equationOf("Solve for x: x^2 - 5x + 6 = 0")).toBe("x^2 - 5x + 6 = 0");
  });

  it("голое уравнение не трогается", () => {
    expect(equationOf("x^2 - 5x + 6 = 0")).toBe("x^2 - 5x + 6 = 0");
  });

  it("двоеточие без уравнения после него — часть условия", () => {
    // «Ratio 3:4» разрезать нельзя: уравнения в хвосте нет.
    expect(equationOf("Simplify the ratio 3:4")).toBe("Simplify the ratio 3:4");
  });

  it("лишние пробелы по краям убираются", () => {
    expect(equationOf("  2x + 1 = 7  ")).toBe("2x + 1 = 7");
  });
});
