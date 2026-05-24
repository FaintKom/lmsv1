"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Trophy, CheckCircle, Clock, ArrowRight, FileText } from "lucide-react";
import type { Enrollment, Course } from "@/types/api";
import { useTranslation } from "@/lib/i18n/context";

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

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 const completedEnrollments = enrollments.filter((e) => e.completed_at);
 const inProgressEnrollments = enrollments.filter((e) => !e.completed_at);

 return (
 <div className="mx-auto max-w-4xl">
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-text ">{t("progress.title")}</h1>
 <p className="mt-1 text-base text-text-muted ">
 {t("progress.subtitle")}
 </p>
 </div>

 {enrollments.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center p-12 text-center">
 <Trophy className="mb-4 h-12 w-12 text-ink-300 " />
 <h3 className="mb-2 text-lg font-semibold text-text-muted ">
 {t("progress.noEnrollments")}
 </h3>
 <p className="mb-4 text-base text-text-muted ">
 {t("progress.noEnrollmentsHint")}
 </p>
 <Link
 href="/courses"
 className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-success-fg"
 >
 {t("progress.browseCourses")} <ArrowRight className="h-3 w-3" />
 </Link>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-6">
 {/* Summary stats */}
 <div className="grid grid-cols-3 gap-4">
 <Card>
 <CardContent className="p-4 text-center">
 <p className="text-2xl font-bold text-primary">{enrollments.length}</p>
 <p className="text-xs text-text-muted">{t("progress.enrolled")}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4 text-center">
 <p className="text-2xl font-bold text-warning-fg">{inProgressEnrollments.length}</p>
 <p className="text-xs text-text-muted">{t("progress.inProgress")}</p>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4 text-center">
 <p className="text-2xl font-bold text-primary">{completedEnrollments.length}</p>
 <p className="text-xs text-text-muted">{t("progress.completed")}</p>
 </CardContent>
 </Card>
 </div>

 {/* In progress */}
 {inProgressEnrollments.length > 0 && (
 <div>
 <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700 ">
 <Clock className="h-4 w-4 text-warning-fg" />
 {t("progress.inProgress")}
 </h2>
 <div className="space-y-3">
 {inProgressEnrollments.map((e) => {
 const course = courseMap.get(e.course_id);
 return (
 <Link key={e.id} href={`/courses/${e.course_id}`}>
 <Card className="transition-shadow hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-5">
 <div className="rounded-lg bg-success-soft p-3">
 <BookOpen className="h-6 w-6 text-primary" />
 </div>
 <div className="min-w-0 flex-1">
 <p className="font-medium text-text ">
 {course?.title || t("progress.course")}
 </p>
 <p className="text-xs text-text-muted">
 {t("progress.enrolledLabel")}{" "}
 {new Date(e.enrolled_at).toLocaleDateString()}
 {course?.category && (
 <span className="ml-2 rounded bg-ink-100 px-1.5 py-0.5 text-xs uppercase">
 {course.category}
 </span>
 )}
 </p>
 </div>
 <div className="text-right">
 <p className="text-xl font-bold text-primary">
 {Math.round(e.progress_percent)}%
 </p>
 <div className="mt-1 h-2 w-24 overflow-hidden rounded-pill bg-ink-100 ">
 <div
 className="h-full rounded-pill bg-primary transition-all"
 style={{ width: `${e.progress_percent}%` }}
 />
 </div>
 </div>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 </div>
 )}

 {/* My Grades */}
 {grades.length > 0 && (
 <div>
 <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700 ">
 <FileText className="h-4 w-4 text-primary" />
 {t("progress.myGrades")}
 </h2>
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
 <span className="rounded-pill bg-ink-100 px-2.5 py-1 text-xs font-medium text-text-muted ">
 {t("progress.pending")}
 </span>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 )}

 {/* Completed */}
 {completedEnrollments.length > 0 && (
 <div>
 <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700 ">
 <CheckCircle className="h-4 w-4 text-primary" />
 {t("progress.completed")}
 </h2>
 <div className="space-y-3">
 {completedEnrollments.map((e) => {
 const course = courseMap.get(e.course_id);
 return (
 <Link key={e.id} href={`/courses/${e.course_id}`}>
 <Card className="border-primary-soft transition-shadow hover:shadow-md">
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
 </div>
 )}
 </div>
 )}
 </div>
 );
}
