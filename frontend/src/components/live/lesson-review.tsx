"use client";

import { useRef, useState } from "react";

import { BoardView, type BoardViewHandle } from "@/components/live/board-view";
import type { LiveLesson } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function LessonReview({ lesson, boardIds }: { lesson: LiveLesson; boardIds: string[] }) {
  const { t } = useTranslation();
  const [openBoard, setOpenBoard] = useState<string | null>(boardIds[0] ?? null);
  const handleRef = useRef<BoardViewHandle | null>(null);
  const scenes = (lesson.summary?.scenes ?? []) as { type: string; at: string }[];

  return (
    <div className="p-8">
      <h1 className="mb-5 text-xl font-extrabold text-text">{t("live.review")}</h1>
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
          </div>
        ))}
      </div>
    </div>
  );
}
