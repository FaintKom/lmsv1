"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Save } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  useMarkBulk,
  useRoster,
  type AttendanceStatus,
  type RosterRow,
} from "@/lib/api/attendance";

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

type Draft = Record<string, { status: AttendanceStatus | null; note: string }>;

interface AttendanceMarkerProps {
  courseId: string;
  date: string;
}

/**
 * Shared attendance marking grid for a (course, date).
 *
 * Prefills from the existing roster, lets the teacher pick a status + note per
 * student, and bulk-saves. Used by both the standalone Attendance page and the
 * Journal day-view so marking behavior stays identical in both places.
 */
export function AttendanceMarker({ courseId, date }: AttendanceMarkerProps) {
  const { t } = useTranslation();

  const [draft, setDraft] = useState<Draft>({});
  // Tracks the roster object we last seeded the draft from (React "adjust
  // state while rendering" pattern) so a fresh fetch re-hydrates the grid.
  const [hydratedData, setHydratedData] = useState<unknown>(null);

  const rosterQuery = useRoster(courseId, date);
  const markMutation = useMarkBulk(courseId, date);

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
          session_date: date,
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

  return (
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
  );
}
