"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseCard } from "@/components/courses/course-card";
import { BookOpen, Code, TrendingUp, Clock, ArrowRight, Sparkles, CheckCircle, Flame } from "lucide-react";
import type { Enrollment, Course } from "@/types/api";
import { StreakWidget } from "@/components/gamification/streak-widget";
import { NewcomerChecklist } from "@/components/onboarding/newcomer-checklist";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            <Link href="/assignments">
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
