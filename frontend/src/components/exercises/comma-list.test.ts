import { describe, it, expect } from "vitest";

import { parseList, parseNumberList, sameList } from "./comma-list";

/**
 * Разбор и сравнение списка через запятую.
 *
 * Разбор чистит — пустые куски и пробелы по краям в задание не попадают.
 * Сравнение отвечает на единственный вопрос, который задаёт поле: означает
 * ли набранный текст тот же список, что пришёл сверху. Пока означает — поле
 * показывает набранное и не переписывает его.
 */

describe("parseList", () => {
  it("выбрасывает пустые куски и пробелы по краям", () => {
    expect(parseList("x, , y ")).toEqual(["x", "y"]);
  });

  it("на незаконченном вводе даёт то, что уже названо", () => {
    // Та самая точка, где старое поле стирало запятую: учитель нажал её,
    // но второй элемент ещё не набрал.
    expect(parseList("x,")).toEqual(["x"]);
  });

  it("пустая строка — пустой список", () => {
    expect(parseList("")).toEqual([]);
    expect(parseList("  ,  ")).toEqual([]);
  });

  it("оставляет пробелы внутри элемента", () => {
    expect(parseList("two words, other")).toEqual(["two words", "other"]);
  });
});

describe("parseNumberList", () => {
  it("берёт числа, включая отрицательные и дробные", () => {
    expect(parseNumberList("3, -7, 2.5")).toEqual([3, -7, 2.5]);
  });

  it("незаконченное число не попадает в задание, но и не мешает", () => {
    // Учитель набрал минус — числа ещё нет. Поле обязано оставить минус
    // на экране, а в задание отдать то, что уже названо.
    expect(parseNumberList("3, -")).toEqual([3]);
    expect(parseNumberList("3, 2.")).toEqual([3, 2]);
  });

  it("пустое не превращается в ноль", () => {
    // Number("") — это 0, и без отсева пустой кусок стал бы нулём.
    expect(parseNumberList("")).toEqual([]);
    expect(parseNumberList("3, ")).toEqual([3]);
  });

  it("не-число отбрасывается", () => {
    expect(parseNumberList("3, abc, 4")).toEqual([3, 4]);
  });
});

describe("sameList", () => {
  it("равные списки равны", () => {
    expect(sameList(["x", "y"], ["x", "y"])).toBe(true);
    expect(sameList([], [])).toBe(true);
  });

  it("порядок различается", () => {
    expect(sameList(["x", "y"], ["y", "x"])).toBe(false);
  });

  it("длина различается", () => {
    expect(sameList(["x"], ["x", "y"])).toBe(false);
  });
});
