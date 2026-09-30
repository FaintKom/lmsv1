"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { CourseCard } from "@/components/courses/course-card";
import { useTranslation } from "@/lib/i18n/context";
import { subjectOf, type Subject } from "@/lib/subject";
import { withViewTransition } from "@/lib/view-transition";
import { BookOpen, ArrowRight } from "lucide-react";
import type { Course } from "@/types/api";

const SUBJECT_LABEL = {
 lang: "subject.lang",
 math: "subject.math",
 code: "subject.code",
 other: "subject.other",
} as const satisfies Record<Subject, string>;
const SUBJECTS = Object.keys(SUBJECT_LABEL) as Subject[];

export default function CoursesPage() {
 const { t } = useTranslation();
 const [courses, setCourses] = useState<Course[]>([]);
 const [progressMap, setProgressMap] = useState<Record<string, number>>({});
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState<Subject | "all">("all");

 useEffect(() => {
 Promise.all([
 apiClient.get("/courses/").then(({ data }) => data.items as Course[]),
 apiClient.get("/progress/my-courses").then(({ data }) => data).catch(() => []),
 ])
 .then(([courseItems, enrollments]) => {
 setCourses(courseItems);
 const pMap: Record<string, number> = {};
 for (const e of enrollments) {
 if (e.course_id && typeof e.progress_percent === "number") {
 pMap[e.course_id] = e.progress_percent;
 }
 }
 setProgressMap(pMap);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 // Only subjects the school actually teaches get a filter; one subject, no filter.
 const present = SUBJECTS.filter((s) => courses.some((c) => subjectOf(c.category) === s));
 const shown = filter === "all" ? courses : courses.filter((c) => subjectOf(c.category) === filter);

 // M10: the grid reflows into place instead of being redrawn (MOTION.md §8).
 // flushSync so the new DOM exists when the transition captures it.
 const choose = (next: Subject | "all") =>
 withViewTransition(() => flushSync(() => setFilter(next)));

 if (loading) {
 return (
 <div className="mx-auto max-w-6xl">
 <div className="mb-8">
 <div className="lms-skeleton mb-2 h-8 w-40" />
 <div className="lms-skeleton h-4 w-64" />
 </div>
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="overflow-hidden rounded-lg bg-surface">
 <div className="lms-skeleton h-36 w-full !rounded-none" />
 <div className="p-5">
 <div className="lms-skeleton mb-3 h-3 w-full" />
 <div className="lms-skeleton h-1.5 w-full !rounded-pill" />
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 }

 return (
 <div className="mx-auto grid max-w-6xl gap-6">
 <header className="grid gap-1">
 <h1 className="text-3xl font-bold leading-tight text-text">{t("courses.title")}</h1>
 <p className="text-base text-text-muted">{t("courses.subtitle")}</p>
 </header>

 {present.length > 1 && (
 <div role="group" aria-label={t("courses.catalog")} className="flex flex-wrap gap-2">
 {(["all", ...present] as const).map((s) => (
 <button
 key={s}
 type="button"
 aria-pressed={filter === s}
 onClick={() => choose(s)}
 className="press-scale h-9 rounded-pill border border-border-strong bg-surface px-4 text-sm font-medium text-text aria-pressed:border-text aria-pressed:bg-text aria-pressed:text-bg"
 >
 {s === "all" ? t("courses.filterAll") : t(SUBJECT_LABEL[s])}
 </button>
 ))}
 </div>
 )}

 {courses.length === 0 ? (
 <div className="flex flex-col items-center justify-center rounded-lg bg-surface p-16 text-center">
 <BookOpen className="mb-4 h-8 w-8 text-text-subtle" aria-hidden />
 <h2 className="mb-1 text-lg font-semibold text-text">{t("courses.noAvailable")}</h2>
 <p className="mb-4 text-sm text-text-muted">{t("courses.noAvailableHint")}</p>
 <Link
 href="/dashboard"
 className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
 >
 {t("courses.backToDashboard")} <ArrowRight className="h-3 w-3" aria-hidden />
 </Link>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {shown.map((course) => (
 // view-transition-name lets each card travel to its new slot
 <div key={course.id} style={{ viewTransitionName: `course-${course.id}` }}>
 <CourseCard course={course} progress={progressMap[course.id]} />
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
