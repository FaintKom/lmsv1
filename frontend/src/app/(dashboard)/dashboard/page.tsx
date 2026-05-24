"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { CourseCard } from "@/components/courses/course-card";
import {
 BookOpen,
 TrendingUp,
 CheckCircle,
 ArrowRight,
 Sparkles,
 Flame,
 Calendar,
 Lightbulb,
 Clock,
 Star,
} from "lucide-react";
import type { Enrollment, Course, CalendarEvent } from "@/types/api";
import { useTranslation } from "@/lib/i18n/context";
import { NewcomerChecklist } from "@/components/onboarding/newcomer-checklist";

interface Recommendation {
 type: "review" | "continue" | "new" | "almost_done";
 title: string;
 description: string;
 link: string;
 priority: number;
}

export default function DashboardPage() {
 const user = useAuthStore((s) => s.user);
 const { t } = useTranslation();
 const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
 const [courses, setCourses] = useState<Course[]>([]);
 const [loading, setLoading] = useState(true);
 const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
 const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
 const [streak, setStreak] = useState(0);
 const [xp, setXp] = useState(0);

 useEffect(() => {
 apiClient.get("/calendar/upcoming?limit=5").then(({ data }) => setUpcomingEvents(data)).catch(() => {});
 apiClient.get("/recommendations/").then(({ data }) => setRecommendations(data)).catch(() => {});
 apiClient.get("/gamification/my-streak").then(({ data }) => {
 setStreak(data.current_streak || 0);
 setXp(data.total_xp || 0);
 }).catch(() => {});
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
 ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / enrolledCount)
 : 0;
 const completedCount = enrollments.filter((e) => e.completed_at !== null).length;

 const courseMap = new Map(courses.map((c) => [c.id, c]));
 const enrolledCourses = enrollments
 .map((e) => ({ enrollment: e, course: courseMap.get(e.course_id) }))
 .filter((item) => item.course);

 return (
 <div className="mx-auto max-w-6xl">
 {/* Hero row */}
 <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
 {/* Hero greeting card */}
 <div className="relative overflow-hidden rounded-[24px] p-9" style={{ background: "linear-gradient(135deg, var(--green-600) 0%, var(--green-700) 100%)" }}>
 <div className="absolute -right-10 -top-10 h-[240px] w-[240px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,216,77,0.25), transparent 70%)" }} />
 <div className="absolute -bottom-12 left-[60%] h-[140px] w-[140px] rounded-full" style={{ background: "radial-gradient(circle, rgba(63,176,75,0.5), transparent 70%)" }} />
 <p className="relative mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-green-200">
 {t("dash.welcomeBack") || "Welcome back"}
 </p>
 <h1 className="relative mb-3 text-[36px] font-extrabold leading-[1.05] tracking-tight text-white">
 {"Let's keep "}
 <em className="inline-block rounded-lg bg-sun-300 px-2 not-italic text-ink-900" style={{ transform: "rotate(-1deg)" }}>
 learning
 </em>
 {", "}
 {user?.full_name?.split(" ")[0] || "Student"}!
 </h1>
 <p className="relative mb-6 max-w-[380px] text-[15px] leading-relaxed text-white/85">
 {t("dash.subtitle") || "Here's an overview of your learning progress"}
 </p>
 <div className="relative flex flex-wrap gap-2.5">
 <Link
 href="/courses"
 className="btn-pop inline-flex items-center gap-2 rounded-[14px] bg-sun-400 px-[22px] py-[13px] text-[13px] font-bold text-ink-900"
 style={{ boxShadow: "0 4px 0 0 var(--sun-500)" }}
 >
 <BookOpen className="h-4 w-4" />
 Browse Courses
 </Link>
 <Link
 href="/progress"
 className="inline-flex items-center gap-2 rounded-[14px] bg-white/[0.12] px-[22px] py-[13px] text-[13px] font-bold text-white transition-colors hover:bg-white/[0.18]"
 >
 <TrendingUp className="h-4 w-4" />
 My Progress
 </Link>
 </div>
 </div>

 {/* Streak card */}
 <div className="relative overflow-hidden rounded-[24px] border border-border bg-paper-2 p-6">
 <div className="mb-3.5 flex items-start justify-between">
 <div>
 <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-subtle">
 Current Streak
 </p>
 <p className="text-[64px] font-extrabold leading-[0.9] tracking-tight text-coral-500">
 {streak}<small className="ml-1 text-[18px] font-bold tracking-normal text-coral-700">days</small>
 </p>
 </div>
 <div
 className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-coral-500 text-[24px] text-white"
 style={{ boxShadow: "0 4px 0 0 var(--coral-700)" }}
 >
 🔥
 </div>
 </div>
 {xp > 0 && (
 <div className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-sun-300 px-3 py-1.5 text-[12px] font-extrabold text-sun-700">
 <Star className="h-3.5 w-3.5" />
 {xp} XP
 </div>
 )}
 </div>
 </div>

 {/* KPI strip */}
 <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
 <div className="flex items-center gap-4 rounded-[18px] border border-border bg-paper-2 p-5 shadow-sm">
 <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary-soft">
 <BookOpen className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-text-subtle">Enrolled</p>
 <p className="text-[28px] font-extrabold leading-tight tracking-tight text-text">{loading ? "…" : enrolledCount}</p>
 </div>
 </div>
 <div className="flex items-center gap-4 rounded-[18px] border border-border bg-paper-2 p-5 shadow-sm">
 <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-success-soft">
 <CheckCircle className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-text-subtle">Completed</p>
 <p className="text-[28px] font-extrabold leading-tight tracking-tight text-text">{loading ? "…" : completedCount}</p>
 </div>
 </div>
 <div className="flex items-center gap-4 rounded-[18px] border border-border bg-paper-2 p-5 shadow-sm">
 <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-sun-100">
 <TrendingUp className="h-5 w-5 text-sun-700" />
 </div>
 <div>
 <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-text-subtle">Avg. Progress</p>
 <p className="text-[28px] font-extrabold leading-tight tracking-tight text-text">{loading ? "…" : `${avgProgress}%`}</p>
 </div>
 </div>
 <div className="flex items-center gap-4 rounded-[18px] border border-border bg-paper-2 p-5 shadow-sm">
 <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-coral-50">
 <Flame className="h-5 w-5 text-coral-700" />
 </div>
 <div>
 <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-text-subtle">Streak</p>
 <p className="text-[28px] font-extrabold leading-tight tracking-tight text-text">{streak}<span className="ml-0.5 text-sm font-bold text-text-muted">d</span></p>
 </div>
 </div>
 </div>

 {/* Newcomer onboarding */}
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
 <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold text-text">
 <Lightbulb className="h-5 w-5 text-warning-fg" /> {t("dash.recommended")}
 </h2>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {recommendations.slice(0, 4).map((rec, i) => {
 const chipColors = {
 review: "bg-coral-50 text-coral-700",
 continue: "bg-info-soft text-info-fg",
 new: "bg-success-soft text-success-fg",
 almost_done: "bg-sun-100 text-sun-700",
 };
 return (
 <Link key={i} href={rec.link}>
 <div className="rounded-[14px] border border-border bg-paper-2 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md">
 <span className={`mb-2 inline-block rounded-pill px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${chipColors[rec.type] || "bg-ink-100 text-ink-700"}`}>
 {rec.type.replace("_", " ")}
 </span>
 <p className="text-sm font-bold text-text">{rec.title}</p>
 <p className="mt-1 text-xs text-text-muted">{rec.description}</p>
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 )}

 {/* Continue Learning */}
 {enrolledCourses.length > 0 && (
 <div className="mb-8">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-[17px] font-bold text-text">Continue Learning</h2>
 <Link href="/progress" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover">
 View all <ArrowRight className="h-3.5 w-3.5" />
 </Link>
 </div>
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
 {enrolledCourses.slice(0, 3).map(({ enrollment, course }) => (
 <CourseCard key={enrollment.id} course={course!} progress={enrollment.progress_percent} />
 ))}
 </div>
 </div>
 )}

 {/* Bottom row: upcoming events + quick actions */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 <div className="rounded-[18px] border border-border bg-paper-2 p-6 shadow-sm">
 <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-text">
 <Calendar className="h-4.5 w-4.5 text-coral-500" />
 {t("dash.upcoming")}
 </h3>
 {upcomingEvents.length === 0 ? (
 <p className="py-6 text-center text-sm text-text-subtle">{t("dash.noEvents")}</p>
 ) : (
 <div className="space-y-2">
 {upcomingEvents.map((ev) => (
 <Link key={ev.id} href="/calendar" className="flex items-center gap-3 rounded-[10px] p-3 transition-colors hover:bg-surface-2">
 <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{
 backgroundColor: ev.event_type === "deadline" ? "var(--coral-500)" : ev.event_type === "lesson" ? "var(--info)" : ev.event_type === "meeting" ? "var(--green-500)" : "var(--ink-400)"
 }} />
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold text-text">{ev.title}</p>
 <p className="font-mono text-[10px] text-text-subtle">{new Date(ev.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
 </div>
 </Link>
 ))}
 </div>
 )}
 </div>

 <div className="rounded-[18px] border border-border bg-paper-2 p-6 shadow-sm">
 <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-text">
 <Sparkles className="h-4.5 w-4.5 text-primary" />
 Quick Actions
 </h3>
 <div className="space-y-2">
 <Link href="/courses" className="flex items-center justify-between rounded-[10px] border border-border p-4 transition-all hover:border-green-300 hover:bg-surface-2">
 <div className="flex items-center gap-3">
 <BookOpen className="h-5 w-5 text-text-subtle" />
 <span className="text-sm font-semibold text-text">Browse available courses</span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300" />
 </Link>
 {enrolledCourses.length === 0 && (
 <div className="flex flex-col items-center py-6 text-center">
 <div className="mb-3 rounded-full bg-ink-100 p-3">
 <Clock className="h-5 w-5 text-text-subtle" />
 </div>
 <p className="text-sm font-medium text-text-muted">No activity yet</p>
 <p className="mt-1 text-xs text-text-subtle">Enroll in a course to start learning!</p>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
