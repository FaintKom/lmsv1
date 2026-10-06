"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Trophy, CheckCircle, ArrowRight } from "lucide-react";
import type { Enrollment, Course } from "@/types/api";
import { useTranslation } from "@/lib/i18n/context";
import { EmptyState, PageHeader, PageLoading, StatTile } from "@/components/ui/page-kit";

interface Grade {
 type: string;
 title: string;
 score: number | null;
 max_score: number;
 status: string;
 feedback: string | null;
 submitted_at: string | null;
}

export default function ProgressPage() {
 const { t } = useTranslation();
 const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
 const [courses, setCourses] = useState<Course[]>([]);
 const [grades, setGrades] = useState<Grade[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 Promise.all([
 apiClient.get("/progress/my-courses/").then(({ data }) => data),
 apiClient.get("/courses/").then(({ data }) => data.items || []),
 apiClient.get("/progress/my-grades").then(({ data }) => data.grades || []).catch(() => []),
 ])
 .then(([enrollData, courseData, gradeData]) => {
 setEnrollments(enrollData);
 setCourses(courseData);
 setGrades(gradeData);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 const courseMap = new Map(courses.map((c) => [c.id, c]));

 if (loading) return <PageLoading />;

 const completedEnrollments = enrollments.filter((e) => e.completed_at);
 const inProgressEnrollments = enrollments.filter((e) => !e.completed_at);

 return (
 <div className="grid gap-8">
 <PageHeader title={t("progress.title")} description={t("progress.subtitle")} />

 {enrollments.length === 0 ? (
 <EmptyState
 icon={Trophy}
 title={t("progress.noEnrollments")}
 description={t("progress.noEnrollmentsHint")}
 action={
 <Link
 href="/courses"
 className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
 >
 {t("progress.browseCourses")} <ArrowRight className="h-3 w-3" aria-hidden />
 </Link>
 }
 />
 ) : (
 <div className="grid gap-8">
 <div className="grid grid-cols-3 gap-3">
 <StatTile label={t("progress.enrolled")} value={enrollments.length} />
 <StatTile label={t("progress.inProgress")} value={inProgressEnrollments.length} />
 <StatTile label={t("progress.completed")} value={completedEnrollments.length} />
 </div>

 {/* In progress */}
 {inProgressEnrollments.length > 0 && (
 <section>
 <h2 className="mb-3 text-lg font-semibold text-text">{t("progress.inProgress")}</h2>
 {/* Links are block: space-y on an inline <a> adds no gap */}
 <div className="space-y-3">
 {inProgressEnrollments.map((e) => {
 const course = courseMap.get(e.course_id);
 return (
 <Link key={e.id} href={`/courses/${e.course_id}`} className="block">
 <Card className="transition-shadow hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-5">
 <div className="hidden rounded-lg bg-success-soft p-3 sm:block">
 <BookOpen className="h-6 w-6 text-primary" aria-hidden />
 </div>
 <div className="min-w-0 flex-1">
 <p className="font-medium text-text ">
 {course?.title || t("progress.course")}
 </p>
 <p className="text-xs text-text-muted">
 {t("progress.enrolledLabel")}{" "}
 {new Date(e.enrolled_at).toLocaleDateString()}
 {course?.category && (
 <span className="ml-2 rounded-pill bg-surface-2 px-2 py-0.5 text-xs">
 {course.category}
 </span>
 )}
 </p>
 </div>
 <div className="w-16 shrink-0 text-right sm:w-24">
 <p className="text-xl font-semibold tabular-nums text-primary">
 {Math.round(e.progress_percent)}%
 </p>
 <ProgressBar value={e.progress_percent} size="sm" className="mt-1" />
 </div>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 </section>
 )}

 {/* My Grades */}
 {grades.length > 0 && (
 <section>
 <h2 className="mb-3 text-lg font-semibold text-text">{t("progress.myGrades")}</h2>
 <div className="space-y-2">
 {grades.map((g, i) => (
 <Card key={i}>
 <CardContent className="flex items-center gap-4 p-4">
 <div className="min-w-0 flex-1">
 <p className="text-sm font-medium text-text ">
 {g.title}
 </p>
 <p className="text-xs text-text-muted">
 {g.status === "graded"
 ? `${t("progress.graded")}${g.submitted_at ? " · " + new Date(g.submitted_at).toLocaleDateString() : ""}`
 : g.status === "submitted" || g.status === "late"
 ? t("progress.awaitingReview")
 : g.status}
 </p>
 {g.feedback && (
 <p className="mt-1 text-xs italic text-text-subtle ">
 &ldquo;{g.feedback}&rdquo;
 </p>
 )}
 </div>
 {g.score !== null ? (
 <div className="text-right">
 <p
 className={`text-lg font-bold ${
 g.score >= 80
 ? "text-primary"
 : g.score >= 60
 ? "text-warning-fg"
 : "text-danger-fg"
 }`}
 >
 {Math.round(g.score)}
 </p>
 <p className="text-xs text-text-subtle">/ {g.max_score}</p>
 </div>
 ) : (
 <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-muted ">
 {t("progress.pending")}
 </span>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 </section>
 )}

 {/* Completed */}
 {completedEnrollments.length > 0 && (
 <section>
 <h2 className="mb-3 text-lg font-semibold text-text">{t("progress.completed")}</h2>
 <div className="space-y-3">
 {completedEnrollments.map((e) => {
 const course = courseMap.get(e.course_id);
 return (
 <Link key={e.id} href={`/courses/${e.course_id}`} className="block">
 <Card className="transition-shadow hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-5">
 <div className="rounded-lg bg-success-soft p-3">
 <Trophy className="h-6 w-6 text-primary" />
 </div>
 <div className="min-w-0 flex-1">
 <p className="font-medium text-text ">
 {course?.title || t("progress.course")}
 </p>
 <p className="text-xs text-text-muted">
 {t("progress.completedLabel")}{" "}
 {new Date(e.completed_at!).toLocaleDateString()}
 </p>
 </div>
 <div className="flex items-center gap-1 rounded-pill bg-success-soft px-3 py-1 text-sm font-semibold text-primary">
 <CheckCircle className="h-4 w-4" />
 100%
 </div>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 </section>
 )}
 </div>
 )}
 </div>
 );
}
