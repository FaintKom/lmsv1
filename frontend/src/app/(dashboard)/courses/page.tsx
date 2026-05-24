"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { CourseCard } from "@/components/courses/course-card";
import { useTranslation } from "@/lib/i18n/context";
import { BookOpen, ArrowRight } from "lucide-react";
import type { Course } from "@/types/api";

export default function CoursesPage() {
 const { t } = useTranslation();
 const [courses, setCourses] = useState<Course[]>([]);
 const [progressMap, setProgressMap] = useState<Record<string, number>>({});
 const [loading, setLoading] = useState(true);

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

 if (loading) {
 return (
 <div className="mx-auto max-w-6xl">
 <div className="mb-8">
 <div className="lms-skeleton mb-2 h-8 w-40" />
 <div className="lms-skeleton h-4 w-64" />
 </div>
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 6 }).map((_, i) => (
 <div key={i} className="overflow-hidden rounded-[18px] border border-border bg-paper-2 shadow-sm">
 <div className="lms-skeleton h-36 w-full !rounded-none" />
 <div className="p-5">
 <div className="lms-skeleton mb-2 h-4 w-3/4" />
 <div className="lms-skeleton mb-3 h-3 w-full" />
 <div className="lms-skeleton h-[10px] w-full !rounded-pill" />
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-6xl">
 <div className="mb-8">
 <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
 {t("courses.catalog")}
 </p>
 <h1 className="text-[28px] font-extrabold tracking-tight text-text">{t("courses.title")}</h1>
 <p className="mt-1 text-[15px] text-text-muted">
 {t("courses.subtitle")}
 </p>
 </div>
 {courses.length === 0 ? (
 <div className="flex flex-col items-center justify-center rounded-[18px] border border-border bg-paper-2 p-16 text-center shadow-sm">
 <div className="mb-4 rounded-full bg-ink-100 p-4">
 <BookOpen className="h-8 w-8 text-text-subtle" />
 </div>
 <h3 className="mb-1 text-lg font-bold text-text">
 {t("courses.noAvailable")}
 </h3>
 <p className="mb-4 text-sm text-text-muted">
 {t("courses.noAvailableHint")}
 </p>
 <Link
 href="/dashboard"
 className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover"
 >
 {t("courses.backToDashboard")} <ArrowRight className="h-3 w-3" />
 </Link>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {courses.map((course) => (
 <CourseCard key={course.id} course={course} progress={progressMap[course.id]} />
 ))}
 </div>
 )}
 </div>
 );
}
