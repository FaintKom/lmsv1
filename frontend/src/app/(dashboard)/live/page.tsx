"use client";

import { LessonList } from "@/components/live/lesson-list";
import { useTranslation } from "@/lib/i18n/context";

/**
 * A pupil's own live lessons, and the recordings shared with their group.
 *
 * The access was already theirs — the server hands a pupil both lists, and the
 * lesson review screen has always shown a lesson's recordings without checking
 * for a teacher. What was missing was any way to reach a lesson once it ended.
 * This is that way.
 */
export default function LiveLessonsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">{t("live.list.title")}</h1>
      <p className="mb-6 text-sm text-text-muted">{t("live.list.subtitleStudent")}</p>
      <LessonList />
    </div>
  );
}
