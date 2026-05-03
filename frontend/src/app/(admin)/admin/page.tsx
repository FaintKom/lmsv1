"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  GraduationCap,
  DollarSign,
  ArrowRight,
  UserPlus,
  Plus,
  LinkIcon,
  Copy,
  Check,
  Sparkles,
  PlusCircle,
  BarChart3,
  X,
  ClipboardList,
  Inbox,
  TrendingUp,
  Clock,
  Library,
  HelpCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { TeacherOnboarding } from "@/components/onboarding/teacher-onboarding";
import { toast } from "sonner";
import { OnboardingTour, startOnboardingTour } from "@/components/onboarding-tour";

interface Stats {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  active_students: number;
}

interface TeacherStats {
  my_courses: number;
  my_students: number;
  to_review: number;
  avg_score: number;
  recent_submissions: {
    id: string;
    assignment_title: string;
    student_name: string;
    submitted_at: string;
    status: string;
    score: number | null;
  }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("admin-onboarding-dismissed") === "true";
  });
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "teacher";

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?org=${user?.org_id}`
    : "";

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (isTeacher) {
      apiClient.get("/admin/teacher-stats").then(({ data }) => setTeacherStats(data)).catch(() => {});
    } else {
      apiClient.get("/admin/dashboard").then(({ data }) => setStats(data)).catch(() => {});
    }
  }, [isTeacher]);

  if (isTeacher) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 dark:text-ink-100">
            Teacher <span className="gl-highlight">Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Welcome back, {user?.full_name}
          </p>
        </div>

        <div className="mb-6">
          <TeacherOnboarding />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-400 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-blue-100 dark:bg-blue-500/20 p-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500 dark:text-ink-400">My Courses</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                  {teacherStats?.my_courses || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-400 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-green-100 dark:bg-green-500/20 p-3">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500 dark:text-ink-400">My Students</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                  {teacherStats?.my_students || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sun-400 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-sun-100 dark:bg-sun-500/20 p-3">
                <Inbox className="h-5 w-5 text-sun-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500 dark:text-ink-400">To Review</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                  {teacherStats?.to_review || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-400 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-green-100 dark:bg-green-500/20 p-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-ink-500 dark:text-ink-400">Avg Score</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                  {teacherStats?.avg_score || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Insights */}
        {teacherStats && (
          <Card className="mb-8 border-l-4 border-l-green-400">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-green-500" />
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teacherStats.to_review > 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-sun-50 p-3 dark:bg-sun-500/10">
                  <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <span className="font-semibold">{teacherStats.to_review} submission{teacherStats.to_review !== 1 ? "s" : ""}</span>{" "}
                    waiting for review.{" "}
                    <Link href="/admin/review" className="font-medium text-sun-500 hover:underline dark:text-sun-400">
                      Review now
                    </Link>
                  </p>
                </div>
              )}
              {teacherStats.my_students > 0 && teacherStats.avg_score > 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-500/10">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    Average score across your students is{" "}
                    <span className="font-semibold">{teacherStats.avg_score}%</span>.
                    {teacherStats.avg_score >= 80
                      ? " Great job — your students are performing well!"
                      : teacherStats.avg_score >= 60
                      ? " Consider reviewing topics where students struggle."
                      : " Some students may need extra support."}
                  </p>
                </div>
              )}
              {teacherStats.my_courses === 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    You haven&apos;t created any courses yet.{" "}
                    <Link href="/admin/courses" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                      Create your first course
                    </Link>
                  </p>
                </div>
              )}
              {teacherStats.my_students === 0 && teacherStats.my_courses > 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    No students enrolled yet. Share your invite link to get started.
                  </p>
                </div>
              )}
              {teacherStats.to_review === 0 && teacherStats.my_students > 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-500/10">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    All caught up — no submissions pending review.
                  </p>
                </div>
              )}
              {teacherStats.recent_submissions && teacherStats.recent_submissions.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-ink-50 p-3 dark:bg-white/5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    Last submission from{" "}
                    <span className="font-semibold">{teacherStats.recent_submissions[0].student_name}</span>{" "}
                    on {new Date(teacherStats.recent_submissions[0].submitted_at).toLocaleDateString()}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Submissions */}
        {teacherStats?.recent_submissions && teacherStats.recent_submissions.length > 0 && (
          <Card className="mb-8 border-l-4 border-l-green-400">
            <CardHeader>
              <CardTitle className="text-base">Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teacherStats.recent_submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 dark:border-white/5"
                >
                  <div className={`rounded-lg p-2 ${
                    sub.status === "graded"
                      ? "bg-green-100 dark:bg-green-500/20"
                      : sub.status === "late"
                      ? "bg-sun-100 dark:bg-sun-500/20"
                      : "bg-blue-100 dark:bg-blue-500/20"
                  }`}>
                    <ClipboardList className={`h-4 w-4 ${
                      sub.status === "graded"
                        ? "text-green-600 dark:text-green-400"
                        : sub.status === "late"
                        ? "text-sun-500 dark:text-sun-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-ink-100">
                      {sub.assignment_title}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {sub.student_name} &middot; {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  {sub.score != null ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
                      {sub.score}
                    </span>
                  ) : (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500 dark:bg-white/10 dark:text-ink-400">
                      {sub.status}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/content-library">
            <Card className="cursor-pointer border-l-4 border-l-green-400 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <Library className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-ink-700 dark:text-ink-300">Browse Templates</span>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 dark:text-ink-700" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/courses">
            <Card className="cursor-pointer border-l-4 border-l-blue-400 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-ink-700 dark:text-ink-300">My Courses</span>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 dark:text-ink-700" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/assignments">
            <Card className="cursor-pointer border-l-4 border-l-green-400 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-ink-700 dark:text-ink-300">Assignments</span>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 dark:text-ink-700" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/review">
            <Card className="cursor-pointer border-l-4 border-l-sun-400 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <Inbox className="h-5 w-5 text-sun-500" />
                  <span className="text-sm font-medium text-ink-700 dark:text-ink-300">Review Queue</span>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 dark:text-ink-700" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <OnboardingTour />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 dark:text-ink-100">
            Admin <span className="gl-highlight">Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Overview of your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={startOnboardingTour}
            title="Replay the onboarding tour"
          >
            <HelpCircle className="h-4 w-4" />
            Tour
          </Button>
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </Link>
          <Link href="/admin/courses">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          </Link>
        </div>
      </div>

      {!onboardingDismissed &&
        stats &&
        (stats.total_courses === 0 || stats.total_users === 0) && (
          <Card className="mb-8 border-l-4 border-l-green-500 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-ink-900 dark:text-ink-100">
                <Sparkles className="h-5 w-5 text-green-500" />
                Getting Started
              </CardTitle>
              <button
                onClick={() => {
                  setOnboardingDismissed(true);
                  localStorage.setItem("admin-onboarding-dismissed", "true");
                }}
                className="rounded-md p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-white/10 hover:text-ink-700 dark:hover:text-ink-300"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-5">
              <Link
                href="/admin/courses"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700 dark:text-ink-300 hover:bg-green-50 dark:hover:bg-green-500/10"
              >
                <PlusCircle className="h-4 w-4 text-green-500" />
                Create your first course
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700 dark:text-ink-300 hover:bg-green-50 dark:hover:bg-green-500/10"
              >
                <UserPlus className="h-4 w-4 text-green-500" />
                Invite students
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700 dark:text-ink-300 hover:bg-green-50 dark:hover:bg-green-500/10"
              >
                <BarChart3 className="h-4 w-4 text-green-500" />
                View analytics
              </Link>
            </CardContent>
          </Card>
        )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 dark:bg-green-500/20 p-3">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400">Total Users</p>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                {stats?.total_users || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 dark:bg-green-500/20 p-3">
              <BookOpen className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400">Courses</p>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                {stats?.total_courses || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 dark:bg-green-500/20 p-3">
              <GraduationCap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400">Enrollments</p>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">
                {stats?.total_enrollments || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sun-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-sun-100 dark:bg-sun-500/20 p-3">
              <DollarSign className="h-5 w-5 text-sun-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 dark:text-ink-400">MRR</p>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">$0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Students */}
      <Card className="mb-8 border-green-100 bg-green-50/30 dark:border-green-500/20 dark:bg-green-500/10">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-100 dark:bg-green-500/20 p-2.5">
              <LinkIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">Invite Students</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Share this link so students can join your school
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="hidden rounded-lg bg-white px-3 py-1.5 text-xs text-ink-700 shadow-sm sm:block dark:bg-white/10 dark:text-ink-300">
              {inviteLink.length > 50 ? inviteLink.slice(0, 50) + "..." : inviteLink}
            </code>
            <Button size="sm" onClick={copyInviteLink} variant="outline">
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copy Link</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/admin/users">
          <Card className="cursor-pointer border-l-4 border-l-green-400 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  Manage Users
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-300 dark:text-ink-700" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/courses">
          <Card className="cursor-pointer border-l-4 border-l-green-400 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  Manage Courses
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-300 dark:text-ink-700" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/analytics">
          <Card className="cursor-pointer border-l-4 border-l-green-400 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  View Analytics
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-300 dark:text-ink-700" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
