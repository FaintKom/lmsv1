"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Code,
  FileText,
  PlayCircle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Bot,
  Calculator,
  Box,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import type { Course } from "@/types/api";
import { SUBJECT_SURFACE, subjectOf } from "@/lib/subject";

const CONTENT_ICONS: Record<string, LucideIcon> = {
  text: FileText,
  video: PlayCircle,
  quiz: CheckCircle,
  code_challenge: Code,
  robot_2d: Bot,
  math_interactive: Calculator,
  world_3d: Box,
};

const ICON_COLORS: Record<string, string> = {
  text:           "bg-success-soft text-success-fg",
  video:          "bg-danger-soft text-danger-fg",
  quiz:           "bg-warning-soft text-warning-fg",
  code_challenge: "bg-surface-2 text-text",
  robot_2d:       "bg-success-soft text-success-fg",
  math_interactive: "bg-warning-soft text-warning-fg",
  world_3d:       "bg-surface-2 text-text",
};

export default function CourseDetailPage() {
  const params = useParams();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [course, setCourse] = useState<Course | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const canPreview =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "teacher";
  const canAccessLessons = enrolled || canPreview;
  // When staff preview their own (unenrolled) course, carry ?preview=true into
  // the lesson links so the (dashboard) guard renders the lesson instead of
  // bouncing staff to /admin.
  const lessonPreviewSuffix = canPreview && !enrolled ? "?preview=true" : "";

  useEffect(() => {
    apiClient
      .get(`/courses/${params.courseId}`)
      .then(({ data }) => setCourse(data))
      // A course from another school answers 404 — isolation working as it
      // should. The screen, though, stayed in its loading skeleton for ever
      // and read as a broken page (specs/058).
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));

    apiClient
      .get("/progress/my-courses")
      .then(({ data }) => {
        const found = data.find(
          (e: { course_id: string }) => e.course_id === params.courseId,
        );
        if (found) setEnrolled(true);
      })
      .catch(() => {});
  }, [params.courseId]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await apiClient.post("/progress/enroll/", {
        course_id: params.courseId,
      });
      setEnrolled(true);
      toast.success(t("course.enrollSuccess"));
    } catch {
      toast.error(t("course.enrollFailed"));
    } finally {
      setEnrolling(false);
    }
  };

  /* ── course we may not read ──────────────────────────────────── */
  if (missing) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <p className="text-lg font-semibold text-ink-900">
          {t("admin.courseEdit.notFound")}
        </p>
        <Link
          href="/courses"
          className="mt-4 inline-block text-sm text-ink-700 underline"
        >
          {t("nav.courses")}
        </Link>
      </div>
    );
  }

  /* ── loading skeleton ────────────────────────────────────────── */
  if (loading || !course) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="lms-skeleton h-5 w-32 rounded-xs" />
        <div className="lms-skeleton h-52 w-full rounded-lg" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="lms-skeleton h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const subject = subjectOf(course.category);
  const totalLessons =
    course.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0;

  /* ── first lesson link for "Start Learning" ──────────────────── */
  const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── back link ─────────────────────────────────────────── */}
      <Link
        href="/courses"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("course.allCourses")}
      </Link>

      {/* ── hero: the course's subject field (specs/071) ───────── */}
      <section
        data-subject={subject}
        className={`mb-8 grid gap-4 rounded-lg p-8 text-subject-ink ${SUBJECT_SURFACE[subject]}`}
      >
        {course.category && <p className="text-sm opacity-80">{course.category}</p>}
        <h1 className="text-3xl font-bold leading-tight">{course.title}</h1>
        {course.description && (
          <p className="max-w-xl text-base leading-relaxed opacity-85">{course.description}</p>
        )}

        <ul className="flex flex-wrap items-center gap-2 text-sm">
          <li className="flex items-center gap-1.5 rounded-pill bg-subject-ink/10 px-3 py-1">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {t("courses.modules")}: <span className="tabular-nums">{course.modules?.length || 0}</span>
          </li>
          <li className="flex items-center gap-1.5 rounded-pill bg-subject-ink/10 px-3 py-1">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {t("courses.lessons")}: <span className="tabular-nums">{totalLessons}</span>
          </li>
          {canPreview && !enrolled && (
            <li className="rounded-pill bg-subject-ink/10 px-3 py-1 font-medium">{t("course.previewMode")}</li>
          )}
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {enrolled ? (
            <>
              {firstLessonId && (
                <Link
                  href={`/courses/${params.courseId}/lessons/${firstLessonId}${lessonPreviewSuffix}`}
                  className="press-scale inline-flex h-11 items-center gap-2 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
                >
                  {t("course.startLearning")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                <CheckCircle className="h-4 w-4" aria-hidden />
                {t("courses.enrolled")}
              </span>
            </>
          ) : !canPreview ? (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="press-scale inline-flex h-11 items-center rounded-pill bg-primary px-6 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
            >
              {enrolling ? t("course.enrolling") : t("course.enrollInCourse")}
            </button>
          ) : null}
        </div>
      </section>

      {/* ── modules ───────────────────────────────────────────── */}
      <div className="space-y-4">
        {course.modules?.map((module, mi) => (
          <div
            key={module.id}
            className="overflow-hidden rounded-lg bg-surface"
          >
            {/* module header */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-success-soft text-xs font-semibold tabular-nums text-success-fg">
                {mi + 1}
              </span>
              <h2 className="flex-1 text-md font-semibold text-text">
                {module.title}
              </h2>
              <span className="text-xs tabular-nums text-text-muted">
                {t("courses.lessons")}: {module.lessons?.length || 0}
              </span>
            </div>

            {/* lesson list */}
            <ul className="divide-y divide-border/50">
              {module.lessons?.map((lesson) => {
                const Icon = CONTENT_ICONS[lesson.content_type] || BookOpen;
                const iconColor =
                  ICON_COLORS[lesson.content_type] || "bg-surface-2 text-text-muted";

                if (canAccessLessons) {
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/courses/${params.courseId}/lessons/${lesson.id}${lessonPreviewSuffix}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/50"
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xs",
                            iconColor,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-sm font-semibold text-text">
                          {lesson.title}
                        </span>
                        {lesson.duration_minutes && (
                          <span className="flex items-center gap-1 text-xs tabular-nums text-text-subtle">
                            <Clock className="h-3 w-3" />
                            {lesson.duration_minutes}m
                          </span>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-text-subtle" />
                      </Link>
                    </li>
                  );
                }

                /* locked lesson */
                return (
                  <li key={lesson.id}>
                    <div className="flex items-center gap-3 px-5 py-3 opacity-60">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xs",
                          iconColor,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-sm font-semibold text-text-muted">
                        {lesson.title}
                      </span>
                      {lesson.duration_minutes && (
                        <span className="flex items-center gap-1 text-xs tabular-nums text-text-subtle">
                          <Clock className="h-3 w-3" />
                          {lesson.duration_minutes}m
                        </span>
                      )}
                      <Lock className="h-3.5 w-3.5 text-text-subtle" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
