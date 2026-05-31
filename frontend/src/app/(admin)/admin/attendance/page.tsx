"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, Loader2, Save } from "lucide-react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAttendanceSummary,
  useMarkBulk,
  useRoster,
  type AttendanceStatus,
  type RosterRow,
} from "@/lib/api/attendance";

interface CourseOption {
  id: string;
  title: string;
}

const STATUSES: AttendanceStatus[] = ["present", "late", "absent", "excused"];

// Token-backed colors: present=success, late=warning, absent=danger, excused=muted.
const STATUS_STYLES: Record<AttendanceStatus, { on: string; off: string }> = {
  present: {
    on: "bg-success text-white",
    off: "bg-success-soft text-success-fg hover:bg-success/20",
  },
  late: {
    on: "bg-warning text-ink-900",
    off: "bg-warning-soft text-warning-fg hover:bg-warning/20",
  },
  absent: {
    on: "bg-danger text-white",
    off: "bg-danger-soft text-danger-fg hover:bg-danger/20",
  },
  excused: {
    on: "bg-ink-400 text-white",
    off: "bg-ink-100 text-text-muted hover:bg-ink-200",
  },
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type Draft = Record<string, { status: AttendanceStatus | null; note: string }>;

export default function AdminAttendancePage() {
  const { t } = useTranslation();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [tab, setTab] = useState<"mark" | "summary">("mark");
  const [draft, setDraft] = useState<Draft>({});
  // Tracks the roster object we last seeded the draft from (React "adjust
  // state while rendering" pattern) so a fresh fetch re-hydrates the grid.
  const [hydratedData, setHydratedData] = useState<unknown>(null);

  useEffect(() => {
    apiClient
      .get<CourseOption[]>("/admin/courses")
      .then(({ data }) => setCourses(data))
      .catch(() => {});
  }, []);

  const rosterQuery = useRoster(courseId, sessionDate);
  const summaryQuery = useAttendanceSummary(tab === "summary" ? courseId : "");
  const markMutation = useMarkBulk(courseId, sessionDate);

  // Hydrate the editable draft whenever the roster (re)loads. Adjusting state
  // during render (rather than in an effect) is the React-recommended pattern
  // for deriving state from changing data without a cascading re-render.
  if (rosterQuery.data && hydratedData !== rosterQuery.data) {
    const next: Draft = {};
    for (const row of rosterQuery.data.roster) {
      next[row.student_id] = { status: row.status, note: row.note ?? "" };
    }
    setHydratedData(rosterQuery.data);
    setDraft(next);
  }

  const roster: RosterRow[] = rosterQuery.data?.roster ?? [];

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setDraft((d) => ({
      ...d,
      [studentId]: { status, note: d[studentId]?.note ?? "" },
    }));

  const setNote = (studentId: string, note: string) =>
    setDraft((d) => ({
      ...d,
      [studentId]: { status: d[studentId]?.status ?? null, note },
    }));

  const markAllPresent = () =>
    setDraft((d) => {
      const next: Draft = { ...d };
      for (const row of roster) {
        next[row.student_id] = {
          status: "present",
          note: next[row.student_id]?.note ?? "",
        };
      }
      return next;
    });

  const handleSave = () => {
    const records = roster
      .map((row) => {
        const entry = draft[row.student_id];
        if (!entry?.status) return null;
        return {
          student_id: row.student_id,
          course_id: courseId,
          session_date: sessionDate,
          status: entry.status,
          note: entry.note?.trim() || null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (records.length === 0) {
      toast.error(t("attendance.nothingToSave"));
      return;
    }

    markMutation.mutate(records, {
      onSuccess: (res) =>
        toast.success(
          `${t("attendance.saved")} (${t("attendance.createdLabel")}: ${res.created}, ${t("attendance.updatedLabel")}: ${res.updated})`,
        ),
      onError: () => toast.error(t("attendance.saveFailed")),
    });
  };

  const summaryRows = useMemo(() => {
    const data = summaryQuery.data?.summary ?? {};
    return Object.entries(data)
      .map(([studentId, counts]) => ({ studentId, ...counts }))
      .sort((a, b) => a.student_name.localeCompare(b.student_name));
  }, [summaryQuery.data]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <CalendarCheck className="h-6 w-6 text-primary" />
          {t("attendance.adminTitle")}
        </h1>
        <p className="text-base text-text-muted">
          {t("attendance.adminSubtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          {t("attendance.course")}
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="rounded-lg border border-border-strong px-3 py-2 text-sm"
          >
            <option value="">{t("attendance.selectCourse")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          {t("attendance.date")}
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="rounded-lg border border-border-strong px-3 py-2 text-sm"
          />
        </label>
      </div>

      {courseId && (
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("mark")}
            className={
              tab === "mark"
                ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                : "px-3 py-2 text-sm font-medium text-text-muted hover:text-text"
            }
          >
            {t("attendance.markTab")}
          </button>
          <button
            onClick={() => setTab("summary")}
            className={
              tab === "summary"
                ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                : "px-3 py-2 text-sm font-medium text-text-muted hover:text-text"
            }
          >
            {t("attendance.summaryTab")}
          </button>
        </div>
      )}

      {!courseId && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-subtle">
            {t("attendance.pickCoursePrompt")}
          </CardContent>
        </Card>
      )}

      {courseId && tab === "mark" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={markAllPresent}
              disabled={roster.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-success-soft px-3 py-1.5 text-sm font-medium text-success-fg hover:bg-success/20 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("attendance.markAllPresent")}
            </button>
            <button
              onClick={handleSave}
              disabled={markMutation.isPending || roster.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {markMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("attendance.save")}
            </button>
          </div>

          {rosterQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : roster.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-text-subtle">
                {t("attendance.noStudents")}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-3 p-4">
                {roster.map((row) => {
                  const entry = draft[row.student_id];
                  return (
                    <div
                      key={row.student_id}
                      className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <span className="min-w-[10rem] flex-1 text-sm font-medium text-text">
                        {row.student_name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map((s) => {
                          const active = entry?.status === s;
                          const style = STATUS_STYLES[s];
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setStatus(row.student_id, s)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                active ? style.on : style.off
                              }`}
                            >
                              {t(`attendance.statusValue.${s}`)}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        value={entry?.note ?? ""}
                        onChange={(e) => setNote(row.student_id, e.target.value)}
                        placeholder={t("attendance.notePlaceholder")}
                        className="min-w-[8rem] flex-1 rounded-lg border border-border-strong px-3 py-1.5 text-xs"
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {courseId && tab === "summary" && (
        <div>
          {summaryQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : summaryRows.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-text-subtle">
                {t("attendance.noRecords")}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-text-subtle">
                      <th className="py-1 pr-3">{t("attendance.student")}</th>
                      <th className="py-1 pr-3 text-success-fg">
                        {t("attendance.statusValue.present")}
                      </th>
                      <th className="py-1 pr-3 text-warning-fg">
                        {t("attendance.statusValue.late")}
                      </th>
                      <th className="py-1 pr-3 text-danger-fg">
                        {t("attendance.statusValue.absent")}
                      </th>
                      <th className="py-1 pr-3 text-text-muted">
                        {t("attendance.statusValue.excused")}
                      </th>
                      <th className="py-1">{t("attendance.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row) => (
                      <tr
                        key={row.studentId}
                        className="border-t border-border"
                      >
                        <td className="py-1.5 pr-3 text-text">
                          {row.student_name}
                        </td>
                        <td className="py-1.5 pr-3 text-text-muted">
                          {row.present}
                        </td>
                        <td className="py-1.5 pr-3 text-text-muted">
                          {row.late}
                        </td>
                        <td className="py-1.5 pr-3 text-text-muted">
                          {row.absent}
                        </td>
                        <td className="py-1.5 pr-3 text-text-muted">
                          {row.excused}
                        </td>
                        <td className="py-1.5 font-medium text-text">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
