import type { LessonPage } from "@/lib/lessons/lesson-pages";

export interface LessonDraft {
  title: string;
  duration: string;
  pages: LessonPage[];
}

/** Сериализованное состояние урока — то, что уходит в PUT. */
export function lessonSnapshot(draft: LessonDraft): string {
  return JSON.stringify([draft.title, draft.duration, draft.pages]);
}

/**
 * Сохранять, только если пользователь что-то изменил после загрузки или
 * последнего сохранения. `baseline === null` — урок не загрузился: сохранять
 * нечего, иначе первая правка записала бы пустой урок поверх настоящего.
 */
export function shouldAutosave(baseline: string | null, draft: LessonDraft): boolean {
  return baseline !== null && lessonSnapshot(draft) !== baseline;
}
