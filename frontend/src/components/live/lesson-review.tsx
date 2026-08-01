"use client";

import { useRef, useState } from "react";

import { BoardView, type BoardViewHandle } from "@/components/live/board-view";
import type { LiveLesson } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

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
  const [openBoard, setOpenBoard] = useState<string | null>(boardIds[0] ?? null);
  const handleRef = useRef<BoardViewHandle | null>(null);
  const scenes = (lesson.summary?.scenes ?? []) as {
    type: string;
    at: string;
    poll?: { question: string; options: string[]; counts: number[] };
  }[];
  const results = (lesson.summary?.results ?? []) as ResultRow[];

  return (
    <div className="p-8">
      <h1 className="mb-5 text-xl font-extrabold text-text">{t("live.review")}</h1>

      {teacherView && results.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
            {t("live.resultsTitle")}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {results.map((ex) => (
              <div key={ex.exercise_id} className="rounded-lg border border-border bg-paper-2 p-4 shadow-sm">
                <div className="mb-2 text-sm font-bold text-text">{ex.title}</div>
                {ex.students.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 py-0.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold text-text">
                      {s.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-text-subtle">
                      {s.attempts} {t("live.attempts")}
                    </span>
                    <span
                      className={`rounded-pill px-2 py-0.5 font-mono text-[10px] font-bold ${
                        s.passed ? "bg-green-100 text-green-800" : "bg-coral-50 text-coral-700"
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
      {boardIds.length > 0 && (
        <div className="mb-4 flex gap-2">
          {boardIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setOpenBoard(id)}
              className={`rounded-pill px-3.5 py-1.5 text-sm font-bold transition-colors ${
                openBoard === id
                  ? "bg-primary text-white"
                  : "border-2 border-border bg-paper-2 text-text hover:border-green-300"
              }`}
            >
              {t("live.scene.board")} {i + 1}
            </button>
          ))}
        </div>
      )}
      {openBoard && (
        <div className="h-[60vh] overflow-hidden rounded-lg border border-border bg-paper-2 shadow-sm">
          <BoardView lessonId={lesson.id} boardId={openBoard} handleRef={handleRef} />
        </div>
      )}
      <div className="mt-6 rounded-lg border border-border bg-paper-2 p-5">
        {scenes.map((s, i) => (
          <div key={i} className="flex items-baseline gap-3 py-1 text-sm text-text-muted">
            <span className="font-mono text-[11px] tabular-nums text-text-subtle">
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
