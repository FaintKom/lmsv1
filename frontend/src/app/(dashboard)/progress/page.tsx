"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Trophy, CheckCircle, Clock, ArrowRight, FileText } from "lucide-react";
import type { Enrollment, Course } from "@/types/api";

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const completedEnrollments = enrollments.filter((e) => e.completed_at);
  const inProgressEnrollments = enrollments.filter((e) => !e.completed_at);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Progress</h1>
        <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
          Track your learning journey across all enrolled courses
        </p>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Trophy className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mb-2 text-lg font-semibold text-slate-600 dark:text-slate-300">
              No enrollments yet
            </h3>
            <p className="mb-4 text-base text-slate-500 dark:text-slate-400">
              Enroll in a course from the Courses page to start tracking your
              progress!
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
            >
              Browse courses <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{enrollments.length}</p>
                <p className="text-xs text-slate-500">Enrolled</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{inProgressEnrollments.length}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{completedEnrollments.length}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </CardContent>
            </Card>
          </div>

          {/* In progress */}
          {inProgressEnrollments.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Clock className="h-4 w-4 text-amber-500" />
                In Progress
              </h2>
              <div className="space-y-3">
                {inProgressEnrollments.map((e) => {
                  const course = courseMap.get(e.course_id);
                  return (
                    <Link key={e.id} href={`/courses/${e.course_id}`}>
                      <Card className="transition-shadow hover:shadow-md">
                        <CardContent className="flex items-center gap-4 p-5">
                          <div className="rounded-xl bg-green-50 dark:bg-green-500/20 p-3">
                            <BookOpen className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {course?.title || "Course"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Enrolled:{" "}
                              {new Date(e.enrolled_at).toLocaleDateString()}
                              {course?.category && (
                                <span className="ml-2 rounded bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-xs uppercase">
                                  {course.category}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              {Math.round(e.progress_percent)}%
                            </p>
                            <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                              <div
                                className="h-full rounded-full bg-green-500 transition-all"
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
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <FileText className="h-4 w-4 text-green-500" />
                My Grades
              </h2>
              <div className="space-y-2">
                {grades.map((g, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {g.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {g.status === "graded"
                            ? `Graded${g.submitted_at ? " · " + new Date(g.submitted_at).toLocaleDateString() : ""}`
                            : g.status === "submitted" || g.status === "late"
                              ? "Awaiting review"
                              : g.status}
                        </p>
                        {g.feedback && (
                          <p className="mt-1 text-xs italic text-slate-400 dark:text-slate-500">
                            &ldquo;{g.feedback}&rdquo;
                          </p>
                        )}
                      </div>
                      {g.score !== null ? (
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold ${
                              g.score >= 80
                                ? "text-emerald-600"
                                : g.score >= 60
                                  ? "text-amber-600"
                                  : "text-rose-600"
                            }`}
                          >
                            {Math.round(g.score)}
                          </p>
                          <p className="text-xs text-slate-400">/ {g.max_score}</p>
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-white/10">
                          Pending
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
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Completed
              </h2>
              <div className="space-y-3">
                {completedEnrollments.map((e) => {
                  const course = courseMap.get(e.course_id);
                  return (
                    <Link key={e.id} href={`/courses/${e.course_id}`}>
                      <Card className="border-emerald-100 dark:border-emerald-500/20 transition-shadow hover:shadow-md">
                        <CardContent className="flex items-center gap-4 p-5">
                          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/20 p-3">
                            <Trophy className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {course?.title || "Course"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Completed:{" "}
                              {new Date(e.completed_at!).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-600">
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
