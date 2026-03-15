"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseCard } from "@/components/courses/course-card";
import { BookOpen, Code, TrendingUp, Clock, ArrowRight, Sparkles, CheckCircle, Flame, Calendar, Lightbulb } from "lucide-react";
import type { Enrollment, Course, CalendarEvent } from "@/types/api";

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back, {user?.full_name}{" "}
          <span className="inline-block">&#128075;</span>
        </h1>
        <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
          Here&apos;s an overview of your learning progress
        </p>
      </div>

      {/* Stats */}
      <h2 className="sr-only">Learning Stats</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-indigo-100 p-3 dark:bg-indigo-500/20">
              <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Enrolled Courses
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {loading ? "..." : enrolledCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Completed
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {loading ? "..." : completedCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-violet-100 p-3 dark:bg-violet-500/20">
              <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg. Progress</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
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
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Lightbulb className="h-5 w-5 text-amber-500" /> Recommended for You
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 4).map((rec, i) => {
              const colors = {
                review: "border-l-orange-400 bg-orange-50 dark:bg-orange-500/5",
                continue: "border-l-blue-400 bg-blue-50 dark:bg-blue-500/5",
                new: "border-l-indigo-400 bg-indigo-50 dark:bg-indigo-500/5",
                almost_done: "border-l-emerald-400 bg-emerald-50 dark:bg-emerald-500/5",
              };
              return (
                <Link key={i} href={rec.link}>
                  <Card className={`border-l-4 transition-shadow hover:shadow-md ${colors[rec.type] || ""}`}>
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rec.title}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{rec.description}</p>
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
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Continue Learning
            </h2>
            <Link
              href="/progress"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Get Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/courses">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Browse available courses
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              </div>
            </Link>
            <Link href="/challenges">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <Code className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Try coding challenges
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-500" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <Link key={ev.id} href="/calendar" className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{
                      backgroundColor: ev.event_type === "deadline" ? "#ef4444" : ev.event_type === "lesson" ? "#3b82f6" : ev.event_type === "meeting" ? "#22c55e" : "#8b5cf6"
                    }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{ev.title}</p>
                      <p className="text-xs text-slate-400">{new Date(ev.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
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
                <div className="mb-3 rounded-full bg-slate-100 p-3 dark:bg-white/10">
                  <Clock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No activity yet
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  Enroll in a course to start learning!
                </p>
                <Link
                  href="/courses"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/20">
                      <BookOpen className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                        {course?.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {Math.round(enrollment.progress_percent)}% complete
                      </p>
                    </div>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-indigo-500"
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
