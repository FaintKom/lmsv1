"use client";

import { LessonList } from "@/components/live/lesson-list";
import { useTranslation } from "@/lib/i18n/context";
import { PageHeader } from "@/components/ui/page-kit";

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
    <div className="space-y-8">
      <PageHeader title={t("live.list.title")} description={t("live.list.subtitleStudent")} />
      <LessonList />
    </div>
  );
}
