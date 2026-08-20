import { readFileSync } from "fs";
import { join } from "path";

import { describe, expect, it } from "vitest";

/**
 * Заданная ширина поля не должна спорить с общей.
 *
 * `inputCls` начинается с `w-full`. Место вызова, которое пишет
 * `w-32 ${inputCls}`, получает два правила ширины сразу, и побеждает не то,
 * что имел в виду автор: поле занимает всю строку (506 px вместо 128), а
 * сосед с `flex-1` при базисе 0% сжимается до 26 px.
 *
 * Так пропали подсказка кроссворда и текст реплики диалога: набранное в них
 * сохранялось, но прочитать его было нельзя.
 */

const FILE = join(__dirname, "exercise-config-editors.tsx");
const SOURCE = readFileSync(FILE, "utf-8");

/** Строки вида `w-32 ${inputCls}` или `flex-1 ${inputCls}` — с их номерами. */
function conflicting(source: string): string[] {
  return source
    .split("\n")
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => /(?:\bw-\[?[0-9]|\bflex-1\b)[^"`]*\$\{inputCls\}/.test(line))
    .map(({ line, n }) => `${n}: ${line.trim().slice(0, 90)}`);
}

describe("ширина полей настройки", () => {
  it("никто не задаёт ширину поверх inputCls", () => {
    expect(conflicting(SOURCE)).toEqual([]);
  });

  it("есть класс без ширины, чтобы её можно было задать на месте", () => {
    expect(SOURCE).toMatch(/const inputBase\s*=/);
  });

  it("inputCls остаётся полем во всю ширину", () => {
    expect(SOURCE).toMatch(/const inputCls\s*=\s*`w-full \$\{inputBase\}`/);
  });
});
