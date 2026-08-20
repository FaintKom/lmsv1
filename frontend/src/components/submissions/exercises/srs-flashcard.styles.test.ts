import { readFileSync } from "fs";
import { join } from "path";

import { describe, expect, it } from "vitest";

/**
 * Каждое имя класса, которое ставит флешкарта, должно иметь правило.
 *
 * Виджет приехал в этот репозиторий без своей таблицы стилей (коммит
 * 8c1e826 добавил только .tsx). Ученик из-за этого видел не карточку, а
 * столбик текста и слипшуюся строку «Again1dHard1dGood2dEasy4d».
 *
 * Проверка статическая нарочно: она ловит и обратный случай — когда
 * кто-нибудь переименует класс в разметке и забудет правило.
 */

const DIR = __dirname;
const TSX = readFileSync(join(DIR, "srs-flashcard.tsx"), "utf-8");

/** Классы, которые компонент ставит на свои элементы, кроме утилит Tailwind. */
function ownClasses(source: string): string[] {
  const found = new Set<string>();
  // className="..." и className={`...`} — оба вида в этом файле есть.
  for (const m of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const literal = (m[1] ?? m[2] ?? "").replace(/\$\{[^}]*\}/g, " ");
    for (const cls of literal.split(/\s+/).filter(Boolean)) {
      if (cls.startsWith("gl-")) found.add(cls);
    }
  }
  return [...found].sort();
}

/**
 * Имена, которые компонент ставит вложенным элементам. Они короткие и
 * встречаются внутри своего блока, поэтому перечислены здесь явно: список —
 * это и есть договор между разметкой и таблицей стилей.
 */
const INNER = ["is-flipped", "back", "term", "hint", "definition", "fill", "again", "hard", "good", "easy"];

describe("флешкарта: у каждого класса есть правило", () => {
  const css = readFileSync(join(DIR, "srs-flashcard.css"), "utf-8");

  it("компонент подключает свою таблицу стилей", () => {
    expect(TSX).toContain('import "./srs-flashcard.css"');
  });

  it.each(ownClasses(TSX))("%s объявлен", (cls) => {
    expect(css).toContain(`.${cls}`);
  });

  it.each(INNER)("вложенный .%s объявлен", (cls) => {
    expect(css).toContain(`.${cls}`);
  });

  it("переворот отключается при «уменьшить движение»", () => {
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it("цвета берутся из токенов, а не из чисел", () => {
    // Шестнадцатеричных цветов быть не должно: палитра живёт в globals.css.
    const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hex).toEqual([]);
  });
});
