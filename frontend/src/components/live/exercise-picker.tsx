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
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-2 font-medium">{t("live.pickExercise")}</div>
      {items.map((ex) => (
        <button
          key={ex.id}
          onClick={() => onPick(ex)}
          className="block w-full rounded-lg p-2 text-left text-sm hover:bg-paper-2"
        >
          {ex.title} <span className="text-xs text-text-subtle">({ex.exercise_type})</span>
        </button>
      ))}
    </div>
  );
}
