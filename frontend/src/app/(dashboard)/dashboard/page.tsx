"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { CourseCard } from "@/components/courses/course-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StreakPill } from "@/components/ui/streak-pill";
import { XpPill } from "@/components/ui/xp-pill";
import { SUBJECT_SURFACE, subjectOf } from "@/lib/subject";
import { ArrowRight, BookOpen } from "lucide-react";
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

const REC_CHIP: Record<Recommendation["type"], string> = {
 review: "bg-danger-soft text-danger-fg",
 continue: "bg-info-soft text-info-fg",
 new: "bg-success-soft text-success-fg",
 almost_done: "bg-warning-soft text-warning-fg",
};

/** Event-type dot. Colour alone carries the type, so it is hidden from readers. */
const EVENT_DOT: Record<string, string> = {
 deadline: "bg-danger",
 lesson: "bg-info",
 meeting: "bg-primary",
};

/** M9 plays once per browser session; the dashboard is revisited all day. */
const SEEN_KEY = "dash-entered";

export default function DashboardPage() {
 const user = useAuthStore((s) => s.user);
 const { t } = useTranslation();
 const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
 const [courses, setCourses] = useState<Course[]>([]);
 const [loading, setLoading] = useState(true);
 const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
 const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
 const [streak, setStreak] = useState(0);
 // null while loading, [] when there is genuinely nothing graded yet.
 const [grades, setGrades] = useState<
 { type: string; title: string; score: number | null; max_score: number }[] | null
 >(null);
 const [xp, setXp] = useState(0);
 // Decided after hydration: the server has no sessionStorage, and a class
 // that differs between server and client HTML is not patched by React.
 const [firstVisit, setFirstVisit] = useState(false);
 useEffect(() => {
 try {
 if (!sessionStorage.getItem(SEEN_KEY)) setFirstVisit(true);
 sessionStorage.setItem(SEEN_KEY, "1");
 } catch {
 /* private mode: no entrance, nothing lost */
 }
 }, []);

 useEffect(() => {
 apiClient.get("/calendar/upcoming?limit=5").then(({ data }) => setUpcomingEvents(data)).catch(() => {});
 apiClient.get("/recommendations/").then(({ data }) => setRecommendations(data)).catch(() => {});
 apiClient.get("/progress/my-grades").then(({ data }) => setGrades(data)).catch(() => setGrades([]));
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
 // The course to pick up: furthest along among the unfinished ones.
 const current = enrolledCourses
 .filter(({ enrollment }) => enrollment.completed_at === null)
 .sort((a, b) => (b.enrollment.progress_percent || 0) - (a.enrollment.progress_percent || 0))[0];
 const others = enrolledCourses.filter((c) => c !== current);
 const currentSubject = current ? subjectOf(current.course!.category) : "other";

 const firstName = user?.full_name?.split(" ")[0];
 const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

 return (
 <div className={`mx-auto grid max-w-6xl gap-8 ${firstVisit ? "stagger-children" : ""}`}>
 {/* Greeting. Streak and XP stay; they only lost the loud fills. */}
 <header className="flex flex-wrap items-end justify-between gap-4">
 <div className="grid gap-1">
 <p className="text-sm text-text-subtle">{today}</p>
 <h1 className="text-3xl font-bold leading-tight text-text">
 {t("dash.welcomeBack")}
 {firstName ? `, ${firstName}` : ""}
 </h1>
 </div>
 <div className="flex flex-wrap gap-2">
 <StreakPill days={streak} />
 {xp > 0 && <XpPill xp={xp} />}
 </div>
 </header>

 <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
 {/* Pick up where you left off, on the course's own field colour */}
 {current ? (
 <section
 aria-label={t("dash.continue")}
 data-subject={currentSubject}
 className={`grid content-between gap-6 rounded-lg p-6 text-subject-ink ${SUBJECT_SURFACE[currentSubject]}`}
 >
 <div className="grid gap-2">
 <p className="text-sm opacity-80">{current.course!.category || t("dash.continue")}</p>
 <h2 className="text-2xl font-bold leading-tight">{current.course!.title}</h2>
 </div>
 <div className="grid gap-4">
 <div className="flex items-center gap-3">
 <ProgressBar value={current.enrollment.progress_percent || 0} fillClassName="bg-subject-ink" />
 <span className="text-sm font-medium tabular-nums">
 {Math.round(current.enrollment.progress_percent || 0)}%
 </span>
 </div>
 <Link
 href={`/courses/${current.course!.id}`}
 className="press-scale inline-flex h-11 w-fit items-center gap-2 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
 >
 {t("dash.continue")}
 <ArrowRight className="h-4 w-4" aria-hidden />
 </Link>
 </div>
 </section>
 ) : (
 <section className="grid content-center justify-items-start gap-3 rounded-lg bg-surface p-6">
 <h2 className="text-xl font-bold text-text">{loading ? "…" : t("dash.noActivity")}</h2>
 {!loading && <p className="text-sm text-text-muted">{t("dash.enrollPrompt")}</p>}
 <Link
 href="/courses"
 className="press-scale inline-flex h-11 items-center gap-2 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
 >
 <BookOpen className="h-4 w-4" aria-hidden />
 {t("dash.browseCourses")}
 </Link>
 </section>
 )}

 <section className="rounded-lg bg-surface p-6">
 <h2 className="mb-3 text-lg font-semibold text-text">{t("dash.upcoming")}</h2>
 {upcomingEvents.length === 0 ? (
 <p className="py-4 text-sm text-text-subtle">{t("dash.noEvents")}</p>
 ) : (
 <ul className="divide-y divide-border">
 {upcomingEvents.map((ev) => (
 <li key={ev.id}>
 <Link href="/calendar" className="flex items-center gap-3 py-3 transition-colors hover:text-primary">
 <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${EVENT_DOT[ev.event_type] ?? "bg-ink-400"}`} />
 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm font-medium text-text">{ev.title}</span>
 <span className="block text-xs text-text-subtle">
 {new Date(ev.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
 </span>
 </span>
 </Link>
 </li>
 ))}
 </ul>
 )}
 </section>
 </div>

 {/* One strip of numbers, not four identical tiles (DESIGN_SPEC §4) */}
 <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-4">
 {[
 [t("dash.enrolled"), enrolledCount],
 [t("dash.completed"), completedCount],
 [t("dash.avgProgress"), `${avgProgress}%`],
 ["XP", xp],
 ].map(([label, value]) => (
 <div key={String(label)} className="grid gap-1 bg-surface px-5 py-4">
 <dt className="text-sm text-text-subtle">{label}</dt>
 <dd className="font-display text-2xl font-semibold tabular-nums text-text">{loading ? "…" : value}</dd>
 </div>
 ))}
 </dl>

 {!loading && (
 <NewcomerChecklist
 hasProfile={!!user?.full_name}
 hasBrowsed={true}
 hasEnrollment={enrollments.length > 0}
 hasCompletedLesson={enrollments.some((e) => e.completed_at !== null)}
 />
 )}

 {recommendations.length > 0 && (
 <section>
 <h2 className="mb-4 text-lg font-semibold text-text">{t("dash.recommended")}</h2>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {recommendations.slice(0, 3).map((rec, i) => (
 <Link
 key={i}
 href={rec.link}
 className="grid gap-2 rounded-lg bg-surface p-5 transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-safe:hover:-translate-y-0.5"
 >
 <span className={`w-fit rounded-pill px-2.5 py-0.5 text-xs font-medium first-letter:uppercase ${REC_CHIP[rec.type] ?? "bg-surface-2 text-text"}`}>
 {rec.type.replace("_", " ")}
 </span>
 <span className="text-sm font-semibold text-text">{rec.title}</span>
 <span className="text-sm text-text-muted">{rec.description}</span>
 </Link>
 ))}
 </div>
 </section>
 )}

 {others.length > 0 && (
 <section>
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-text">{t("dash.continue")}</h2>
 <Link href="/progress" className="flex items-center gap-1 py-1 text-sm font-medium text-primary hover:text-primary-hover">
 {t("dash.viewAll")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
 </Link>
 </div>
 <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
 {others.slice(0, 3).map(({ enrollment, course }) => (
 <CourseCard key={enrollment.id} course={course!} progress={enrollment.progress_percent} />
 ))}
 </div>
 </section>
 )}

 {/* Recent grades — the student had no way to see these without leaving
     the page, though the endpoint has always been there (specs/061). */}
 {grades && grades.length > 0 && (
 <section className="rounded-lg bg-surface p-6">
 <h2 className="mb-3 text-lg font-semibold text-text">{t("dash.recentGrades")}</h2>
 <ul className="divide-y divide-border">
 {grades.slice(0, 5).map((g, i) => (
 <li key={`${g.title}-${i}`} className="flex items-center gap-3 py-2.5">
 <span className="min-w-0 flex-1 truncate text-sm text-text">{g.title}</span>
 <span className="text-sm font-semibold tabular-nums text-text">
 {g.score ?? "—"}
 <span className="text-text-subtle">/{g.max_score}</span>
 </span>
 </li>
 ))}
 </ul>
 </section>
 )}
 </div>
 );
}
