"use client";

import { useEffect, useState } from "react";
import { Check, Radio } from "lucide-react";

import { exercisesApi } from "@/lib/api/exercises";
import { useTranslation } from "@/lib/i18n/context";

interface ExerciseRow {
  id: string;
  title: string;
  exercise_type: string;
}

export function ExercisePicker({
  lessonRowId,
  activeExerciseId,
  onPick,
}: {
  lessonRowId: string; // course lesson id
  activeExerciseId?: string | null; // exercise currently broadcast
  onPick: (ex: ExerciseRow) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ExerciseRow[]>([]);
  const [picked, setPicked] = useState<string | null>(null); // optimistic
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
      {items.map((ex) => {
        const isLive = ex.id === activeExerciseId;
        const isPicked = ex.id === picked && !isLive;
        return (
          <button
            key={ex.id}
            onClick={() => {
              setPicked(ex.id);
              onPick(ex);
            }}
            className={`mb-1 flex w-full items-center gap-2.5 rounded-md border-2 p-2.5 text-left text-sm transition duration-150 ${
              isLive || isPicked
                ? "border-primary bg-primary-soft font-bold text-success-fg"
                : "border-transparent font-semibold text-text hover:bg-surface-2 active:scale-[0.99]"
            }`}
          >
            <span
              className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-pill ${
                isLive || isPicked ? "bg-green-600" : "border-2 border-ink-200"
              }`}
            >
              {(isLive || isPicked) && <Check size={9} strokeWidth={4} className="text-white" />}
            </span>
            <span className="min-w-0 flex-1 truncate">{ex.title}</span>
            <span className="rounded-pill bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-700">
              {ex.exercise_type}
            </span>
            {isLive && (
              <Radio
                size={14}
                className="shrink-0 animate-pulse text-green-700"
                aria-label={t("live.scene.task")}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
