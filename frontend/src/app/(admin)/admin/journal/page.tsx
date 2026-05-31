"use client";

/**
 * Class journal — a day-centric register for a course.
 *
 * Teacher picks a course, then a day: the day view records whether a session
 * was held + its topic/notes (upsert), embeds the shared AttendanceMarker for
 * that (course, date), and shows a read-only "activity that day" table — what
 * each enrolled student completed/submitted on that date.
 *
 * Backend: /api/v1/journal/* (see src/lib/api/journal.ts). Attendance marking
 * reuses /api/v1/attendance/* via <AttendanceMarker/>.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpenCheck,
  CalendarClock,
  Download,
  Loader2,
  Save,
} from "lucide-react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceMarker } from "@/components/attendance/attendance-marker";
import {
  useJournalSessions,
  useJournalDay,
  useUpsertSession,
  useGenerateFromSchedule,
  exportJournalCsv,
  type DaySessionInfo,
} from "@/lib/api/journal";

interface CourseOption {
  id: string;
  title: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AdminJournalPage() {
  const { t } = useTranslation();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISO());

  useEffect(() => {
    apiClient
      .get<CourseOption[]>("/admin/courses")
      .then(({ data }) => setCourses(data))
      .catch(() => {});
  }, []);

  const sessionsQuery = useJournalSessions(courseId);
  const dayQuery = useJournalDay(courseId, selectedDate);
  const upsertMutation = useUpsertSession(courseId, selectedDate);
  const generateMutation = useGenerateFromSchedule(courseId);

  // Generate-from-schedule range (defaults: today .. today + 28 days).
  const [genFrom, setGenFrom] = useState(todayISO());
  const [genTo, setGenTo] = useState(isoPlusDays(28));

  const handleGenerate = () => {
    generateMutation.mutate(
      { course_id: courseId, from_date: genFrom, to_date: genTo },
      {
        onSuccess: (res) =>
          toast.success(
            res.created > 0
              ? t("journal.daysCreated").replace("{count}", String(res.created))
              : t("journal.noDaysCreated"),
          ),
        onError: () => toast.error(t("journal.generateRangeTooLong")),
      },
    );
  };

  // Export the register CSV over the same from/to range as generate.
  const [isExporting, setIsExporting] = useState(false);
  const handleExportCsv = async () => {
    if (!courseId) return;
    setIsExporting(true);
    try {
      const blob = await exportJournalCsv(courseId, genFrom, genTo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-${genFrom}_${genTo}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("journal.exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  // Session draft (held / topic / notes), hydrated from the day fetch using
  // the "adjust state during render" pattern (same as AttendanceMarker).
  const [held, setHeld] = useState(true);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const dayKey = `${courseId}|${selectedDate}|${dayQuery.dataUpdatedAt}`;
  if (courseId && dayQuery.data && hydratedKey !== dayKey) {
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
        session_date: selectedDate,
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

  const sessions = sessionsQuery.data?.sessions ?? [];
  const activity = dayQuery.data?.activity ?? [];
  const scheduledSlots = dayQuery.data?.scheduled_slots ?? [];
  const scheduledLabel = scheduledSlots
    .map(
      (s) =>
        `${s.start_time}–${s.end_time}${s.location ? ` · ${s.location}` : ""}`,
    )
    .join(" · ");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          {t("journal.adminTitle")}
        </h1>
        <p className="text-base text-text-muted">{t("journal.adminSubtitle")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          {t("journal.course")}
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="rounded-lg border border-border-strong px-3 py-2 text-sm"
          >
            <option value="">{t("journal.selectCourse")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          {t("journal.date")}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-border-strong px-3 py-2 text-sm"
          />
        </label>
      </div>

      {!courseId ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-subtle">
            {t("journal.pickCoursePrompt")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          {/* Day list */}
          <div className="space-y-2">
            {/* Generate days from the weekly schedule */}
            <Card>
              <CardContent className="space-y-2 p-3">
                <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-subtle">
                  <CalendarClock className="h-3.5 w-3.5 text-primary" />
                  {t("journal.generateFromSchedule")}
                </h2>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-[11px] text-text-muted">
                    {t("journal.from")}
                    <input
                      type="date"
                      value={genFrom}
                      onChange={(e) => setGenFrom(e.target.value)}
                      className="rounded-lg border border-border-strong px-2 py-1.5 text-xs text-text"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-text-muted">
                    {t("journal.to")}
                    <input
                      type="date"
                      value={genTo}
                      onChange={(e) => setGenTo(e.target.value)}
                      className="rounded-lg border border-border-strong px-2 py-1.5 text-xs text-text"
                    />
                  </label>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CalendarClock className="h-3.5 w-3.5" />
                  )}
                  {t("journal.generate")}
                </button>
                <button
                  onClick={handleExportCsv}
                  disabled={isExporting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-text hover:bg-ink-50 disabled:opacity-50"
                >
                  {isExporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {t("journal.exportCsv")}
                </button>
              </CardContent>
            </Card>

            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
              {t("journal.days")}
            </h2>
            {sessionsQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-text-subtle">{t("journal.noSessions")}</p>
            ) : (
              <ul className="space-y-1.5">
                {sessions.map((s) => {
                  const active = s.session_date === selectedDate;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setSelectedDate(s.session_date)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-ink-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text">
                            {s.session_date}
                          </span>
                          <span
                            className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${
                              s.held
                                ? "bg-success-soft text-success-fg"
                                : "bg-ink-100 text-text-muted"
                            }`}
                          >
                            {s.held ? t("journal.held") : t("journal.notHeld")}
                          </span>
                        </div>
                        {s.topic ? (
                          <p className="mt-0.5 truncate text-xs text-text-muted">
                            {s.topic}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-text-subtle">
                          {t("journal.presentLabel")}: {s.attendance.present}/
                          {s.attendance.total}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Day detail */}
          <div className="space-y-5">
            {/* Session */}
            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="text-sm font-semibold text-text">
                  {t("journal.sessionSection")} · {selectedDate}
                </h2>
                {scheduledLabel ? (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-text">
                    <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-semibold">
                        {t("journal.scheduled")}:
                      </span>{" "}
                      {scheduledLabel}
                    </span>
                  </div>
                ) : null}
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
                <div className="flex justify-end">
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
              </CardContent>
            </Card>

            {/* Attendance */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-text">
                {t("journal.attendanceSection")}
              </h2>
              <AttendanceMarker courseId={courseId} date={selectedDate} />
            </div>

            {/* Activity that day */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-text">
                {t("journal.activitySection")}
              </h2>
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
                  <CardContent className="p-4">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs text-text-subtle">
                          <th className="py-1 pr-3">{t("journal.student")}</th>
                          <th className="py-1 pr-3">
                            {t("journal.lessonsCompleted")}
                          </th>
                          <th className="py-1 pr-3 text-center">
                            {t("journal.exercises")}
                          </th>
                          <th className="py-1 pr-3 text-center">
                            {t("journal.quizzes")}
                          </th>
                          <th className="py-1 text-center">
                            {t("journal.assignments")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.map((row) => (
                          <tr
                            key={row.student_id}
                            className="border-t border-border align-top"
                          >
                            <td className="py-1.5 pr-3 font-medium text-text">
                              {row.student_name}
                            </td>
                            <td className="py-1.5 pr-3 text-text-muted">
                              {row.lessons_completed.length > 0
                                ? row.lessons_completed.join(", ")
                                : "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-center text-text-muted">
                              {row.exercises_done || "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-center text-text-muted">
                              {row.quizzes_done || "—"}
                            </td>
                            <td className="py-1.5 text-center text-text-muted">
                              {row.assignments_done || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
