"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/utils";
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
  type LucideIcon,
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

/* ── KPI card component ────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  color: "green" | "sun" | "coral" | "ink";
}) {
  const iconStyles: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    sun: "bg-sun-100 text-sun-700",
    coral: "bg-coral-50 text-coral-700",
    ink: "bg-ink-100 text-ink-700",
  };

  return (
    <div className="rounded-[14px] border border-border bg-paper-2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-subtle">
          {label}
        </span>
        <div
          className={cn(
            "flex h-[22px] w-[22px] items-center justify-center rounded-[7px]",
            iconStyles[color],
          )}
        >
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <div className="text-[28px] font-extrabold leading-none tracking-tight text-text">
        {value}
        {suffix && (
          <small className="ml-1 font-mono text-[13px] font-semibold text-text-subtle">
            {suffix}
          </small>
        )}
      </div>
    </div>
  );
}

/* ── Quick action link ─────────────────────────────────────────── */
function QuickLink({
  href,
  icon: Icon,
  label,
  iconColor,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[14px] border border-border bg-paper-2 p-4 transition-all hover:-translate-y-0.5 hover:border-green-300 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[9px]",
            iconColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[13px] font-bold text-text">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-text-subtle" />
    </Link>
  );
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

  const inviteLink =
    typeof window !== "undefined"
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
      apiClient
        .get("/admin/teacher-stats")
        .then(({ data }) => setTeacherStats(data))
        .catch(() => {});
    } else {
      apiClient
        .get("/admin/dashboard")
        .then(({ data }) => setStats(data))
        .catch(() => {});
    }
  }, [isTeacher]);

  /* ================================================================
     TEACHER DASHBOARD
     ================================================================ */
  if (isTeacher) {
    return (
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-7">
          <p className="mb-1 font-mono text-[11px] font-bold uppercase tracking-widest text-green-700">
            Teacher · Dashboard
          </p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-text">
            Welcome back, {user?.full_name}
          </h1>
        </div>

        <div className="mb-6">
          <TeacherOnboarding />
        </div>

        {/* KPI strip */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="My Courses"
            value={teacherStats?.my_courses || 0}
            icon={BookOpen}
            color="green"
          />
          <KpiCard
            label="My Students"
            value={teacherStats?.my_students || 0}
            icon={Users}
            color="green"
          />
          <KpiCard
            label="To Review"
            value={teacherStats?.to_review || 0}
            icon={Inbox}
            color="coral"
          />
          <KpiCard
            label="Avg Score"
            value={teacherStats?.avg_score || 0}
            suffix="%"
            icon={TrendingUp}
            color="sun"
          />
        </div>

        {/* Quick Insights */}
        {teacherStats && (
          <div className="mb-6 rounded-[14px] border border-border bg-paper-2">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Sparkles className="h-4 w-4 text-green-600" />
              <h3 className="text-[14px] font-extrabold text-text">
                Quick Insights
              </h3>
            </div>
            <div className="space-y-2.5 p-5">
              {teacherStats.to_review > 0 && (
                <div className="flex items-start gap-3 rounded-[10px] bg-coral-50 p-3">
                  <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-coral-700" />
                  <p className="text-[13px] text-ink-700">
                    <span className="font-bold">
                      {teacherStats.to_review} submission
                      {teacherStats.to_review !== 1 ? "s" : ""}
                    </span>{" "}
                    waiting for review.{" "}
                    <Link
                      href="/admin/review"
                      className="font-bold text-coral-700 hover:underline"
                    >
                      Review now →
                    </Link>
                  </p>
                </div>
              )}
              {teacherStats.my_students > 0 && teacherStats.avg_score > 0 && (
                <div className="flex items-start gap-3 rounded-[10px] bg-green-50 p-3">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                  <p className="text-[13px] text-ink-700">
                    Average score across your students is{" "}
                    <span className="font-bold">{teacherStats.avg_score}%</span>
                    .
                    {teacherStats.avg_score >= 80
                      ? " Great job — your students are performing well!"
                      : teacherStats.avg_score >= 60
                        ? " Consider reviewing topics where students struggle."
                        : " Some students may need extra support."}
                  </p>
                </div>
              )}
              {teacherStats.my_courses === 0 && (
                <div className="flex items-start gap-3 rounded-[10px] bg-green-50 p-3">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                  <p className="text-[13px] text-ink-700">
                    You haven&apos;t created any courses yet.{" "}
                    <Link
                      href="/admin/courses"
                      className="font-bold text-green-700 hover:underline"
                    >
                      Create your first course →
                    </Link>
                  </p>
                </div>
              )}
              {teacherStats.my_students === 0 &&
                teacherStats.my_courses > 0 && (
                  <div className="flex items-start gap-3 rounded-[10px] bg-ink-50 p-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                    <p className="text-[13px] text-ink-700">
                      No students enrolled yet. Share your invite link to get
                      started.
                    </p>
                  </div>
                )}
              {teacherStats.to_review === 0 &&
                teacherStats.my_students > 0 && (
                  <div className="flex items-start gap-3 rounded-[10px] bg-green-50 p-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                    <p className="text-[13px] text-ink-700">
                      All caught up — no submissions pending review.
                    </p>
                  </div>
                )}
              {teacherStats.recent_submissions &&
                teacherStats.recent_submissions.length > 0 && (
                  <div className="flex items-start gap-3 rounded-[10px] bg-ink-50 p-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                    <p className="text-[13px] text-ink-700">
                      Last submission from{" "}
                      <span className="font-bold">
                        {teacherStats.recent_submissions[0].student_name}
                      </span>{" "}
                      on{" "}
                      {new Date(
                        teacherStats.recent_submissions[0].submitted_at,
                      ).toLocaleDateString()}
                      .
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Recent Submissions */}
        {teacherStats?.recent_submissions &&
          teacherStats.recent_submissions.length > 0 && (
            <div className="mb-6 rounded-[14px] border border-border bg-paper-2">
              <div className="border-b border-border px-5 py-3.5">
                <h3 className="text-[14px] font-extrabold text-text">
                  Recent Submissions
                </h3>
              </div>
              <div className="divide-y divide-border/50">
                {teacherStats.recent_submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-green-25"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]",
                        sub.status === "graded"
                          ? "bg-green-100 text-green-700"
                          : sub.status === "late"
                            ? "bg-coral-50 text-coral-700"
                            : "bg-ink-100 text-ink-700",
                      )}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-text">
                        {sub.assignment_title}
                      </p>
                      <p className="font-mono text-[10px] text-text-subtle">
                        {sub.student_name} ·{" "}
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    {sub.score != null ? (
                      <span className="rounded-pill bg-green-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-green-800">
                        {sub.score}
                      </span>
                    ) : (
                      <span className="rounded-pill bg-ink-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink-700">
                        {sub.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            href="/admin/content-library"
            icon={Library}
            label="Browse Templates"
            iconColor="bg-green-100 text-green-700"
          />
          <QuickLink
            href="/admin/courses"
            icon={BookOpen}
            label="My Courses"
            iconColor="bg-green-100 text-green-700"
          />
          <QuickLink
            href="/admin/assignments"
            icon={ClipboardList}
            label="Assignments"
            iconColor="bg-sun-100 text-sun-700"
          />
          <QuickLink
            href="/admin/review"
            icon={Inbox}
            label="Review Queue"
            iconColor="bg-coral-50 text-coral-700"
          />
        </div>
      </div>
    );
  }

  /* ================================================================
     ADMIN / OWNER DASHBOARD
     ================================================================ */
  return (
    <div className="mx-auto max-w-6xl">
      <OnboardingTour />

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="mb-7 flex items-start justify-between border-b border-border pb-5">
        <div>
          <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-green-700">
            Admin · Overview
          </p>
          <h1 className="mb-2 text-[28px] font-extrabold tracking-tight text-text">
            Admin Dashboard
          </h1>
          <p className="max-w-md text-[14px] text-text-muted">
            Overview of your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startOnboardingTour}
            title="Replay the onboarding tour"
            className="flex h-9 items-center gap-1.5 rounded-[11px] border border-border bg-paper-2 px-3 text-[12px] font-bold text-text-muted transition-colors hover:border-green-300 hover:text-text"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Tour
          </button>
          <Link
            href="/admin/users"
            className="flex h-9 items-center gap-1.5 rounded-[11px] border border-border bg-paper-2 px-3 text-[12px] font-bold text-text-muted transition-colors hover:border-green-300 hover:text-text"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </Link>
          <Link
            href="/admin/courses"
            className="btn-pop flex h-9 items-center gap-1.5 rounded-[11px] bg-green-600 px-4 text-[12px] font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New Course
          </Link>
        </div>
      </div>

      {/* ── Onboarding card ───────────────────────────────────── */}
      {!onboardingDismissed &&
        stats &&
        (stats.total_courses === 0 || stats.total_users === 0) && (
          <div className="mb-6 rounded-[14px] border border-green-200 bg-green-50">
            <div className="flex items-center justify-between border-b border-green-200 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                <h3 className="text-[14px] font-extrabold text-text">
                  Getting Started
                </h3>
              </div>
              <button
                onClick={() => {
                  setOnboardingDismissed(true);
                  localStorage.setItem("admin-onboarding-dismissed", "true");
                }}
                className="flex h-6 w-6 items-center justify-center rounded-[7px] text-text-subtle transition-colors hover:bg-green-100 hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1 p-4">
              <Link
                href="/admin/courses"
                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-green-100/60"
              >
                <PlusCircle className="h-4 w-4 text-green-600" />
                Create your first course
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-green-100/60"
              >
                <UserPlus className="h-4 w-4 text-green-600" />
                Invite students
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-green-100/60"
              >
                <BarChart3 className="h-4 w-4 text-green-600" />
                View analytics
              </Link>
            </div>
          </div>
        )}

      {/* ── KPI strip ─────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Users"
          value={stats?.total_users || 0}
          icon={Users}
          color="green"
        />
        <KpiCard
          label="Courses"
          value={stats?.total_courses || 0}
          icon={BookOpen}
          color="green"
        />
        <KpiCard
          label="Enrollments"
          value={stats?.total_enrollments || 0}
          icon={GraduationCap}
          color="sun"
        />
        <KpiCard
          label="MRR"
          value="$0"
          icon={DollarSign}
          color="ink"
        />
      </div>

      {/* ── Invite students ───────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 rounded-[14px] border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-green-100">
            <LinkIcon className="h-4 w-4 text-green-700" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-text">Invite Students</p>
            <p className="font-mono text-[10px] text-text-muted">
              Share this link so students can join your school
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <code className="hidden rounded-[8px] bg-paper-2 px-3 py-1.5 font-mono text-[11px] text-text-muted shadow-sm sm:block">
            {inviteLink.length > 50
              ? inviteLink.slice(0, 50) + "..."
              : inviteLink}
          </code>
          <button
            onClick={copyInviteLink}
            className="flex h-8 items-center gap-1.5 rounded-[9px] border border-green-300 bg-paper-2 px-3 text-[12px] font-bold text-ink-700 transition-colors hover:bg-green-100"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Quick links ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <QuickLink
          href="/admin/users"
          icon={Users}
          label="Manage Users"
          iconColor="bg-green-100 text-green-700"
        />
        <QuickLink
          href="/admin/courses"
          icon={BookOpen}
          label="Manage Courses"
          iconColor="bg-green-100 text-green-700"
        />
        <QuickLink
          href="/admin/analytics"
          icon={BarChart3}
          label="View Analytics"
          iconColor="bg-sun-100 text-sun-700"
        />
      </div>
    </div>
  );
}
