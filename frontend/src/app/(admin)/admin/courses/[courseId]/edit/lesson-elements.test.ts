import { describe, expect, it } from "vitest";

import { elementHref, lessonElements, resolveName, withDetached } from "./lesson-elements";

/**
 * Состав урока для строки на странице курса.
 *
 * Сводка под названием урока говорит «Text: 1, Exercises: 3» — сколько, но не
 * какие. Здесь из того же содержимого собирается список: страницы, элементы в
 * порядке урока и имя у каждого. Своего имени у блока нет, поэтому у текста и
 * видео оно выводится, а у задания и работы приходит запросом.
 */

const v3 = (pages: { blocks: unknown[] }[]) => ({
  version: 3,
  pages: pages.map((p, i) => ({ id: `page_${i + 1}`, blocks: p.blocks })),
});

const text = (id: string, body: string, sort = 0) => ({
  id,
  type: "text",
  sort_order: sort,
  page: 1,
  body,
});

describe("страницы и порядок", () => {
  it("две страницы остаются двумя, элементы идут по sort_order", () => {
    const content = v3([
      { blocks: [text("b2", "Второй", 1), text("b1", "Первый", 0)] },
      { blocks: [text("b3", "Третий", 0)] },
    ]);

    const pages = lessonElements(content);

    expect(pages).toHaveLength(2);
    expect(pages[0].elements.map((e) => e.blockId)).toEqual(["b1", "b2"]);
    expect(pages[1].elements.map((e) => e.blockId)).toEqual(["b3"]);
    expect(pages[0].index).toBe(0);
  });

  it("урок старого образца даёт одну страницу", () => {
    // extractPages не переносит блоки v1/v2 — он отдаёт одну пустую страницу,
    // ровно то же видит редактор урока.
    const pages = lessonElements({ content_type: "text", body: "старое" });
    expect(pages).toHaveLength(1);
    expect(pages[0].elements).toEqual([]);
  });

  it("пустое содержимое даёт одну страницу без элементов", () => {
    expect(lessonElements(undefined)).toEqual([{ index: 0, elements: [] }]);
  });
});

describe("имя элемента", () => {
  const nameOf = (block: Record<string, unknown>) =>
    lessonElements(v3([{ blocks: [block] }]))[0].elements[0].name;

  it("текст берёт первые слова без разметки", () => {
    expect(nameOf(text("b1", "<p>Цикл повторяет работу</p>"))).toEqual({
      kind: "derived",
      text: "Цикл повторяет работу",
    });
  });

  it("длинный текст обрезается по границе слова", () => {
    const long = "Цикл повторяет работу до тех пор, пока условие остаётся истинным, и это важно";
    const name = nameOf(text("b1", long));
    expect(name.kind).toBe("derived");
    expect(name.text!.length).toBeLessThanOrEqual(61);
    expect(name.text!.endsWith("…")).toBe(true);
    expect(name.text).not.toMatch(/\s…$/);
  });

  it("пустой текст называет себя ключом, а не пустотой", () => {
    expect(nameOf(text("b1", "   "))).toEqual({
      kind: "derived",
      key: "admin.courseEdit.elementEmptyText",
    });
  });

  it("видео берёт последнюю часть ссылки без расширения", () => {
    expect(
      nameOf({ id: "b1", type: "video", sort_order: 0, page: 1, url: "/media/intro-loops.mp4" }),
    ).toEqual({ kind: "derived", text: "intro-loops" });
  });

  it("видео без ссылки называет себя ключом", () => {
    expect(nameOf({ id: "b1", type: "video", sort_order: 0, page: 1 })).toEqual({
      kind: "derived",
      key: "admin.courseEdit.elementNoUrl",
    });
  });

  it("задание и работа ждут ответа, а не выдумывают имя", () => {
    expect(
      nameOf({ id: "b1", type: "exercise", sort_order: 0, page: 1, exercise_id: "e1" }),
    ).toEqual({ kind: "pending" });
    expect(
      nameOf({ id: "b2", type: "assignment", sort_order: 0, page: 1, assignment_id: "a1" }),
    ).toEqual({ kind: "pending" });
  });
});

/**
 * Задание может быть привязано к уроку полем `lesson_id` и не быть показано
 * ни одним блоком. Ученик его всё равно видит — плеер дорисовывает такие в
 * конце урока, — а список по одним блокам показывал бы пустой урок.
 *
 * Найдено проверкой в браузере на QA-стенде: у урока 26 привязанных заданий
 * и ни одного блока.
 */
describe("задания, привязанные к уроку помимо блоков", () => {
  it("дорисовываются в конец последней страницы", () => {
    const pages = lessonElements(v3([{ blocks: [text("b1", "Первый")] }]));
    const full = withDetached(pages, ["e1", "e2"]);

    expect(full[0].elements.map((e) => e.blockId)).toEqual(["b1", "adopted_e1", "adopted_e2"]);
    expect(full[0].elements[1]).toMatchObject({ type: "exercise", exerciseId: "e1" });
  });

  it("то, что уже показано блоком, не задваивается", () => {
    const pages = lessonElements(
      v3([{ blocks: [{ id: "b1", type: "exercise", sort_order: 0, page: 1, exercise_id: "e1" }] }]),
    );
    expect(withDetached(pages, ["e1"])[0].elements).toHaveLength(1);
  });

  it("у урока из двух страниц дорисовка идёт в последнюю", () => {
    const pages = lessonElements(
      v3([{ blocks: [text("b1", "Первый")] }, { blocks: [text("b2", "Второй")] }]),
    );
    const full = withDetached(pages, ["e1"]);

    expect(full[0].elements).toHaveLength(1);
    expect(full[1].elements.map((e) => e.blockId)).toEqual(["b2", "adopted_e1"]);
  });

  it("без привязанных заданий список не меняется", () => {
    const pages = lessonElements(v3([{ blocks: [text("b1", "Первый")] }]));
    expect(withDetached(pages, [])).toEqual(pages);
  });
});

describe("куда ведёт элемент", () => {
  const where = { lessonId: "l1", courseId: "c1", moduleId: "m1" };
  const first = (block: Record<string, unknown>) =>
    lessonElements(v3([{ blocks: [block] }]))[0].elements[0];

  it("задание открывается на своей странице", () => {
    const element = first({ id: "b1", type: "exercise", sort_order: 0, page: 1, exercise_id: "e1" });
    expect(elementHref(element, where)).toBe("/admin/content-library/e1");
  });

  it("работа открывается на своей", () => {
    const element = first({
      id: "b1",
      type: "assignment",
      sort_order: 0,
      page: 1,
      assignment_id: "a1",
    });
    expect(elementHref(element, where)).toBe("/admin/assignments/a1");
  });

  it("у текста своей страницы нет — ведём в редактор урока к этому блоку", () => {
    const element = first(text("b7", "Цикл"));
    expect(elementHref(element, where)).toBe(
      "/admin/lessons/l1/edit?courseId=c1&moduleId=m1&block=b7",
    );
  });

  it("блок-задание без ссылки на задание ведёт туда же, а не в никуда", () => {
    const element = first({ id: "b9", type: "exercise", sort_order: 0, page: 1 });
    expect(elementHref(element, where)).toBe(
      "/admin/lessons/l1/edit?courseId=c1&moduleId=m1&block=b9",
    );
  });
});

describe("имя из ответа", () => {
  const exerciseBlock = {
    id: "b1",
    type: "exercise",
    sort_order: 0,
    page: 1,
    exercise_id: "e1",
  };

  it("название задания подставляется, когда пришло", () => {
    const element = lessonElements(v3([{ blocks: [exerciseBlock] }]))[0].elements[0];
    const names = { exercises: { e1: "Reading a range" }, assignments: {} };
    expect(resolveName(element, names)).toEqual({ kind: "own", text: "Reading a range" });
  });

  it("пока ответа нет — элемент остаётся ждущим", () => {
    const element = lessonElements(v3([{ blocks: [exerciseBlock] }]))[0].elements[0];
    expect(resolveName(element, null)).toEqual({ kind: "pending" });
  });

  it("ответ пришёл, а задания в нём нет — это потерянная ссылка", () => {
    const element = lessonElements(v3([{ blocks: [exerciseBlock] }]))[0].elements[0];
    const names = { exercises: {}, assignments: {} };
    expect(resolveName(element, names)).toEqual({
      kind: "missing",
      key: "admin.courseEdit.elementMissing",
    });
  });

  it("у выведенного имени ответ ничего не меняет", () => {
    const element = lessonElements(v3([{ blocks: [text("b1", "Цикл")] }]))[0].elements[0];
    expect(resolveName(element, { exercises: {}, assignments: {} })).toEqual({
      kind: "derived",
      text: "Цикл",
    });
  });
});
