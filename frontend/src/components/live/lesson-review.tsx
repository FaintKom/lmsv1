"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";

import apiClient from "@/lib/api-client";

import { BoardView, type BoardViewHandle } from "@/components/live/board-view";
import type { LiveLesson } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";

interface ResultRow {
  exercise_id: string;
  title: string;
  students: { id: string; name: string; attempts: number; passed: boolean; score: number | null }[];
}

export function LessonReview({
  lesson,
  boardIds,
  teacherView = false,
}: {
  lesson: LiveLesson;
  boardIds: string[];
  /** class results are teacher-only — students see boards + timeline */
  teacherView?: boolean;
}) {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const [openBoard, setOpenBoard] = useState<string | null>(boardIds[0] ?? null);
  const handleRef = useRef<BoardViewHandle | null>(null);
  const scenes = (lesson.summary?.scenes ?? []) as {
    type: string;
    at: string;
    poll?: { question: string; options: string[]; counts: number[] };
  }[];
  const results = (lesson.summary?.results ?? []) as ResultRow[];
  // Student view: the server already trims `results` to the caller's own
  // rows, so this only picks the matching entry per exercise.
  const myResults = teacherView
    ? []
    : results
        .map((ex) => ({ ex, mine: ex.students.find((s) => s.id === userId) }))
        .filter((r): r is { ex: ResultRow; mine: ResultRow["students"][number] } => !!r.mine);

  return (
    <div className="p-8">
      <h1 className="mb-5 text-xl font-extrabold text-text">{t("live.review")}</h1>

      {/* The lesson's recordings live with the lesson's other leavings —
          boards, results, timeline — because this page is where people come
          for "what happened in that lesson" (FR-038). Pupils only receive
          rows a teacher deliberately shared; the server trims the list. */}
      <LessonRecordings lessonId={lesson.id} teacherView={teacherView} />

      {teacherView && results.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 font-mono text-xs font-bold uppercase tracking-wide text-text">
            {t("live.resultsTitle")}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {results.map((ex) => (
              <div key={ex.exercise_id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                <div className="mb-2 text-sm font-bold text-text">{ex.title}</div>
                {ex.students.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 py-0.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold text-text">
                      {s.name}
                    </span>
                    <span className="font-mono text-3xs uppercase tracking-wide text-text-subtle">
                      {s.attempts} {t("live.attempts")}
                    </span>
                    <span
                      className={`rounded-pill px-2 py-0.5 font-mono text-3xs font-bold ${
                        s.passed ? "bg-success-soft text-success-fg" : "bg-danger-soft text-danger-fg"
                      }`}
                    >
                      {s.score != null ? `${Math.round(s.score)}%` : s.passed ? "✓" : "✗"}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {!teacherView && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="eyebrow mb-3">{t("live.myResults")}</div>
          {myResults.length === 0 ? (
            <p className="text-sm text-text-muted">{t("live.noAttempted")}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {myResults.map(({ ex, mine }) => (
                <div key={ex.exercise_id} className="flex items-center gap-2 py-0.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-bold text-text">{ex.title}</span>
                  <span className="font-mono text-3xs uppercase tracking-wide text-text-subtle tabular-nums">
                    {t("live.attemptsN").replace("{n}", String(mine.attempts))}
                  </span>
                  <span
                    className={`rounded-pill px-2 py-0.5 font-mono text-3xs font-bold ${
                      mine.passed ? "bg-success-soft text-success-fg" : "bg-danger-soft text-danger-fg"
                    }`}
                  >
                    {mine.score != null ? `${Math.round(mine.score)}%` : mine.passed ? "✓" : "✗"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {boardIds.length > 0 && (
        <div className="mb-4 flex gap-2">
          {boardIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setOpenBoard(id)}
              className={`rounded-pill px-3.5 py-1.5 text-sm font-bold transition-colors ${
                openBoard === id
                  ? "bg-primary text-primary-fg"
                  : "border-2 border-border bg-surface text-text hover:border-green-300"
              }`}
            >
              {t("live.scene.board")} {i + 1}
            </button>
          ))}
        </div>
      )}
      {openBoard && (
        <div className="h-[60vh] overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <BoardView lessonId={lesson.id} boardId={openBoard} handleRef={handleRef} />
        </div>
      )}
      <div className="mt-6 rounded-lg border border-border bg-surface p-5">
        {scenes.map((s, i) => (
          <div key={i} className="flex items-baseline gap-3 py-1 text-sm text-text-muted">
            <span className="font-mono text-2xs tabular-nums text-text-subtle">
              {new Date(s.at).toLocaleTimeString()}
            </span>
            <span className="font-semibold text-text">
              {t(`live.scene.${s.type}` as never) || s.type}
            </span>
            {s.poll && (
              <span className="min-w-0 flex-1 truncate">
                {s.poll.question}
                {" — "}
                {s.poll.options
                  .map((opt, oi) => `${opt}: ${s.poll?.counts[oi] ?? 0}`)
                  .join(" · ")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonRecordings({
  lessonId,
  teacherView,
}: {
  lessonId: string;
  teacherView: boolean;
}) {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [watching, setWatching] = useState<string | null>(null);

  interface Row {
    id: string;
    download_url: string | null;
    duration_seconds: number | null;
    created_at: string | null;
    live_lesson_id: string | null;
    shared_with_group: boolean;
  }

  const { data } = useQuery({
    queryKey: ["recordings", lessonId],
    queryFn: () => apiClient.get("/recordings").then((r) => r.data as Row[]),
  });
  const rows = (data ?? []).filter((r) => r.live_lesson_id === lessonId && r.download_url);

  const share = useMutation({
    mutationFn: (r: Row) =>
      apiClient.patch(`/recordings/${r.id}`, { shared_with_group: !r.shared_with_group }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recordings", lessonId] }),
  });

  if (rows.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-2 font-mono text-xs font-bold uppercase tracking-wide text-text">
        {t("recordings.title")}
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-sm"
          >
            <span className="min-w-0 flex-1 text-sm font-semibold text-text">
              {r.created_at
                ? new Date(r.created_at).toLocaleString(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : t("recordings.title")}
              {r.duration_seconds ? (
                <span className="ml-2 font-mono text-2xs text-text-muted">
                  {Math.floor(r.duration_seconds / 60)}:
                  {String(r.duration_seconds % 60).padStart(2, "0")}
                </span>
              ) : null}
            </span>
            {teacherView && (
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
              onClick={() => setWatching(watching === r.id ? null : r.download_url && r.id)}
              className="btn-pop inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-bold text-primary-fg"
            >
              <Play size={13} aria-hidden />
              {t("recordings.watch")}
            </button>
          </div>
        ))}
        {watching && (
          <video
            controls
            autoPlay
            className="max-h-[60dvh] w-full rounded-lg bg-black"
            src={rows.find((r) => r.id === watching)?.download_url ?? undefined}
          />
        )}
      </div>
    </div>
  );
}
