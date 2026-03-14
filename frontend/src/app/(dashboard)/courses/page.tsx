"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { CourseCard } from "@/components/courses/course-card";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Course } from "@/types/api";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/courses/")
      .then(({ data }) => setCourses(data.items))
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
            <div key={i} className="rounded-xl border border-slate-200 p-5">
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
        <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse and enroll in available courses
        </p>
      </div>
      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-600">
              No courses available
            </h3>
            <p className="text-sm text-slate-400">
              Courses will appear here once your admin publishes them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
