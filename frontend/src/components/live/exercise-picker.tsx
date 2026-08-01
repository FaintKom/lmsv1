"use client";

import { useEffect, useState } from "react";

import { exercisesApi } from "@/lib/api/exercises";
import { useTranslation } from "@/lib/i18n/context";

interface ExerciseRow {
  id: string;
  title: string;
  exercise_type: string;
}

export function ExercisePicker({
  lessonRowId,
  onPick,
}: {
  lessonRowId: string; // course lesson id
  onPick: (ex: ExerciseRow) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ExerciseRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void exercisesApi
      .getByLesson(lessonRowId)
      .then((resp) => {
        if (!cancelled) setItems((resp.data ?? []) as unknown as ExerciseRow[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lessonRowId]);
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-3 font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
        {t("live.pickExercise")}
      </div>
      {items.map((ex) => (
        <button
          key={ex.id}
          onClick={() => onPick(ex)}
          className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-2"
        >
          <span className="min-w-0 flex-1 truncate">{ex.title}</span>
          <span className="rounded-pill bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-700">
            {ex.exercise_type}
          </span>
        </button>
      ))}
    </div>
  );
}
