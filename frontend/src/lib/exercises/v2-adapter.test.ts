import { describe, expect, it } from "vitest";

import { countBlanks, toBlankMarkers, toBubbleQuestions } from "./v2-adapter";

/**
 * Учитель отмечает пропуск подчёркиваниями, виджет ищет `{{blank}}`.
 *
 * Редактор Fill Blanks предлагает `__` и `___`, считает по ним число ответов
 * и в этом виде пишет конфиг. Виджет ученика режет текст по `{{blank}}` и в
 * такой строке не находит ни одного пропуска: предложение приезжает с
 * подчёркиваниями внутри, полей ввода нет, банк слов положить некуда.
 *
 * Значит два синтаксиса должны сойтись в одном месте — здесь.
 */

describe("отметки пропусков", () => {
  it("подчёркивания редактора становятся отметками виджета", () => {
    expect(toBlankMarkers("Python is a __ language with __ blocks.")).toBe(
      "Python is a {{blank}} language with {{blank}} blocks.",
    );
  });

  it("три подчёркивания — тот же пропуск, редактор принимает оба вида", () => {
    expect(toBlankMarkers("a ___ b")).toBe("a {{blank}} b");
  });

  it("готовые отметки остаются как есть", () => {
    expect(toBlankMarkers("a {{blank}} b")).toBe("a {{blank}} b");
  });

  it("одиночное подчёркивание — часть слова, а не пропуск", () => {
    // `snake_case` в задании по программированию не должен стать дырой.
    expect(toBlankMarkers("call user_name here")).toBe("call user_name here");
  });

  it("пропуски считаются одинаково в обоих написаниях", () => {
    expect(countBlanks("a __ b ___ c")).toBe(2);
    expect(countBlanks("a {{blank}} b")).toBe(1);
    expect(countBlanks("")).toBe(0);
    expect(countBlanks(undefined)).toBe(0);
  });
});

/**
 * Обход авторства 2026-08-20, находка 2: набранный вопрос не доходил.
 *
 * Редактор пишет `question_text` — так это поле зовётся и в базе, и в
 * остальном интерфейсе. Переходник читал `question`, поэтому ученик видел
 * номер строки и кружки A–D, а текст оставался в конфиге.
 */
describe("bubble sheet: разбор вопросов", () => {
  it("текст вопроса берётся тем именем, которым его пишет редактор", () => {
    const cfg = {
      questions: [{ number: 1, question_text: "Which planet is closest to the Sun?", correct: "B" }],
    };
    expect(toBubbleQuestions(cfg)[0]).toMatchObject({
      n: 1,
      q: "Which planet is closest to the Sun?",
      correct: 1,
    });
  });

  it("старое имя поля тоже понимается — на нём есть уже заведённые задания", () => {
    const cfg = { questions: [{ question: "Older content", correct: "A" }] };
    expect(toBubbleQuestions(cfg)[0]).toMatchObject({ n: 1, q: "Older content", correct: 0 });
  });

  it("без своих вариантов подставляются буквы по числу колонок", () => {
    const cfg = { num_options: 3, questions: [{ correct: "C" }] };
    expect(toBubbleQuestions(cfg)[0].opts).toEqual(["A", "B", "C"]);
  });

  it("без ключа ответа вопрос остаётся непроверяемым, а не «верно A»", () => {
    expect(toBubbleQuestions({ questions: [{ correct: "" }] })[0].correct).toBeUndefined();
  });
});
