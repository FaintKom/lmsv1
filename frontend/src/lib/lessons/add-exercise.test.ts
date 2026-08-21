import { describe, expect, it, vi } from "vitest";

import { addExerciseToPage, newExercisePayload } from "./add-exercise";

/**
 * Создание задания со страницы курса.
 *
 * Сегодня задание рождается внутри редактора урока: он шлёт `POST /exercises`
 * с названием `New <Тип>` и прописывает идентификатор в блок. Страница курса
 * делает то же самое, и совпадать это должно буквально — иначе два места
 * заведут разные задания под одной кнопкой.
 *
 * Отличие одно: редактор держит урок в состоянии и сохраняет автосохранением,
 * а страница курса обязана сохранить сразу.
 */

const lesson = {
  version: 3,
  pages: [
    {
      id: "page_1",
      blocks: [{ id: "b1", type: "text", sort_order: 0, page: 1, body: "Что такое цикл" }],
    },
    {
      id: "page_2",
      blocks: [{ id: "b2", type: "exercise", sort_order: 0, page: 2, exercise_id: "e1" }],
    },
  ],
};

describe("тело нового задания", () => {
  it("повторяет то, что шлёт редактор урока", () => {
    expect(newExercisePayload("fill_blanks", "l1")).toEqual({
      lesson_id: "l1",
      exercise_type: "fill_blanks",
      title: "New Fill Blanks",
      config: {},
    });
  });

  it("у незнакомого типа названием становится он сам, а не пустота", () => {
    expect(newExercisePayload("brand_new_type", "l1").title).toBe("New brand_new_type");
  });
});

describe("куда встаёт новый блок", () => {
  const api = () => ({
    post: vi.fn().mockResolvedValue({ data: { id: "e9" } }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  });

  const where = { lessonId: "l1", courseId: "c1", moduleId: "m1" };

  it("встаёт последним на своей странице, а не в конце урока", async () => {
    const client = api();
    await addExerciseToPage({
      client: client as never,
      where,
      content: lesson,
      pageIndex: 0,
      exerciseType: "quiz",
    });

    const saved = client.put.mock.calls[0][1] as { content: { pages: { blocks: unknown[] }[] } };
    expect(saved.content.pages[0].blocks).toHaveLength(2);
    expect(saved.content.pages[1].blocks).toHaveLength(1);
    expect(saved.content.pages[0].blocks[1]).toMatchObject({
      type: "exercise",
      exercise_id: "e9",
    });
  });

  it("сохраняется по адресу урока внутри его модуля", async () => {
    const client = api();
    await addExerciseToPage({
      client: client as never,
      where,
      content: lesson,
      pageIndex: 1,
      exerciseType: "quiz",
    });

    expect(client.put.mock.calls[0][0]).toBe("/courses/c1/modules/m1/lessons/l1/");
  });

  it("остальные блоки и их порядок не трогаются", async () => {
    const client = api();
    await addExerciseToPage({
      client: client as never,
      where,
      content: lesson,
      pageIndex: 1,
      exerciseType: "quiz",
    });

    const saved = client.put.mock.calls[0][1] as {
      content: { version: number; pages: { blocks: { id: string }[] }[] };
    };
    expect(saved.content.version).toBe(3);
    expect(saved.content.pages[0].blocks.map((b) => b.id)).toEqual(["b1"]);
    expect(saved.content.pages[1].blocks[0].id).toBe("b2");
  });

  it("возвращает созданное задание, чтобы список показал ссылку на него", async () => {
    const client = api();
    const created = await addExerciseToPage({
      client: client as never,
      where,
      content: lesson,
      pageIndex: 0,
      exerciseType: "quiz",
    });

    expect(created.exerciseId).toBe("e9");
    expect(client.post.mock.calls[0][0]).toBe("/exercises");
  });

  it("если урок не сохранился, отказ виден вызвавшему", async () => {
    const client = api();
    client.put.mockRejectedValue(new Error("no"));

    await expect(
      addExerciseToPage({
        client: client as never,
        where,
        content: lesson,
        pageIndex: 0,
        exerciseType: "quiz",
      }),
    ).rejects.toThrow();
  });
});
