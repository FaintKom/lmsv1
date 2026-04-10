"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Code,
  FileText,
  PlayCircle,
  CheckCircle,
  ArrowLeft,
  Clock,
  Bot,
  Calculator,
  Box,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import type { Course } from "@/types/api";

const CONTENT_ICONS: Record<string, LucideIcon> = {
  text: FileText,
  video: PlayCircle,
  quiz: CheckCircle,
  code_challenge: Code,
  robot_2d: Bot,
  math_interactive: Calculator,
  world_3d: Box,
};

const CONTENT_COLORS: Record<string, string> = {
  text: "bg-blue-50 text-blue-500",
  video: "bg-rose-50 text-rose-500",
  quiz: "bg-emerald-50 text-emerald-500",
  code_challenge: "bg-violet-50 text-violet-500",
};

export default function CourseDetailPage() {
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  // Admins/teachers/super_admins can always access lessons (preview mode)
  const canPreview = user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
  const canAccessLessons = enrolled || canPreview;

  useEffect(() => {
    apiClient
      .get(`/courses/${params.courseId}`)
      .then(({ data }) => setCourse(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Check if already enrolled
    apiClient
      .get("/progress/my-courses")
      .then(({ data }) => {
        const found = data.find(
          (e: { course_id: string }) => e.course_id === params.courseId
        );
        if (found) setEnrolled(true);
      })
      .catch(() => {});
  }, [params.courseId]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await apiClient.post("/progress/enroll/", {
        course_id: params.courseId,
      });
      setEnrolled(true);
      toast.success("Successfully enrolled in the course!");
    } catch {
      toast.error("Failed to enroll (may already be enrolled)");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading || !course) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-green-500" />
        </div>
      </div>
    );
  }

  const totalLessons =
    course.modules?.reduce(
      (acc, m) => acc + (m.lessons?.length || 0),
      0
    ) || 0;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Course Header */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            {course.category && (
              <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                {course.category}
              </span>
            )}
            <h1 className="mb-3 text-3xl font-bold">{course.title}</h1>
            <p className="mb-4 max-w-xl text-green-100">
              {course.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-green-200">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {course.modules?.length || 0} modules
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {totalLessons} lessons
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          {canPreview && !enrolled && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
              Preview Mode
            </span>
          )}
          {enrolled ? (
            <Button
              variant="secondary"
              className="bg-white/20 text-white hover:bg-white/30"
              disabled
            >
              <CheckCircle className="h-4 w-4" />
              Enrolled
            </Button>
          ) : !canPreview ? (
            <Button
              onClick={handleEnroll}
              disabled={enrolling}
              className="bg-white text-green-700 hover:bg-white/90"
            >
              {enrolling ? "Enrolling..." : "Enroll in Course"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-5">
        {course.modules?.map((module, mi) => (
          <Card key={module.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-green-50 text-xs font-bold text-green-600">
                  {mi + 1}
                </span>
                {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {module.lessons?.map((lesson) => {
                  const Icon =
                    CONTENT_ICONS[lesson.content_type] || BookOpen;
                  const colorClass =
                    CONTENT_COLORS[lesson.content_type] || "bg-slate-50 text-slate-500";
                  return (
                    <li key={lesson.id}>
                      {canAccessLessons ? (
                        <Link
                          href={`/courses/${params.courseId}/lessons/${lesson.id}`}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-green-50"
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1 text-sm font-medium text-green-700 hover:underline">
                            {lesson.title}
                          </span>
                          {lesson.duration_minutes && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {lesson.duration_minutes} min
                            </span>
                          )}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1 text-sm font-medium text-slate-700">
                            {lesson.title}
                          </span>
                          {lesson.duration_minutes && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {lesson.duration_minutes} min
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
