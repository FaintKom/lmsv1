"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Play, Radio, Trash2, X } from "lucide-react";

import apiClient from "@/lib/api-client";
import { fetchLessons, type LiveLesson } from "@/lib/api/live";
import {
  deleteRecording,
  fetchRecordings,
  setRecordingShared,
  type Recording,
} from "@/lib/api/recordings";
import { useTranslation } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Every live lesson the school has run, each with the recordings it produced.
 *
 * Before this, a lesson could only be reached from the banner while it was
 * running, or from a button on the groups page. Once it ended it was gone —
 * there was no list anywhere. Recordings sat on a page of their own in one
 * flat pile, with nothing saying which lesson each came from, even though the
 * database has said so all along in Recording.live_lesson_id.
 */

const STAFF_ROLES = new Set(["teacher", "admin", "super_admin"]);

export interface LessonRow {
  lesson: LiveLesson;
  recordings: Recording[];
}

/**
 * Put each recording with its lesson, and keep the ones with nowhere to go.
 *
 * Two different recordings land in `others`: those made outside any lesson
 * (live_lesson_id is null, which the model's own comment calls out), and those
 * whose lesson is older than the fifty the server returns. Dropping either
 * would lose a file, and calling the group "no lesson" would be a lie about
 * the second — hence "other recordings".
 */
export function groupRecordings(
  lessons: LiveLesson[],
  recordings: Recording[],
): { rows: LessonRow[]; others: Recording[] } {
  const rows: LessonRow[] = lessons.map((lesson) => ({ lesson, recordings: [] }));
  const byId = new Map(rows.map((row) => [row.lesson.id, row]));
  const others: Recording[] = [];

  for (const recording of recordings) {
    const row = recording.live_lesson_id ? byId.get(recording.live_lesson_id) : undefined;
    if (row) row.recordings.push(recording);
    else others.push(recording);
  }

  return { rows, others };
}

function fmtLength(seconds: number | null): string {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "—";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function LessonList() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = !!role && STAFF_ROLES.has(role);
  // Teachers share; administrators dispose. The server refuses regardless —
  // this only decides whether to draw the button.
  const canDelete = role === "admin" || role === "super_admin";
  const [watching, setWatching] = useState<Recording | null>(null);

  const lessons = useQuery({ queryKey: ["live-lessons"], queryFn: fetchLessons });
  const recordings = useQuery({ queryKey: ["recordings"], queryFn: fetchRecordings });

  // Only staff may list groups, so only staff get a group's name. A pupil is
  // in the group; being told which one adds nothing they do not know.
  const groups = useQuery({
    queryKey: ["admin-groups"],
    queryFn: () =>
      apiClient.get<{ id: string; name: string }[]>("/admin/groups").then((r) => r.data),
    enabled: isStaff,
  });
  const groupName = (id: string) => groups.data?.find((g) => g.id === id)?.name;

  const share = useMutation({
    mutationFn: (r: Recording) => setRecordingShared(r.id, !r.shared_with_group),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recordings"] }),
  });

  const destroy = useMutation({
    mutationFn: (r: Recording) => deleteRecording(r.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recordings"] }),
  });

  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "—";

  if (lessons.isLoading || recordings.isLoading) {
    return <p className="text-sm text-text-muted">…</p>;
  }

  const { rows, others } = groupRecordings(lessons.data ?? [], recordings.data ?? []);

  const recordingRow = (r: Recording) => (
    <div
      key={r.id}
      className="flex items-center gap-3 border-t border-border bg-surface-2 px-4 py-2.5"
    >
      <Film className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-2xs text-text-muted">
          {fmtLength(r.duration_seconds)} · {fmtSize(r.size_bytes)}
          {r.status !== "ready" && ` · ${r.status}`}
        </div>
      </div>

      {isStaff && (
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-text">
          <input
            type="checkbox"
            checked={r.shared_with_group}
            disabled={share.isPending}
            onChange={() => share.mutate(r)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          {t("recordings.shared")}
        </label>
      )}

      <button
        onClick={() => setWatching(r)}
        disabled={!r.download_url}
        className="btn-pop inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-bold text-primary-fg disabled:opacity-40"
      >
        <Play size={13} aria-hidden />
        {t("recordings.watch")}
      </button>

      {canDelete && (
        <button
          onClick={() => {
            if (window.confirm(t("recordings.deleteConfirm"))) destroy.mutate(r);
          }}
          disabled={destroy.isPending}
          aria-label={t("recordings.delete")}
          className="btn-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-clay-700 hover:bg-danger-soft disabled:opacity-40 pointer-coarse:h-11 pointer-coarse:w-11"
        >
          <Trash2 size={14} aria-hidden />
        </button>
      )}
    </div>
  );

  return (
    <div>
      {rows.length === 0 && others.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-10 text-center">
          <Radio className="h-6 w-6 text-text-muted" aria-hidden />
          <p className="text-sm font-bold text-text">{t("live.list.empty")}</p>
          <p className="max-w-sm text-xs text-text-muted">
            {isStaff ? t("live.list.emptyHintStaff") : t("live.list.emptyHintStudent")}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border">
          {rows.map(({ lesson, recordings: own }) => (
            <div key={lesson.id} className="border-b border-border last:border-b-0">
              <div className="flex items-center gap-3 bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text">{when(lesson.created_at)}</span>
                    {lesson.status === "active" && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-primary-soft px-2 py-0.5 text-2xs font-bold text-success-fg">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-primary" />
                        {t("live.list.liveNow")}
                      </span>
                    )}
                  </div>
                  {isStaff && groupName(lesson.group_id) && (
                    <div className="font-mono text-2xs text-text-muted">
                      {groupName(lesson.group_id)}
                    </div>
                  )}
                </div>
                <Link
                  href={isStaff ? `/admin/live/${lesson.id}` : `/lesson/${lesson.id}`}
                  className="btn-pop shrink-0 rounded-sm border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text hover:bg-surface-2"
                >
                  {t("live.list.open")}
                </Link>
              </div>
              {own.map(recordingRow)}
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-bold text-text">
            {t("live.list.otherRecordings")}
          </h2>
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            {others.map(recordingRow)}
          </div>
        </>
      )}

      {/* The server returns the fifty most recent lessons and takes no argument
          to ask for more. Saying so beats a page that looks complete and is
          not. */}
      {rows.length >= 50 && <p className="mt-4 text-xs text-text-subtle">{t("live.list.cap")}</p>}

      {watching?.download_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
          onClick={() => setWatching(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-lg bg-surface shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-sm font-bold text-text">{when(watching.created_at)}</span>
              <button
                onClick={() => setWatching(null)}
                aria-label={t("common.close")}
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-2"
              >
                <X size={16} />
              </button>
            </div>
            {/* The browser player does the work: the server streams the file and
                range requests make seeking cheap. */}
            <video
              controls
              autoPlay
              className="max-h-[70dvh] w-full bg-black"
              src={watching.download_url}
            />
          </div>
        </div>
      )}
    </div>
  );
}
