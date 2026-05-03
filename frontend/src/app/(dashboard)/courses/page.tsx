"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { CourseCard } from "@/components/courses/course-card";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Course } from "@/types/api";

export default function CoursesPage() {
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
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-ink-200 p-5 dark:border-white/10">
              <Skeleton className="mb-4 h-40 w-full rounded-lg" />
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="mb-4 h-4 w-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
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
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 dark:text-ink-100">
          <span className="gl-highlight">Courses</span>
        </h1>
        <p className="mt-2 text-base text-ink-500 dark:text-ink-400">
          Browse and enroll in available courses
        </p>
      </div>
      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-ink-100 p-4 dark:bg-white/10">
              <BookOpen className="h-8 w-8 text-ink-400 dark:text-ink-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-ink-700 dark:text-ink-300">
              No courses available
            </h3>
            <p className="mb-4 text-base text-ink-500 dark:text-ink-400">
              Courses will appear here once your admin publishes them.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
            >
              Back to dashboard <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
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
