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
      {/* Welcome — DS hero card */}
      <div className="gl-hero-card mb-8">
        <p className="eb">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h2>
          Welcome back, <span className="gl-highlight">{user?.full_name?.split(" ")[0] || "friend"}</span>{" "}
          <span className="inline-block">&#128075;</span>
        </h2>
        <p className="sub">
          {enrolledCount > 0
            ? `You're ${avgProgress}% through your courses. Pick up where you left off.`
            : "Browse the catalog and enroll in your first course to get started."}
        </p>
        <div className="actions">
          {enrolledCourses.length > 0 ? (
            <Link
              href={`/courses/${enrolledCourses[0].course?.id}`}
              className="gl-btn-sun"
            >
              Continue learning <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link href="/courses" className="gl-btn-sun">
              Browse courses <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link href="/calendar" className="gl-btn-ghost">
            View schedule
          </Link>
        </div>
      </div>

      {/* Stats */}
      <h2 className="sr-only">Learning Stats</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400">
                Enrolled Courses
              </p>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                {loading ? "..." : enrolledCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400">
                Completed
              </p>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                {loading ? "..." : completedCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400">Avg. Progress</p>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                {loading ? "..." : `${avgProgress}%`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sun-400 hover:shadow-md">
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
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-ink-100">
            <Lightbulb className="h-5 w-5 text-sun-500" /> {t("dash.recommended")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 4).map((rec, i) => {
              const colors = {
                review: "border-l-sun-400 bg-sun-50 dark:bg-sun-500/5",
                continue: "border-l-blue-400 bg-blue-50 dark:bg-blue-500/5",
                new: "border-l-green-400 bg-green-50 dark:bg-green-500/5",
                almost_done: "border-l-green-400 bg-green-50 dark:bg-green-500/5",
              };
              return (
                <Link key={i} href={rec.link}>
                  <Card className={`border-l-4 transition-shadow hover:shadow-md ${colors[rec.type] || ""}`}>
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-200">{rec.title}</p>
                      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{rec.description}</p>
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
            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
              Continue Learning
            </h2>
            <Link
              href="/progress"
              className="text-sm font-medium text-green-600 hover:text-green-700"
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
              <Sparkles className="h-5 w-5 text-green-500" />
              Get Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/courses">
              <div className="flex items-center justify-between rounded-xl border border-ink-100 p-4 transition-colors hover:bg-ink-50 dark:border-white/10 dark:hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-ink-400" />
                  <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                    Browse available courses
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 dark:text-ink-700" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-coral-500" />
              {t("dash.upcoming")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-400">{t("dash.noEvents")}</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <Link key={ev.id} href="/calendar" className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition-colors hover:bg-ink-50 dark:border-white/10 dark:hover:bg-white/5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{
                      backgroundColor: ev.event_type === "deadline" ? "#ff7a5c" : ev.event_type === "lesson" ? "#3b82f6" : ev.event_type === "meeting" ? "#3fb04b" : "#8b5cf6"
                    }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-700 dark:text-ink-300">{ev.title}</p>
                      <p className="text-xs text-ink-400">{new Date(ev.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
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
                <div className="mb-3 rounded-full bg-ink-100 p-3 dark:bg-white/10">
                  <Clock className="h-5 w-5 text-ink-400 dark:text-ink-500" />
                </div>
                <p className="text-sm font-medium text-ink-500 dark:text-ink-400">
                  No activity yet
                </p>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-500">
                  Enroll in a course to start learning!
                </p>
                <Link
                  href="/courses"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
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
                    className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition-colors hover:bg-ink-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-500/20">
                      <BookOpen className="h-4 w-4 text-green-500 dark:text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-700 dark:text-ink-300">
                        {course?.title}
                      </p>
                      <p className="text-xs text-ink-500 dark:text-ink-400">
                        {Math.round(enrollment.progress_percent)}% complete
                      </p>
                    </div>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-green-500"
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
