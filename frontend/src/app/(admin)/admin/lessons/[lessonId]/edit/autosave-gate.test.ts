import { describe, expect, it } from "vitest";

import { lessonSnapshot, shouldAutosave, type LessonDraft } from "./autosave-gate";

/**
 * Загрузка урока сама пишет title, duration и pages. Раньше автосохранение
 * принимало это за правку и слало PUT через 1,2 с после открытия (specs/096).
 */

const loaded: LessonDraft = {
  title: "Дроби",
  duration: "15",
  pages: [{ id: "p1", blocks: [{ id: "b1", type: "text", content: "<p>a</p>" }] }],
};

describe("автосохранение редактора урока", () => {
  it("состояние, записанное загрузкой, не сохраняется", () => {
    const baseline = lessonSnapshot(loaded);
    // React отдаёт эффекту те же значения новыми объектами.
    expect(shouldAutosave(baseline, structuredClone(loaded))).toBe(false);
  });

  it("правка заголовка, длительности или блока сохраняется", () => {
    const baseline = lessonSnapshot(loaded);
    expect(shouldAutosave(baseline, { ...loaded, title: "Дроби 2" })).toBe(true);
    expect(shouldAutosave(baseline, { ...loaded, duration: "20" })).toBe(true);
    const edited = structuredClone(loaded);
    edited.pages[0].blocks[0].content = "<p>b</p>";
    expect(shouldAutosave(baseline, edited)).toBe(true);
  });

  it("без снимка (загрузка не удалась) сохранения нет", () => {
    expect(shouldAutosave(null, { ...loaded, title: "x" })).toBe(false);
  });
});
