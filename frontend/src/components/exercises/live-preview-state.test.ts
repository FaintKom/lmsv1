import { describe, expect, it } from "vitest";

import { livePreviewState } from "./live-preview-state";

/**
 * What the live preview should put on screen while a teacher fills a form in.
 *
 * The decision is separated from the drawing because the drawing is a real
 * student widget — twenty-six of them — and the only honest way to check
 * those is a browser. What can be checked here is the choice: show the
 * widget, or say what is still missing, and never a blank rectangle.
 */

describe("livePreviewState", () => {
  it("says the exercise is empty when nothing is configured", () => {
    expect(livePreviewState("matching", {})).toEqual({ kind: "empty" });
    expect(livePreviewState("matching", undefined)).toEqual({ kind: "empty" });
  });

  it("names the thing that is missing rather than drawing nothing", () => {
    // A matching task with no pairs renders an empty board — and, per
    // specs/019, marks everyone correct. The preview says so instead.
    expect(livePreviewState("matching", { pairs: [] })).toEqual({
      kind: "missing",
      field: "pairs",
    });
    expect(livePreviewState("crossword", { words: [], grid_size: 10 })).toEqual({
      kind: "missing",
      field: "words",
    });
  });

  it("takes the name of the missing thing from the map the grader uses", () => {
    // Same source as the editor's empty-answer-key warning, so the two can
    // never disagree about what a type is graded from.
    expect(livePreviewState("fill_blanks", { text: "a {{blank}} b", blanks: [] })).toEqual({
      kind: "missing",
      field: "blanks",
    });
  });

  it("shows the widget once there is something to show", () => {
    expect(livePreviewState("matching", { pairs: [{ left: "a", right: "b" }] })).toEqual({
      kind: "widget",
      heavy: false,
    });
  });

  it("marks the heavy types so the form does not mount a scene it never opened", () => {
    for (const type of ["robot_2d", "world_3d", "math_interactive"]) {
      expect(livePreviewState(type, { anything: true })).toMatchObject({
        kind: "widget",
        heavy: true,
      });
    }
  });

  it("counts a quiz by its questions, which do not live in the config", () => {
    expect(livePreviewState("quiz", { passing_score: 70 }, { questions: 0 })).toEqual({
      kind: "missing",
      field: "questions",
    });
    expect(livePreviewState("quiz", { passing_score: 70 }, { questions: 2 })).toEqual({
      kind: "widget",
      heavy: false,
    });
  });

  it("counts a code challenge by its test cases, likewise", () => {
    expect(livePreviewState("code_challenge", { language: "python" }, { testCases: 0 })).toEqual({
      kind: "missing",
      field: "test_cases",
    });
    expect(
      livePreviewState("code_challenge", { language: "python" }, { testCases: 1 }),
    ).toMatchObject({ kind: "widget", heavy: true });
  });

  it("names what a SCORM package is missing rather than framing an empty iframe", () => {
    expect(livePreviewState("scorm_package", { launch_url: "" })).toEqual({
      kind: "missing",
      field: "launch_url",
    });
  });

  // Обход авторства 2026-08-20, находка 9: превью считало задание готовым,
  // если массив просто существует. Пустые строки внутри — это не задание.

  it("пункт без текста — ещё не задание", () => {
    expect(livePreviewState("ordering", { correct_order: ["", ""] })).toEqual({
      kind: "missing",
      field: "correct_order",
    });
    expect(livePreviewState("ordering", { correct_order: ["Boil the water", ""] })).toMatchObject({
      kind: "widget",
    });
  });

  it("вопрос без текста и варианты без текста — ещё не задание", () => {
    const blank = { questions: [{ text: "", options: [{ text: "" }, { text: "" }] }] };
    expect(livePreviewState("reading", { passage: "...", ...blank })).toEqual({
      kind: "missing",
      field: "questions",
    });
  });

  it("реплика без слов — ещё не диалог", () => {
    expect(livePreviewState("dialogue", { messages: [{ speaker: "", text: "" }] })).toEqual({
      kind: "missing",
      field: "messages",
    });
  });

  it("принимаемый ответ из пустой строки не считается ответом", () => {
    expect(livePreviewState("translation", { text: "Hello", accepted_answers: [""] })).toEqual({
      kind: "missing",
      field: "accepted_answers",
    });
  });

  it("утверждение — это содержимое true/false, а не ключ ответа", () => {
    // Ключ (`correct_answer`) стоит по умолчанию, поэтому раньше превью
    // рисовало готовый вопрос с пустыми кавычками.
    expect(livePreviewState("true_false", { statement: "", correct_answer: true })).toEqual({
      kind: "missing",
      field: "statement",
    });
    expect(
      livePreviewState("true_false", {
        statement: "The Pacific is the largest ocean.",
        correct_answer: true,
      }),
    ).toMatchObject({ kind: "widget" });
  });

  it("система уравнений без уравнений — ещё не задание", () => {
    expect(livePreviewState("math_system", { variables: ["x", "y"], equations: ["", ""] })).toEqual({
      kind: "missing",
      field: "equations",
    });
  });

  it("точки без карты — задание, в котором нечего искать", () => {
    const pins = [{ x: 50, y: 50, label: "The door", tolerance: 8 }];
    expect(livePreviewState("map_pin_drop", { pins, image_url: "" })).toEqual({
      kind: "missing",
      field: "image_url",
    });
    expect(livePreviewState("map_pin_drop", { pins, image_url: "/plan.png" })).toMatchObject({
      kind: "widget",
    });
  });

  it("тело без размеров — превью называет размеры, а не тело", () => {
    // Находка 7: виджет в этом случае писал «This task has no solid set yet»,
    // хотя тело выбрано.
    expect(livePreviewState("stereometry", { solid: "box", quantity: "volume" })).toEqual({
      kind: "missing",
      field: "dimensions",
    });
    expect(
      livePreviewState("stereometry", {
        solid: "box",
        quantity: "volume",
        dimensions: { a: 3, b: 4, c: 5 },
      }),
    ).toMatchObject({ kind: "widget" });
  });

  it("веб-редактор тянет Monaco, поэтому разворачивается по требованию", () => {
    expect(
      livePreviewState("web_editor", { instructions: "Build a card", starter_html: "" }),
    ).toMatchObject({ kind: "widget", heavy: true });
  });
});
