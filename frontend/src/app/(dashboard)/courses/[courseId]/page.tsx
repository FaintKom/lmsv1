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

/* ── subject radial gradients (same as course-card) ────────────── */
const SUBJECT_THEMES: Record<string, { gradient: string; glyph: string }> = {
  programming: { gradient: "radial-gradient(circle at 75% 25%, var(--green-600), var(--ink-900))", glyph: "</>" },
  math:        { gradient: "radial-gradient(circle at 75% 25%, var(--green-500), var(--green-800))", glyph: "Σ" },
  algebra:     { gradient: "radial-gradient(circle at 75% 25%, var(--green-500), var(--green-800))", glyph: "x²" },
  geometry:    { gradient: "radial-gradient(circle at 75% 25%, var(--green-400), var(--green-700))", glyph: "△" },
  languages:   { gradient: "radial-gradient(circle at 75% 25%, var(--coral-500), #7a2e15)", glyph: "Ñ" },
  spanish:     { gradient: "radial-gradient(circle at 75% 25%, var(--coral-500), #7a2e15)", glyph: "Ñ" },
  sat:         { gradient: "radial-gradient(circle at 75% 25%, var(--sun-400), var(--sun-700))", glyph: "★" },
  science:     { gradient: "radial-gradient(circle at 75% 25%, var(--green-600), var(--ink-900))", glyph: "⚗" },
  python:      { gradient: "radial-gradient(circle at 75% 25%, var(--green-600), var(--ink-900))", glyph: "Py" },
  javascript:  { gradient: "radial-gradient(circle at 75% 25%, var(--sun-400), var(--ink-900))", glyph: "JS" },
};
const DEFAULT_THEME = {
  gradient: "radial-gradient(circle at 75% 25%, var(--green-500), var(--green-800))",
  glyph: "📚",
};

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
  text:           "bg-green-100 text-green-700",
  video:          "bg-coral-100 text-coral-700",
  quiz:           "bg-sun-100 text-sun-700",
  code_challenge: "bg-ink-100 text-ink-700",
  robot_2d:       "bg-green-100 text-green-700",
  math_interactive: "bg-sun-100 text-sun-700",
  world_3d:       "bg-ink-100 text-ink-700",
};

export default function CourseDetailPage() {
  const params = useParams();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const canPreview =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "teacher";
  const canAccessLessons = enrolled || canPreview;

  useEffect(() => {
    apiClient
      .get(`/courses/${params.courseId}`)
      .then(({ data }) => setCourse(data))
      .catch(() => {})
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

  /* ── loading skeleton ────────────────────────────────────────── */
  if (loading || !course) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="lms-skeleton h-5 w-32 rounded-[7px]" />
        <div className="lms-skeleton h-52 w-full rounded-[18px]" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="lms-skeleton h-28 w-full rounded-[18px]" />
          ))}
        </div>
      </div>
    );
  }

  const theme = SUBJECT_THEMES[course.category || ""] || DEFAULT_THEME;
  const totalLessons =
    course.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0;

  /* ── first lesson link for "Start Learning" ──────────────────── */
  const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── back link ─────────────────────────────────────────── */}
      <Link
        href="/courses"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("course.allCourses")}
      </Link>

      {/* ── hero ──────────────────────────────────────────────── */}
      <div
        className="relative mb-8 overflow-hidden rounded-[18px] p-8 text-white"
        style={{ background: theme.gradient }}
      >
        {/* mono glyph watermark */}
        <span className="pointer-events-none absolute right-6 top-4 font-mono text-[72px] font-extrabold leading-none text-white/10">
          {theme.glyph}
        </span>

        <div className="relative z-10">
          {course.category && (
            <span className="mb-3 inline-block rounded-pill bg-white/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-white/90">
              {course.category}
            </span>
          )}
          <h1 className="mb-3 text-[28px] font-extrabold leading-tight">
            {course.title}
          </h1>
          {course.description && (
            <p className="mb-5 max-w-xl text-[14px] leading-relaxed text-white/75">
              {course.description}
            </p>
          )}

          {/* stats pills */}
          <div className="mb-6 flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 font-mono text-[11px] font-semibold text-white/90">
              <BookOpen className="h-3.5 w-3.5" />
              {course.modules?.length || 0} {t("courses.modules")}
            </span>
            <span className="flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 font-mono text-[11px] font-semibold text-white/90">
              <FileText className="h-3.5 w-3.5" />
              {totalLessons} {t("courses.lessons")}
            </span>
          </div>

          {/* action row */}
          <div className="flex items-center gap-3">
            {canPreview && !enrolled && (
              <span className="rounded-pill bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
                {t("course.previewMode")}
              </span>
            )}

            {enrolled ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/20 px-4 py-2 text-[13px] font-bold text-white">
                  <CheckCircle className="h-4 w-4" />
                  {t("courses.enrolled")}
                </span>
                {firstLessonId && (
                  <Link
                    href={`/courses/${params.courseId}/lessons/${firstLessonId}`}
                    className="btn-pop inline-flex items-center gap-2 rounded-[14px] bg-white px-5 py-2.5 text-[13px] font-bold text-ink-900"
                    style={{ "--pop": "rgba(0,0,0,0.15)" } as React.CSSProperties}
                  >
                    {t("course.startLearning")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </>
            ) : !canPreview ? (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn-pop btn-pop--sun rounded-[14px] bg-sun-400 px-6 py-2.5 text-[13px] font-bold text-ink-900"
              >
                {enrolling ? t("course.enrolling") : t("course.enrollInCourse")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── modules ───────────────────────────────────────────── */}
      <div className="space-y-4">
        {course.modules?.map((module, mi) => (
          <div
            key={module.id}
            className="overflow-hidden rounded-[18px] border border-border bg-paper-2"
          >
            {/* module header */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-green-100 font-mono text-[12px] font-extrabold text-green-800">
                {mi + 1}
              </span>
              <h2 className="flex-1 text-[14px] font-extrabold text-text">
                {module.title}
              </h2>
              <span className="font-mono text-[11px] text-text-muted">
                {module.lessons?.length || 0} {t("courses.lessons")}
              </span>
            </div>

            {/* lesson list */}
            <ul className="divide-y divide-border/50">
              {module.lessons?.map((lesson) => {
                const Icon = CONTENT_ICONS[lesson.content_type] || BookOpen;
                const iconColor =
                  ICON_COLORS[lesson.content_type] || "bg-ink-50 text-ink-500";

                if (canAccessLessons) {
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/courses/${params.courseId}/lessons/${lesson.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50/50"
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]",
                            iconColor,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-[13px] font-semibold text-text">
                          {lesson.title}
                        </span>
                        {lesson.duration_minutes && (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-text-subtle">
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
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]",
                          iconColor,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-[13px] font-semibold text-text-muted">
                        {lesson.title}
                      </span>
                      {lesson.duration_minutes && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-text-subtle">
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
