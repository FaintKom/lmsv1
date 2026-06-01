"use client";

/**
 * Session detail slide-over — the shared "open a session" panel used by the
 * unified Journal module (from the Today agenda, and later the Register matrix).
 *
 * It records whether the session was held + its topic/notes (upsert via
 * POST /journal/sessions), embeds the shared <AttendanceMarker/> for marking,
 * and shows the read-only "activity that day" table (GET /journal/day) with
 * each student name linking to their admin profile.
 */

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Save, X } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceMarker } from "@/components/attendance/attendance-marker";
import {
  useJournalDay,
  useUpsertSession,
  type DaySessionInfo,
} from "@/lib/api/journal";

export interface SessionDetailProps {
  courseId: string;
  date: string;
  /** Header bits (already-known agenda context). */
  courseTitle: string;
  timeLabel?: string;
  roomLabel?: string | null;
  isOnline?: boolean;
  onClose: () => void;
}

export function SessionDetail({
  courseId,
  date,
  courseTitle,
  timeLabel,
  roomLabel,
  isOnline,
  onClose,
}: SessionDetailProps) {
  const { t } = useTranslation();

  const dayQuery = useJournalDay(courseId, date);
  const upsertMutation = useUpsertSession(courseId, date);

  // Session draft (held / topic / notes), hydrated from the day fetch using
  // the "adjust state during render" pattern (same as AttendanceMarker).
  const [held, setHeld] = useState(true);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const dayKey = `${courseId}|${date}|${dayQuery.dataUpdatedAt}`;
  if (dayQuery.data && hydratedKey !== dayKey) {
    const s: DaySessionInfo | null = dayQuery.data.session;
    setHeld(s ? s.held : true);
    setTopic(s ? s.topic : "");
    setNotes(s ? (s.notes ?? "") : "");
    setHydratedKey(dayKey);
  }

  const handleSaveSession = () => {
    upsertMutation.mutate(
      {
        course_id: courseId,
        session_date: date,
        held,
        topic: topic.trim(),
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => toast.success(t("journal.sessionSaved")),
        onError: () => toast.error(t("journal.saveFailed")),
      },
    );
  };

  const activity = dayQuery.data?.activity ?? [];

  const headerMeta = [timeLabel, isOnline ? t("journal.online") : roomLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[460px] flex-col overflow-y-auto bg-surface p-5 shadow-2xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-text">
            {courseTitle} · {date}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("journal.close")}
            className="text-text-subtle transition-colors hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {headerMeta ? (
          <p className="mb-3 text-xs text-text-muted">{headerMeta}</p>
        ) : null}

        {/* Session held / topic / notes */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={held}
              onChange={(e) => setHeld(e.target.checked)}
              className="h-4 w-4"
            />
            {t("journal.sessionHeld")}
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            {t("journal.topic")}
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t("journal.topicPlaceholder")}
              maxLength={500}
              className="rounded-lg border border-border-strong px-3 py-2 text-sm text-text"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            {t("journal.notes")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("journal.notesPlaceholder")}
              rows={2}
              className="rounded-lg border border-border-strong px-3 py-2 text-sm text-text"
            />
          </label>
        </div>

        {/* Attendance */}
        <h3 className="mb-2 mt-5 text-sm font-semibold text-text">
          {t("journal.attendanceSection")}
        </h3>
        <AttendanceMarker courseId={courseId} date={date} />

        {/* Activity that day */}
        <h3 className="mb-2 mt-5 text-sm font-semibold text-text">
          {t("journal.activitySection")}
        </h3>
        {dayQuery.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : activity.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-text-subtle">
              {t("journal.noActivity")}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-1.5 p-3 text-xs">
              {activity.map((row) => {
                const counts = [
                  row.lessons_completed.length
                    ? `${row.lessons_completed.length} ${t("journal.lessonsShort")}`
                    : null,
                  row.exercises_done
                    ? `${row.exercises_done} ${t("journal.exercisesShort")}`
                    : null,
                  row.quizzes_done
                    ? `${row.quizzes_done} ${t("journal.quizzesShort")}`
                    : null,
                  row.assignments_done
                    ? `${row.assignments_done} ${t("journal.assignmentsShort")}`
                    : null,
                ].filter(Boolean);
                return (
                  <div
                    key={row.student_id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/admin/students/${row.student_id}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {row.student_name}
                    </Link>
                    <span className="text-text-muted">
                      {counts.length > 0 ? counts.join(" · ") : "—"}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-ink-50"
          >
            {t("journal.cancel")}
          </button>
          <button
            onClick={handleSaveSession}
            disabled={upsertMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("journal.saveSession")}
          </button>
        </div>
      </aside>
    </>
  );
}
