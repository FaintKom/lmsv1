"use client";

/**
 * Session detail slide-over — high-fidelity reskin (design handoff §2).
 *
 * Fixed right panel (470px) over a dimmed backdrop. Records whether the session
 * was held (toggle pill) + its topic (upsert via POST /journal/sessions), marks
 * attendance inline with P/L/A/E segments (optimistic, batched via POST
 * /attendance), and shows the read-only "activity that day" rows (GET
 * /journal/day) each linking to the student's admin profile.
 *
 * Save batches both writes: POST /attendance (the marked roster) and POST
 * /journal/sessions (held + topic).
 */

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2, MapPin, Video, X, Zap } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  useMarkBulk,
  useRoster,
  type AttendanceStatus,
  type RosterRow,
} from "@/lib/api/attendance";
import {
  useJournalDay,
  useUpsertSession,
  type DaySessionInfo,
} from "@/lib/api/journal";
import { useCurriculum } from "@/lib/api/pacing";
import { ATT_ORDER, ATT_STATUS, countsPresent } from "@/lib/journal-status";

export interface SessionDetailProps {
  courseId: string;
  date: string;
  /** Header bits (already-known agenda context). */
  courseTitle: string;
  timeLabel?: string;
  roomLabel?: string | null;
  isOnline?: boolean;
  /** Optional group of this session — forwarded to the student day page. */
  groupId?: string | null;
  onClose: () => void;
}

export function SessionDetail({
  courseId,
  date,
  courseTitle,
  timeLabel,
  roomLabel,
  isOnline,
  groupId,
  onClose,
}: SessionDetailProps) {
  const { t } = useTranslation();

  const dayQuery = useJournalDay(courseId, date);
  const rosterQuery = useRoster(courseId, date);
  const upsertMutation = useUpsertSession(courseId, date);
  const markMutation = useMarkBulk(courseId, date);
  const curriculumQuery = useCurriculum(courseId);
  const topics = curriculumQuery.data?.topics ?? [];

  // Session draft (held / topic), hydrated from the day fetch via the React
  // "adjust state during render" pattern.
  const [held, setHeld] = useState(true);
  const [topic, setTopic] = useState("");
  const [actualTopicId, setActualTopicId] = useState("");
  const [plannedTopicId, setPlannedTopicId] = useState<string | null>(null);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const dayKey = `${courseId}|${date}|${dayQuery.dataUpdatedAt}`;
  if (dayQuery.data && hydratedKey !== dayKey) {
    const s: DaySessionInfo | null = dayQuery.data.session;
    setHeld(s ? s.held : true);
    setTopic(s ? s.topic : "");
    setActualTopicId(s?.actual_topic_id ?? "");
    setPlannedTopicId(s?.planned_topic_id ?? null);
    setHydratedKey(dayKey);
  }

  // "planned: X" hint shows when the snapshot plan differs from what was done.
  const plannedTopicTitle =
    plannedTopicId && plannedTopicId !== actualTopicId
      ? topics.find((tp) => tp.id === plannedTopicId)?.title ?? null
      : null;

  // Attendance draft: studentId -> status. Seeded from the roster (statuses
  // already saved for this day), same hydrate-during-render approach.
  const [att, setAtt] = useState<Record<string, AttendanceStatus | null>>({});
  const [rosterKey, setRosterKey] = useState<unknown>(null);
  if (rosterQuery.data && rosterKey !== rosterQuery.data) {
    const next: Record<string, AttendanceStatus | null> = {};
    for (const row of rosterQuery.data.roster) next[row.student_id] = row.status;
    setRosterKey(rosterQuery.data);
    setAtt(next);
  }

  const roster: RosterRow[] = rosterQuery.data?.roster ?? [];
  const presentCount = roster.filter((r) => countsPresent(att[r.student_id] ?? null)).length;

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setAtt((a) => ({ ...a, [studentId]: status }));

  const markAllPresent = () =>
    setAtt(() => {
      const next: Record<string, AttendanceStatus> = {};
      for (const row of roster) next[row.student_id] = "present";
      return next;
    });

  const saving = upsertMutation.isPending || markMutation.isPending;

  const handleSave = async () => {
    const records = roster
      .map((row) => {
        const status = att[row.student_id];
        if (!status) return null;
        return {
          student_id: row.student_id,
          course_id: courseId,
          session_date: date,
          status,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    try {
      await upsertMutation.mutateAsync({
        course_id: courseId,
        session_date: date,
        held,
        topic: topic.trim(),
        notes: null,
        actual_topic_id: actualTopicId || null,
        // Link to the agenda row's group so pacing reflects the mark live.
        group_id: groupId ?? null,
      });
      if (records.length > 0) await markMutation.mutateAsync(records);
      toast.success(t("journal.sessionSaved"));
      onClose();
    } catch {
      toast.error(t("journal.saveFailed"));
    }
  };

  const activity = dayQuery.data?.activity ?? [];

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink-900/35"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[470px] flex-col bg-paper font-sans shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-[22px] pb-3.5 pt-[18px]">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-ink-900">
              {courseTitle}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
              {timeLabel ? <span className="font-mono">{timeLabel}</span> : null}
              {timeLabel && (roomLabel || isOnline) ? <span>·</span> : null}
              {isOnline ? (
                <span className="inline-flex items-center gap-1 font-semibold text-info">
                  <Video className="h-3.5 w-3.5" /> {t("journal.online")}
                </span>
              ) : roomLabel ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {roomLabel}
                </span>
              ) : null}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("journal.close")}
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-ink-50 text-ink-500 transition-colors hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto px-[22px] py-4">
          {/* Held toggle */}
          <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-text">
            <button
              type="button"
              role="switch"
              aria-checked={held}
              aria-label={t("journal.sessionHeld")}
              onClick={() => setHeld((h) => !h)}
              className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-150 ${
                held ? "bg-green-600" : "bg-ink-200"
              }`}
            >
              <span
                className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all duration-150 ${
                  held ? "left-[18px]" : "left-0.5"
                }`}
              />
            </button>
            {t("journal.sessionHeld")}
          </label>

          {/* Topic */}
          <div className="mb-[18px]">
            <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              {t("journal.topic")}
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t("journal.topicPlaceholder")}
              maxLength={500}
              className="w-full rounded-[10px] border-[1.5px] border-ink-100 bg-surface px-3 py-2.5 text-sm text-ink-900"
            />
          </div>

          {/* Actual curriculum topic (drives pacing) */}
          {topics.length > 0 && (
            <div className="mb-[18px]">
              <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {t("journal.actualTopic")}
              </div>
              <select
                value={actualTopicId}
                onChange={(e) => setActualTopicId(e.target.value)}
                className="w-full rounded-[10px] border-[1.5px] border-ink-100 bg-surface px-3 py-2.5 text-sm text-ink-900"
              >
                <option value="">{t("journal.actualTopicNone")}</option>
                {topics.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {String(tp.position).padStart(2, "0")} · {tp.title}
                  </option>
                ))}
              </select>
              {plannedTopicTitle ? (
                <p className="mt-1.5 text-[11px] font-semibold text-sun-700">
                  {t("journal.plannedTopicHint")}: {plannedTopicTitle}
                </p>
              ) : null}
            </div>
          )}

          {/* Attendance */}
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-text">
                {t("journal.attendanceSection")}
              </span>
              <span className="text-xs font-semibold text-ink-400">
                {presentCount}/{roster.length}
              </span>
            </div>
            <button
              onClick={markAllPresent}
              disabled={roster.length === 0}
              className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-[11.5px] font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {t("attendance.markAllPresent")}
            </button>
          </div>

          {rosterQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : roster.length === 0 ? (
            <p className="mb-5 rounded-[10px] bg-ink-50 py-4 text-center text-xs text-ink-400">
              {t("attendance.noStudents")}
            </p>
          ) : (
            <div className="mb-5 flex flex-col gap-1">
              {roster.map((row) => {
                const current = att[row.student_id] ?? null;
                return (
                  <div
                    key={row.student_id}
                    className="flex items-center gap-2 py-1"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">
                      {row.student_name}
                    </span>
                    {ATT_ORDER.map((s) => {
                      const selected = current === s;
                      const token = ATT_STATUS[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(row.student_id, s)}
                          title={t(`attendance.statusValue.${s}`)}
                          aria-label={t(`attendance.statusValue.${s}`)}
                          aria-pressed={selected}
                          className={`h-7 w-[30px] rounded-md font-mono text-xs font-extrabold transition-colors ${
                            selected
                              ? token.cell
                              : "bg-surface text-ink-300 shadow-[inset_0_0_0_1.5px_var(--ink-100)] hover:text-ink-500"
                          }`}
                        >
                          {token.letter}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Activity that day */}
          <div className="mb-2.5 flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-sun-500" fill="currentColor" />
            <span className="text-sm font-extrabold text-text">
              {t("journal.activitySection")}
            </span>
          </div>
          {!held ? (
            <div className="rounded-[10px] bg-ink-50 p-4 text-center text-xs text-ink-400">
              {t("journal.activityNeedsHeld")}
            </div>
          ) : dayQuery.isLoading ? (
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
            <div className="flex flex-col gap-1.5">
              {activity.map((row) => {
                const exTotal =
                  row.exercises_done + row.quizzes_done + row.assignments_done;
                return (
                  <Link
                    key={row.student_id}
                    href={`/admin/journal/student/${row.student_id}?date=${date}${
                      groupId ? `&group=${groupId}` : ""
                    }`}
                    className="flex items-center gap-2.5 rounded-[10px] border border-ink-100 bg-surface px-2.5 py-2.5 transition-colors hover:border-primary"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-50 text-[11px] font-extrabold text-green-800">
                      {row.student_name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-text">
                      {row.student_name}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-ink-400">
                      {exTotal} {t("journal.exercisesShort")}
                      {row.lessons_completed.length
                        ? ` · ${row.lessons_completed.length} ${t("journal.lessonsShort")}`
                        : ""}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-ink-100 px-[22px] py-3.5">
          <button
            onClick={onClose}
            className="rounded-[11px] border border-ink-100 bg-surface px-[18px] py-2.5 text-[13px] font-bold text-ink-700 hover:bg-ink-50"
          >
            {t("journal.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-[11px] bg-green-600 px-[22px] py-2.5 text-[13px] font-bold text-white shadow-[0_4px_0_0_var(--green-700)] transition-transform hover:bg-green-700 active:translate-y-[2px] active:shadow-[0_2px_0_0_var(--green-700)] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("journal.saveSession")}
          </button>
        </div>
      </aside>
    </>
  );
}
