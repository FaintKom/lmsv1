"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  Flame,
  Star,
  Trophy,
  GraduationCap,
} from "lucide-react";

import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import QuizSubmissionBreakdown from "@/components/assessments/quiz-submission-breakdown";
import type {
  RecentSubmission,
  StudentProfile,
  SubmissionSummary,
} from "@/lib/api/student-profile";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function fmtPct(value: number | null): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function fmtScore(value: number | null): string {
  return value == null ? "—" : `${value}`;
}

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default function StudentProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [review, setReview] = useState<{
    quizId: string;
    studentName: string;
  } | null>(null);

  const { data, isLoading, isError, error } = useQuery<StudentProfile>({
    queryKey: ["student-profile", studentId],
    queryFn: async () => {
      const resp = await apiClient.get<StudentProfile>(
        `/admin/students/${studentId}/profile`,
      );
      return resp.data;
    },
    enabled: !!studentId,
    retry: false,
  });

  const typeLabel = (type: string) => {
    switch (type) {
      case "exercise":
        return t("admin.studentProfile.exercises");
      case "quiz":
        return t("admin.studentProfile.quizzes");
      case "assignment":
        return t("admin.studentProfile.assignments");
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const msg =
      status === 404
        ? t("admin.studentProfile.notFound")
        : status === 403
          ? t("admin.studentProfile.forbidden")
          : t("admin.studentProfile.loadError");
    return (
      <div className="mx-auto max-w-6xl">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("admin.studentProfile.back")}
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-text-muted">{msg}</CardContent>
        </Card>
      </div>
    );
  }

  const { student, enrollments, submissions, recent_submissions, gamification, certificates } =
    data;

  const summaryRows: { key: string; label: string; s: SubmissionSummary }[] = [
    { key: "exercises", label: t("admin.studentProfile.exercises"), s: submissions.exercises },
    { key: "quizzes", label: t("admin.studentProfile.quizzes"), s: submissions.quizzes },
    { key: "assignments", label: t("admin.studentProfile.assignments"), s: submissions.assignments },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("admin.studentProfile.back")}
      </Button>

      {/* Header */}
      <Card className="mb-6 border-l-4 border-l-green-400">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-primary-soft text-xl font-bold text-success-fg">
              {student.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">{student.full_name}</h1>
              <p className="text-sm text-text-muted">{student.email}</p>
              <p className="mt-1 text-xs text-text-subtle">
                {t("admin.studentProfile.joined")}: {fmtDate(student.created_at)}
                {student.last_active_at
                  ? ` · ${t("admin.studentProfile.lastActive")}: ${fmtDate(student.last_active_at)}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-lg font-bold text-text">{gamification.total_xp}</div>
                <div className="text-[11px] text-text-subtle">
                  {t("admin.studentProfile.totalXp")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-lg font-bold text-text">{gamification.current_streak}</div>
                <div className="text-[11px] text-text-subtle">
                  {t("admin.studentProfile.currentStreak")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-lg font-bold text-text">{gamification.longest_streak}</div>
                <div className="text-[11px] text-text-subtle">
                  {t("admin.studentProfile.longestStreak")}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
            <Award className="h-5 w-5 text-primary" />
            {t("admin.studentProfile.badges")}
          </h2>
          {gamification.badges.length === 0 ? (
            <p className="text-sm text-text-muted">{t("admin.studentProfile.noBadges")}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {gamification.badges.map((b) => (
                <div
                  key={b.badge_id}
                  className="flex items-center gap-2 rounded-pill bg-paper-2 px-3 py-1.5 text-sm text-text"
                  title={fmtDate(b.earned_at)}
                >
                  <span aria-hidden>{b.icon || "⭐"}</span>
                  <span>{b.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollments & progress */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t("admin.studentProfile.enrollments")}
          </h2>
          {enrollments.length === 0 ? (
            <p className="text-sm text-text-muted">{t("admin.studentProfile.noEnrollments")}</p>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e) => {
                const pct = Math.round(e.progress_percent);
                return (
                  <div key={e.course_id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-text">{e.course_title}</span>
                      <span className="text-text-muted">
                        {e.completed_at
                          ? t("admin.studentProfile.completed")
                          : `${pct}% · ${t("admin.studentProfile.inProgress")}`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-pill bg-ink-100">
                      <div
                        className={`h-full rounded-pill ${e.completed_at ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions summary */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">
            {t("admin.studentProfile.submissionsSummary")}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-strong text-left text-text-muted">
                  <th className="px-2 py-2 font-medium">{t("admin.studentProfile.colType")}</th>
                  <th className="px-2 py-2 text-center font-medium">
                    {t("admin.studentProfile.totalLabel")}
                  </th>
                  <th className="px-2 py-2 text-center font-medium">
                    {t("admin.studentProfile.graded")}
                  </th>
                  <th className="px-2 py-2 text-center font-medium">
                    {t("admin.studentProfile.avgScore")}
                  </th>
                  <th className="px-2 py-2 text-center font-medium">
                    {t("admin.studentProfile.passRate")}
                  </th>
                  <th className="px-2 py-2 text-center font-medium">
                    {t("admin.studentProfile.avgAttempts")}
                  </th>
                  <th className="px-2 py-2 text-center font-medium">
                    {t("admin.studentProfile.avgTime")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(({ key, label, s }) => (
                  <tr key={key} className="border-b border-border">
                    <td className="px-2 py-2 font-medium text-text">{label}</td>
                    <td className="px-2 py-2 text-center text-text">{s.total}</td>
                    <td className="px-2 py-2 text-center text-text">{s.graded}</td>
                    <td className="px-2 py-2 text-center text-text">{fmtScore(s.avg_score)}</td>
                    <td className="px-2 py-2 text-center text-text">{fmtPct(s.pass_rate)}</td>
                    <td className="px-2 py-2 text-center text-text">
                      {s.avg_attempts == null ? "—" : s.avg_attempts}
                    </td>
                    <td className="px-2 py-2 text-center text-text">
                      {fmtDuration(s.avg_time_spent_seconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent submissions */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">
            {t("admin.studentProfile.recentSubmissions")}
          </h2>
          {recent_submissions.length === 0 ? (
            <p className="text-sm text-text-muted">{t("admin.studentProfile.noSubmissions")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-strong text-left text-text-muted">
                    <th className="px-2 py-2 font-medium">{t("admin.studentProfile.colTask")}</th>
                    <th className="px-2 py-2 font-medium">{t("admin.studentProfile.colType")}</th>
                    <th className="px-2 py-2 text-center font-medium">
                      {t("admin.studentProfile.colScore")}
                    </th>
                    <th className="px-2 py-2 text-center font-medium">
                      {t("admin.studentProfile.colPassed")}
                    </th>
                    <th className="px-2 py-2 text-center font-medium">
                      {t("admin.studentProfile.colAttempts")}
                    </th>
                    <th className="px-2 py-2 text-center font-medium">
                      {t("admin.studentProfile.colTime")}
                    </th>
                    <th className="px-2 py-2 text-center font-medium">
                      {t("admin.studentProfile.colDate")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent_submissions.map((r: RecentSubmission) => {
                    const reviewable = r.task_type === "quiz" && r.quiz_id && r.score != null;
                    return (
                      <tr key={r.submission_id} className="border-b border-border">
                        <td className="px-2 py-2 text-text">
                          {reviewable ? (
                            <button
                              type="button"
                              onClick={() =>
                                setReview({
                                  quizId: r.quiz_id!,
                                  studentName: student.full_name,
                                })
                              }
                              title={t("admin.studentProfile.viewAnswers")}
                              className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
                            >
                              {r.title}
                            </button>
                          ) : (
                            <span className="font-medium">{r.title}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-text-muted">{typeLabel(r.task_type)}</td>
                        <td className="px-2 py-2 text-center text-text">{fmtScore(r.score)}</td>
                        <td className="px-2 py-2 text-center">
                          {r.passed == null ? (
                            <span className="text-text-subtle">—</span>
                          ) : r.passed ? (
                            <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-success-fg">
                              {t("admin.studentProfile.passYes")}
                            </span>
                          ) : (
                            <span className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-fg">
                              {t("admin.studentProfile.passNo")}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center text-text">
                          {r.attempt_number ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-center text-text">
                          {fmtDuration(r.time_spent_seconds)}
                        </td>
                        <td className="px-2 py-2 text-center text-text-muted">
                          {fmtDate(r.submitted_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificates */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">
            {t("admin.studentProfile.certificates")}
          </h2>
          {certificates.length === 0 ? (
            <p className="text-sm text-text-muted">{t("admin.studentProfile.noCertificates")}</p>
          ) : (
            <ul className="space-y-2">
              {certificates.map((c) => (
                <li
                  key={c.course_id}
                  className="flex items-center justify-between rounded-lg bg-paper-2 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-text">{c.course_title}</span>
                  <span className="text-text-muted">
                    {t("admin.studentProfile.certNumber")} {c.certificate_number} ·{" "}
                    {t("admin.studentProfile.issued")} {fmtDate(c.issued_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {review && (
        <QuizSubmissionBreakdown
          quizId={review.quizId}
          studentId={studentId}
          studentName={review.studentName}
          onClose={() => setReview(null)}
        />
      )}
    </div>
  );
}
