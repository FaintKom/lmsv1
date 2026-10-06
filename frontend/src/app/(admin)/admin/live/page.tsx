"use client";

import { LessonList } from "@/components/live/lesson-list";
import { useTranslation } from "@/lib/i18n/context";
import { PageHeader } from "@/components/ui/page-kit";

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
    <div className="space-y-8">
      <PageHeader title={t("live.list.title")} description={t("live.list.subtitleStaff")} />
      <LessonList />
    </div>
  );
}
