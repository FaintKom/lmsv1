/**
 * Завести задание и поставить его в урок.
 *
 * Одно место на две поверхности. Редактор урока заводит задание внутри блока,
 * страница курса — из раскрытого списка; название по умолчанию и тело запроса
 * обязаны совпасть буквально, иначе под одной кнопкой в двух местах заводятся
 * разные задания.
 *
 * Порядок сохранения общим не делается: редактор держит урок в состоянии и
 * пишет автосохранением, а страница курса обязана сохранить сразу — она к
 * уроку не возвращается.
 *
 * Сюда же придёт `specs/030`: когда задание перестанет рождаться внутри блока,
 * «создать» и «поставить в урок» разъедутся, и менять это надо будет здесь, а
 * не в двух редакторах.
 */

import { EXERCISE_TYPE_LABELS } from "@/lib/api/exercises";

import { buildPagesContent, extractPages } from "./lesson-pages";

/** Куда ставим: урок и его место в курсе — из этого собирается адрес сохранения. */
export interface LessonWhere {
  lessonId: string;
  courseId: string;
  moduleId: string;
}

/** То, чем ходят в API. Полный тип клиента не нужен — нужны два метода. */
interface ApiLike {
  post: (url: string, body: unknown) => Promise<{ data: { id: string } }>;
  put: (url: string, body: unknown) => Promise<unknown>;
}

export interface NewExercisePayload {
  lesson_id: string;
  exercise_type: string;
  title: string;
  config: Record<string, unknown>;
}

/** Тело создания — ровно то, что шлёт редактор урока. */
export function newExercisePayload(exerciseType: string, lessonId: string): NewExercisePayload {
  return {
    lesson_id: lessonId,
    exercise_type: exerciseType,
    // Незнакомый тип называет себя сам: список подписей закрытый, а тип сюда
    // приходит строкой — пустое название хуже неизвестного.
    title: `New ${(EXERCISE_TYPE_LABELS as Record<string, string>)[exerciseType] || exerciseType}`,
    config: {},
  };
}

export interface AddExerciseArgs {
  client: ApiLike;
  where: LessonWhere;
  content: Record<string, unknown> | undefined;
  /** Номер страницы урока, с нуля: задание встаёт последним именно на ней. */
  pageIndex: number;
  exerciseType: string;
}

/**
 * Создать задание и дописать его блоком в конец нужной страницы.
 *
 * `sort_order` и номер страницы здесь не вычисляются: `buildPagesContent`
 * выводит их из положения блока в массиве, поэтому достаточно положить блок
 * туда, где он должен стоять.
 */
export async function addExerciseToPage({
  client,
  where,
  content,
  pageIndex,
  exerciseType,
}: AddExerciseArgs): Promise<{ exerciseId: string }> {
  const { data } = await client.post(
    "/exercises",
    newExercisePayload(exerciseType, where.lessonId),
  );

  const pages = extractPages(content);
  const target = pages[pageIndex] ?? pages[pages.length - 1];
  target.blocks = [
    ...target.blocks,
    {
      id: blockId(),
      type: "exercise" as const,
      sort_order: target.blocks.length,
      page: pageIndex + 1,
      exercise_id: data.id,
    },
  ];

  await client.put(
    `/courses/${where.courseId}/modules/${where.moduleId}/lessons/${where.lessonId}/`,
    { content: buildPagesContent(pages) },
  );

  return { exerciseId: data.id };
}

/** Тот же вид идентификатора, что заводит редактор урока. */
function blockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
