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
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">{t("live.review")}</h1>
      {boardIds.length > 0 && (
        <div className="mb-4 flex gap-2">
          {boardIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setOpenBoard(id)}
              className={`rounded-pill px-3 py-1 text-sm ${
                openBoard === id ? "bg-primary text-white" : "bg-surface-2"
              }`}
            >
              {t("live.scene.board")} {i + 1}
            </button>
          ))}
        </div>
      )}
      {openBoard && (
        <div className="h-[60vh] rounded-lg border border-border">
          <BoardView lessonId={lesson.id} boardId={openBoard} handleRef={handleRef} />
        </div>
      )}
      <div className="mt-6">
        {scenes.map((s, i) => (
          <div key={i} className="text-sm text-text-muted">
            {new Date(s.at).toLocaleTimeString()} —{" "}
            {t(`live.scene.${s.type}` as never) || s.type}
          </div>
        ))}
      </div>
    </div>
  );
}
