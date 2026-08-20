"use client";

import { LessonList } from "@/components/live/lesson-list";
import { useTranslation } from "@/lib/i18n/context";

/**
 * The live lessons a school has run, newest first, each with its recordings.
 *
 * Sits at /admin/live because /admin/live/[lessonId] is already the lesson
 * itself — this is its index. The neighbouring /admin/lessons belongs to the
 * course-lesson editor, and naming two different things "lessons" would help
 * nobody.
 */
export default function AdminLiveLessonsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">{t("live.list.title")}</h1>
      <p className="mb-6 text-sm text-text-muted">{t("live.list.subtitleStaff")}</p>
      <LessonList />
    </div>
  );
}
