"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Users,
  BookOpen,
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
import { toast } from "sonner";
import { OnboardingTour, startOnboardingTour } from "@/components/onboarding-tour";
import { useTranslation } from "@/lib/i18n/context";

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
  color: "green" | "sun" | "clay" | "ink";
}) {
  const iconStyles: Record<string, string> = {
    green: "bg-success-soft text-success-fg",
    sun: "bg-warning-soft text-warning-fg",
    clay: "bg-danger-soft text-danger-fg",
    ink: "bg-surface-2 text-text",
  };

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-3xs font-bold uppercase tracking-widest text-text-subtle">
          {label}
        </span>
        <div
          className={cn(
            "flex h-[22px] w-[22px] items-center justify-center rounded-xs",
            iconStyles[color],
          )}
        >
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <div className="text-xl font-extrabold leading-none tracking-tight text-text">
        {value}
        {suffix && (
          <small className="ml-1 font-mono text-sm font-semibold text-text-subtle">
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
      className="flex items-center justify-between rounded-md border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-sm",
            iconColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold text-text">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-text-subtle" />
    </Link>
  );
}

/** Who is slipping and what the journal is still missing (/journal/attention). */
type Attention = {
  students: { id: string; full_name: string; missed: number }[];
  unfilled: { session_id: string; session_date: string; course_title: string }[];
};

/** One line of the teacher's day, as /journal/today returns it. */
type TodayLesson = {
  slot_id: string;
  title: string;
  group_name: string | null;
  start_time: string;
  end_time: string;
  room_name: string | null;
  is_online: boolean;
};

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  // null while loading, [] when the day is genuinely empty — a refusal must
  // not be drawn as "nothing scheduled" (specs/061).
  const [today, setToday] = useState<TodayLesson[] | null>(null);
  // Groups nobody teaches — the one thing on this screen an administrator
  // can act on today. null means we could not ask, not "none" (specs/061).
  const [groupsNoTeacher, setGroupsNoTeacher] = useState<number | null>(null);
  const [attention, setAttention] = useState<Attention | null>(null);
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
    toast.success(t("admin.dashboard.inviteLinkCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (isTeacher) {
      apiClient
        .get("/admin/teacher-stats")
        .then(({ data }) => setTeacherStats(data))
        .catch(() => {});
      apiClient
        .get("/journal/today", { params: { teacher_id: user?.id } })
        .then(({ data }) => setToday(data.agenda ?? []))
        .catch(() => setToday([]));
      apiClient
        .get("/journal/attention")
        .then(({ data }) => setAttention(data))
        .catch(() => setAttention({ students: [], unfilled: [] }));
    } else {
      apiClient
        .get("/admin/dashboard")
        .then(({ data }) => setStats(data))
        .catch(() => {});
      apiClient
        .get("/journal/today")
        .then(({ data }) => setToday(data.agenda ?? []))
        .catch(() => setToday([]));
      apiClient
        .get("/admin/groups")
        .then(({ data }) =>
          setGroupsNoTeacher(
            (data || []).filter(
              (g: { teacher_id: string | null }) => !g.teacher_id,
            ).length,
          ),
        )
        .catch(() => setGroupsNoTeacher(null));
    }
  }, [isTeacher, user?.id]);

  /* ================================================================
     TEACHER DASHBOARD
     ================================================================ */
  if (isTeacher) {
    return (
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-7">
          <p className="mb-1 font-mono text-2xs font-bold uppercase tracking-widest text-success-fg">
            {t("admin.dashboard.teacherCrumb")}
          </p>
          <h1 className="text-xl font-extrabold tracking-tight text-text">
            {t("admin.dashboard.welcomeBack")}, {user?.full_name}
          </h1>
        </div>

        {/* Today. A teacher opens this page asking "where am I due", not
            "how do I set up a school" — the onboarding that used to sit here
            was written for the owner and its button led to a 403 (specs/061). */}
        <div className="mb-6 rounded-md border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Clock className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-extrabold text-text">
              {t("journal.today")}
            </h3>
          </div>
          <div className="divide-y divide-border">
            {today === null && (
              <div className="lms-skeleton m-4 h-10 rounded-xs" />
            )}
            {today?.length === 0 && (
              <p className="px-5 py-4 text-xs text-text-muted">
                {t("admin.dashboard.noLessonsToday")}
              </p>
            )}
            {today?.map((lesson) => (
              <Link
                key={lesson.slot_id}
                href="/admin/journal"
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted/50"
              >
                <span className="font-mono text-xs font-bold text-text">
                  {lesson.start_time}–{lesson.end_time}
                </span>
                <span className="flex-1 truncate text-sm text-text">
                  {lesson.group_name || lesson.title}
                </span>
                <span className="text-2xs text-text-subtle">
                  {lesson.is_online
                    ? t("journal.online")
                    : lesson.room_name || ""}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Who is slipping, and what the journal is still missing. Both were
            already in the data and nowhere on screen (specs/061). */}
        {attention &&
          (attention.students.length > 0 || attention.unfilled.length > 0) && (
            <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {attention.students.length > 0 && (
                <div className="rounded-md border border-border bg-surface">
                  <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                    <Users className="h-4 w-4 text-danger-fg" />
                    <h3 className="text-sm font-extrabold text-text">
                      {t("admin.dashboard.needsAttention")}
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {attention.students.map((s) => (
                      <Link
                        key={s.id}
                        href="/admin/journal"
                        className="flex items-center justify-between px-5 py-3 hover:bg-surface-muted/50"
                      >
                        <span className="truncate text-sm text-text">
                          {s.full_name}
                        </span>
                        <span className="ml-3 shrink-0 rounded-pill bg-danger-soft px-2 py-0.5 text-2xs font-bold text-danger-fg">
                          {t("admin.dashboard.missedClasses")}: {s.missed}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {attention.unfilled.length > 0 && (
                <div className="rounded-md border border-border bg-surface">
                  <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                    <ClipboardList className="h-4 w-4 text-clay-500" />
                    <h3 className="text-sm font-extrabold text-text">
                      {t("admin.dashboard.journalUnfilled")}
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {attention.unfilled.map((s) => (
                      <Link
                        key={s.session_id}
                        href="/admin/journal"
                        className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted/50"
                      >
                        <span className="font-mono text-2xs font-bold text-text-subtle">
                          {s.session_date}
                        </span>
                        <span className="flex-1 truncate text-sm text-text">
                          {s.course_title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* KPI strip */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("admin.dashboard.myCourses")}
            value={teacherStats?.my_courses || 0}
            icon={BookOpen}
            color="green"
          />
          <KpiCard
            label={t("admin.dashboard.myStudents")}
            value={teacherStats?.my_students || 0}
            icon={Users}
            color="green"
          />
          <KpiCard
            label={t("admin.dashboard.toReview")}
            value={teacherStats?.to_review || 0}
            icon={Inbox}
            color="clay"
          />
          <KpiCard
            label={t("admin.dashboard.avgScore")}
            value={teacherStats?.avg_score || 0}
            suffix="%"
            icon={TrendingUp}
            color="sun"
          />
        </div>

        {/* Quick Insights */}
        {teacherStats && (
          <div className="mb-6 rounded-md border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Sparkles className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-extrabold text-text">
                {t("admin.dashboard.quickInsights")}
              </h3>
            </div>
            <div className="space-y-2.5 p-5">
              {teacherStats.to_review > 0 && (
                <div className="flex items-start gap-3 rounded-sm bg-danger-soft p-3">
                  <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-danger-fg" />
                  <p className="text-sm text-text">
                    <span className="font-bold">{teacherStats.to_review}</span>{" "}
                    {teacherStats.to_review !== 1
                      ? t("admin.dashboard.submissionsWaiting")
                      : t("admin.dashboard.submissionWaiting")}{" "}
                    <Link
                      href="/admin/review"
                      className="font-bold text-danger-fg hover:underline"
                    >
                      {t("admin.dashboard.reviewNow")} →
                    </Link>
                  </p>
                </div>
              )}
              {teacherStats.my_students > 0 && teacherStats.avg_score > 0 && (
                <div className="flex items-start gap-3 rounded-sm bg-success-soft p-3">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-success-fg" />
                  <p className="text-sm text-text">
                    {t("admin.dashboard.avgScoreLine")}{" "}
                    <span className="font-bold">{teacherStats.avg_score}%</span>
                    .
                    {teacherStats.avg_score >= 80
                      ? ` ${t("admin.dashboard.greatJob")}`
                      : teacherStats.avg_score >= 60
                        ? ` ${t("admin.dashboard.considerReview")}`
                        : ` ${t("admin.dashboard.needExtraSupport")}`}
                  </p>
                </div>
              )}
              {teacherStats.my_courses === 0 && (
                <div className="flex items-start gap-3 rounded-sm bg-success-soft p-3">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-success-fg" />
                  <p className="text-sm text-text">
                    {t("admin.dashboard.noCoursesYet")}{" "}
                    <Link
                      href="/admin/courses"
                      className="font-bold text-success-fg hover:underline"
                    >
                      {t("admin.dashboard.createFirstCourse")} →
                    </Link>
                  </p>
                </div>
              )}
              {teacherStats.my_students === 0 &&
                teacherStats.my_courses > 0 && (
                  <div className="flex items-start gap-3 rounded-sm bg-surface-2 p-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                    <p className="text-sm text-text">
                      {t("admin.dashboard.noStudentsYet")}
                    </p>
                  </div>
                )}
              {teacherStats.to_review === 0 &&
                teacherStats.my_students > 0 && (
                  <div className="flex items-start gap-3 rounded-sm bg-success-soft p-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-fg" />
                    <p className="text-sm text-text">
                      {t("admin.dashboard.allCaughtUp")}
                    </p>
                  </div>
                )}
              {teacherStats.recent_submissions &&
                teacherStats.recent_submissions.length > 0 && (
                  <div className="flex items-start gap-3 rounded-sm bg-surface-2 p-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                    <p className="text-sm text-text">
                      {t("admin.dashboard.lastSubmissionFrom")}{" "}
                      <span className="font-bold">
                        {teacherStats.recent_submissions[0].student_name}
                      </span>{" "}
                      ·{" "}
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
            <div className="mb-6 rounded-md border border-border bg-surface">
              <div className="border-b border-border px-5 py-3.5">
                <h3 className="text-sm font-extrabold text-text">
                  {t("admin.dashboard.recentSubmissions")}
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
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xs",
                        sub.status === "graded"
                          ? "bg-success-soft text-success-fg"
                          : sub.status === "late"
                            ? "bg-danger-soft text-danger-fg"
                            : "bg-surface-2 text-text",
                      )}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text">
                        {sub.assignment_title}
                      </p>
                      <p className="font-mono text-3xs text-text-subtle">
                        {sub.student_name} ·{" "}
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    {sub.score != null ? (
                      <span className="rounded-pill bg-success-soft px-2.5 py-0.5 font-mono text-2xs font-bold text-success-fg">
                        {sub.score}
                      </span>
                    ) : (
                      <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 font-mono text-2xs font-bold text-text">
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
            label={t("admin.dashboard.browseTemplates")}
            iconColor="bg-success-soft text-success-fg"
          />
          <QuickLink
            href="/admin/courses"
            icon={BookOpen}
            label={t("admin.dashboard.myCourses")}
            iconColor="bg-success-soft text-success-fg"
          />
          <QuickLink
            href="/admin/assignments"
            icon={ClipboardList}
            label={t("admin.dashboard.assignmentsLink")}
            iconColor="bg-warning-soft text-warning-fg"
          />
          <QuickLink
            href="/admin/review"
            icon={Inbox}
            label={t("admin.dashboard.reviewQueueLink")}
            iconColor="bg-danger-soft text-danger-fg"
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
          <p className="mb-1.5 font-mono text-2xs font-bold uppercase tracking-widest text-success-fg">
            {t("admin.dashboard.adminCrumb")}
          </p>
          <h1 className="mb-2 text-xl font-extrabold tracking-tight text-text">
            {t("admin.dashboard.title")}
          </h1>
          <p className="max-w-md text-sm text-text-muted">
            {t("admin.dashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startOnboardingTour}
            title={t("admin.dashboard.tourTitle")}
            className="flex h-9 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-xs font-bold text-text-muted transition-colors hover:border-green-300 hover:text-text"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {t("admin.dashboard.tour")}
          </button>
          <Link
            href="/admin/users"
            className="flex h-9 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-xs font-bold text-text-muted transition-colors hover:border-green-300 hover:text-text"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("admin.dashboard.addUser")}
          </Link>
          <Link
            href="/admin/courses"
            className="btn-pop flex h-9 items-center gap-1.5 rounded-sm bg-primary px-4 text-xs font-bold text-primary-fg"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("admin.dashboard.newCourse")}
          </Link>
        </div>
      </div>

      {/* ── Onboarding card ───────────────────────────────────── */}
      {!onboardingDismissed &&
        stats &&
        (stats.total_courses === 0 || stats.total_users === 0) && (
          <div className="mb-6 rounded-md border border-green-200 bg-success-soft">
            <div className="flex items-center justify-between border-b border-green-200 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                <h3 className="text-sm font-extrabold text-text">
                  {t("admin.dashboard.gettingStarted")}
                </h3>
              </div>
              <button
                onClick={() => {
                  setOnboardingDismissed(true);
                  localStorage.setItem("admin-onboarding-dismissed", "true");
                }}
                className="flex h-6 w-6 items-center justify-center rounded-xs text-text-subtle transition-colors hover:bg-success-soft hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1 p-4">
              <Link
                href="/admin/courses"
                className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-success-soft/60"
              >
                <PlusCircle className="h-4 w-4 text-green-600" />
                {t("admin.dashboard.createFirstCourse")}
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-success-soft/60"
              >
                <UserPlus className="h-4 w-4 text-green-600" />
                {t("admin.dashboard.inviteStudents")}
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-success-soft/60"
              >
                <BarChart3 className="h-4 w-4 text-green-600" />
                {t("admin.dashboard.viewAnalytics")}
              </Link>
            </div>
          </div>
        )}

      {/* ── The day, and what needs a decision ────────────────────
          Four totals answered "how big is the school". These two answer
          "what do I do now" — the question an administrator opens the
          page with (specs/061). */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/admin/journal"
          className="rounded-md border border-border bg-surface p-5 transition-colors hover:bg-surface-muted/50"
        >
          <p className="eyebrow mb-1">{t("journal.today")}</p>
          <p className="text-xl font-extrabold tabular-nums text-text">
            {today === null ? "…" : today.length}
          </p>
        </Link>
        {groupsNoTeacher !== null && groupsNoTeacher > 0 && (
          <Link
            href="/admin/groups"
            className="rounded-md border border-clay-300 bg-surface p-5 transition-colors hover:bg-surface-muted/50"
          >
            <p className="eyebrow mb-1">{t("admin.dashboard.needsDecision")}</p>
            <p className="text-sm font-bold text-text">
              {t("admin.dashboard.groupsWithoutTeacher")}: {groupsNoTeacher}
            </p>
          </Link>
        )}
      </div>

      {/* ── KPI strip ─────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("admin.dashboard.totalUsers")}
          value={stats?.total_users || 0}
          icon={Users}
          color="green"
        />
        <KpiCard
          label={t("admin.dashboard.coursesKpi")}
          value={stats?.total_courses || 0}
          icon={BookOpen}
          color="green"
        />
        <KpiCard
          label={t("admin.dashboard.enrollments")}
          value={stats?.total_enrollments || 0}
          icon={BookOpen}
          color="sun"
        />
        <KpiCard
          label={t("common.mrr")}
          value="$0"
          icon={DollarSign}
          color="ink"
        />
      </div>

      {/* ── Invite students ───────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 rounded-md border border-green-200 bg-success-soft p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-success-soft">
            <LinkIcon className="h-4 w-4 text-success-fg" />
          </div>
          <div>
            <p className="text-sm font-bold text-text">{t("admin.dashboard.inviteStudentsTitle")}</p>
            <p className="font-mono text-3xs text-text-muted">
              {t("admin.dashboard.inviteStudentsHint")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <code className="hidden rounded-xs bg-surface px-3 py-1.5 font-mono text-2xs text-text-muted shadow-sm sm:block">
            {inviteLink.length > 50
              ? inviteLink.slice(0, 50) + "..."
              : inviteLink}
          </code>
          <button
            onClick={copyInviteLink}
            className="flex h-8 items-center gap-1.5 rounded-sm border border-green-300 bg-surface px-3 text-xs font-bold text-text transition-colors hover:bg-success-soft"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" /> {t("admin.dashboard.copied")}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> {t("admin.dashboard.copyLink")}
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
          label={t("admin.dashboard.manageUsers")}
          iconColor="bg-success-soft text-success-fg"
        />
        <QuickLink
          href="/admin/courses"
          icon={BookOpen}
          label={t("admin.dashboard.manageCourses")}
          iconColor="bg-success-soft text-success-fg"
        />
        <QuickLink
          href="/admin/analytics"
          icon={BarChart3}
          label={t("admin.dashboard.viewAnalyticsBtn")}
          iconColor="bg-warning-soft text-warning-fg"
        />
      </div>
    </div>
  );
}
