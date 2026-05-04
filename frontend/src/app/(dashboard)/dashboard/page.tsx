"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseCard } from "@/components/courses/course-card";
import { BookOpen, TrendingUp, Clock, ArrowRight, Sparkles, CheckCircle, Flame, Calendar, Lightbulb } from "lucide-react";
import type { Enrollment, Course, CalendarEvent } from "@/types/api";
import { useTranslation } from "@/lib/i18n/context";

interface Recommendation {
 type: "review" | "continue" | "new" | "almost_done";
 title: string;
 description: string;
 link: string;
 priority: number;
}
import { StreakWidget } from "@/components/gamification/streak-widget";
import { NewcomerChecklist } from "@/components/onboarding/newcomer-checklist";

export default function DashboardPage() {
 const user = useAuthStore((s) => s.user);
 const { t } = useTranslation();
 const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
 const [courses, setCourses] = useState<Course[]>([]);
 const [loading, setLoading] = useState(true);
 const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
 const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

 useEffect(() => {
 apiClient.get("/calendar/upcoming?limit=5").then(({ data }) => setUpcomingEvents(data)).catch(() => {});
 apiClient.get("/recommendations/").then(({ data }) => setRecommendations(data)).catch(() => {});
 }, []);

 useEffect(() => {
 Promise.all([
 apiClient.get("/progress/my-courses/").then(({ data }) => data),
 apiClient.get("/courses/").then(({ data }) => data.items || []),
 ])
 .then(([enrollData, courseData]) => {
 setEnrollments(enrollData);
 setCourses(courseData);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 const enrolledCount = enrollments.length;
 const avgProgress =
 enrolledCount > 0
 ? Math.round(
 enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) /
 enrolledCount
 )
 : 0;
 const completedCount = enrollments.filter(
 (e) => e.completed_at !== null
 ).length;

 // Build a map of course_id -> Course for enrolled courses
 const courseMap = new Map(courses.map((c) => [c.id, c]));
 const enrolledCourses = enrollments
 .map((e) => ({ enrollment: e, course: courseMap.get(e.course_id) }))
 .filter((item) => item.course);

 return (
 <div className="mx-auto max-w-6xl">
 {/* Welcome */}
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-text ">
 Welcome back, {user?.full_name}{" "}
 <span className="inline-block">&#128075;</span>
 </h1>
 <p className="mt-1 text-base text-text-muted ">
 Here&apos;s an overview of your learning progress
 </p>
 </div>

 {/* Stats */}
 <h2 className="sr-only">Learning Stats</h2>
 <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <Card className="border-l-4 border-l-green-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3 ">
 <BookOpen className="h-5 w-5 text-primary " />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">
 Enrolled Courses
 </p>
 <p className="text-2xl font-bold text-text ">
 {loading ? "..." : enrolledCount}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3 ">
 <CheckCircle className="h-5 w-5 text-primary " />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">
 Completed
 </p>
 <p className="text-2xl font-bold text-text ">
 {loading ? "..." : completedCount}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3 ">
 <TrendingUp className="h-5 w-5 text-primary " />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Avg. Progress</p>
 <p className="text-2xl font-bold text-text ">
 {loading ? "..." : `${avgProgress}%`}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-orange-400 hover:shadow-md">
 <CardContent className="p-6">
 <StreakWidget />
 </CardContent>
 </Card>
 </div>

 {/* Newcomer onboarding checklist */}
 {!loading && (
 <NewcomerChecklist
 hasProfile={!!user?.full_name}
 hasBrowsed={true}
 hasEnrollment={enrollments.length > 0}
 hasCompletedLesson={enrollments.some((e) => e.completed_at !== null)}
 />
 )}

 {/* Recommendations */}
 {recommendations.length > 0 && (
 <div className="mb-8">
 <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text ">
 <Lightbulb className="h-5 w-5 text-warning-fg" /> {t("dash.recommended")}
 </h2>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {recommendations.slice(0, 4).map((rec, i) => {
 const colors = {
 review: "border-l-orange-400 bg-coral-50 ",
 continue: "border-l-blue-400 bg-info-soft ",
 new: "border-l-green-400 bg-success-soft ",
 almost_done: "border-l-emerald-400 bg-success-soft ",
 };
 return (
 <Link key={i} href={rec.link}>
 <Card className={`border-l-4 transition-shadow hover:shadow-md ${colors[rec.type] || ""}`}>
 <CardContent className="p-4">
 <p className="text-sm font-semibold text-ink-700 ">{rec.title}</p>
 <p className="mt-1 text-xs text-text-muted ">{rec.description}</p>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 </div>
 )}

 {/* Enrolled courses with progress */}
 {enrolledCourses.length > 0 && (
 <div className="mb-8">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-text ">
 Continue Learning
 </h2>
 <Link
 href="/progress"
 className="text-sm font-medium text-primary hover:text-success-fg"
 >
 View all
 </Link>
 </div>
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {enrolledCourses.slice(0, 3).map(({ enrollment, course }) => (
 <CourseCard
 key={enrollment.id}
 course={course!}
 progress={enrollment.progress_percent}
 />
 ))}
 </div>
 </div>
 )}

 {/* Quick Actions */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-primary" />
 Get Started
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <Link href="/courses">
 <div className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-surface-2 ">
 <div className="flex items-center gap-3">
 <BookOpen className="h-5 w-5 text-text-subtle" />
 <span className="text-sm font-medium text-ink-700 ">
 Browse available courses
 </span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300 " />
 </div>
 </Link>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Calendar className="h-5 w-5 text-danger-fg" />
 {t("dash.upcoming")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 {upcomingEvents.length === 0 ? (
 <p className="py-4 text-center text-sm text-text-subtle">{t("dash.noEvents")}</p>
 ) : (
 <div className="space-y-2">
 {upcomingEvents.map((ev) => (
 <Link key={ev.id} href="/calendar" className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-2 ">
 <span className="h-2.5 w-2.5 rounded-pill" style={{
 backgroundColor: ev.event_type === "deadline" ? "#ef4444" : ev.event_type === "lesson" ? "#3b82f6" : ev.event_type === "meeting" ? "#22c55e" : "#8b5cf6"
 }} />
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-medium text-ink-700 ">{ev.title}</p>
 <p className="text-xs text-text-subtle">{new Date(ev.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
 </div>
 </Link>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>Recent Enrollments</CardTitle>
 </CardHeader>
 <CardContent>
 {enrolledCourses.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-8 text-center">
 <div className="mb-3 rounded-pill bg-ink-100 p-3 ">
 <Clock className="h-5 w-5 text-text-subtle " />
 </div>
 <p className="text-sm font-medium text-text-muted ">
 No activity yet
 </p>
 <p className="mt-1 text-xs text-text-muted ">
 Enroll in a course to start learning!
 </p>
 <Link
 href="/courses"
 className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-success-fg"
 >
 Browse courses <ArrowRight className="h-3 w-3" />
 </Link>
 </div>
 ) : (
 <div className="space-y-3">
 {enrolledCourses.slice(0, 4).map(({ enrollment, course }) => (
 <Link
 key={enrollment.id}
 href={`/courses/${enrollment.course_id}`}
 className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-2 "
 >
 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft ">
 <BookOpen className="h-4 w-4 text-primary " />
 </div>
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-medium text-ink-700 ">
 {course?.title}
 </p>
 <p className="text-xs text-text-muted ">
 {Math.round(enrollment.progress_percent)}% complete
 </p>
 </div>
 <div className="h-1.5 w-16 overflow-hidden rounded-pill bg-ink-100 ">
 <div
 className="h-full rounded-pill bg-primary"
 style={{ width: `${enrollment.progress_percent}%` }}
 />
 </div>
 </Link>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
