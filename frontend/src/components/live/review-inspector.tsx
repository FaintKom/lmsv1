"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

import apiClient from "@/lib/api-client";
import { fetchDraft, type Draft, type ProgressRow, type RosterMember } from "@/lib/api/live";
import { AnswerList, SceneSkeleton } from "@/components/live/scene-view";
import { useTranslation } from "@/lib/i18n/context";

interface ExerciseInfo {
  title?: string;
  exercise_type?: string;
  config?: Record<string, unknown>;
}

const REFRESH_MS = 5000;

/**
 * Teacher-only review of the current task: exercise context on top,
 * every student's latest answers below. Nothing here is broadcast —
 * showing work to the class goes through the task scene, not this rail.
 */
export function ReviewInspector({
  exerciseId,
  members,
  progress,
}: {
  exerciseId: string;
  members: RosterMember[];
  progress?: ProgressRow[];
}) {
  const { t } = useTranslation();
  const [exercise, setExercise] = useState<ExerciseInfo | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft | null>>({});

  useEffect(() => {
    let cancelled = false;
    setExercise(null);
    void apiClient
      .get(`/exercises/${exerciseId}`)
      .then(({ data }) => {
        if (!cancelled) setExercise(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  useEffect(() => {
    let stop = false;
    setDrafts({});
    const tick = async () => {
      const entries = await Promise.all(
        members.map(async (m) => [m.id, await fetchDraft(exerciseId, m.id).catch(() => null)]),
      );
      if (!stop) {
        setDrafts((prev) => {
          const next = { ...prev };
          for (const [id, d] of entries as [string, Draft | null][]) {
            if (d) next[id] = d; // 304/404 keep the previous snapshot
          }
          return next;
        });
      }
    };
    void tick();
    const iv = setInterval(() => void tick(), REFRESH_MS);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [exerciseId, members]);

  const progressById = new Map((progress ?? []).map((r) => [r.id, r]));
  const context =
    (exercise?.config?.statement as string | undefined) ||
    (exercise?.config?.text as string | undefined) ||
    null;

  if (!exercise) return <SceneSkeleton />;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-1 flex items-center gap-3">
        <h2 className="text-xl font-extrabold text-text">{exercise?.title ?? ""}</h2>
        {exercise?.exercise_type && (
          <span className="rounded-pill bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-700">
            {exercise.exercise_type}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-pill bg-sun-100 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-sun-700">
          <Eye size={11} /> {t("live.teacherOnly")}
        </span>
      </div>
      {context && <p className="mb-5 max-w-[720px] text-sm text-text-muted">{context}</p>}

      {members.length === 0 && (
        <div className="pt-8 text-center text-sm text-text-subtle">—</div>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {members.map((m) => {
          const row = progressById.get(m.id);
          const draft = drafts[m.id];
          return (
            <div key={m.id} className="rounded-lg border border-border bg-paper-2 p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-pill ${m.online ? "bg-primary" : "bg-ink-200"}`}
                />
                <span className="text-sm font-bold text-text">{m.name}</span>
                {row && (
                  <span
                    className={`ml-auto rounded-pill px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      row.passed
                        ? "bg-green-100 text-green-800"
                        : row.submitted
                          ? "bg-clay-50 text-clay-700"
                          : "bg-ink-100 text-ink-700"
                    }`}
                  >
                    {row.attempts} {t("live.attempts")}
                  </span>
                )}
              </div>
              {draft?.source_code ? (
                <pre className="max-h-48 overflow-auto rounded-md bg-ink-900 p-3 font-mono text-xs text-paper">
                  {draft.source_code}
                </pre>
              ) : draft?.answers ? (
                <AnswerList answers={draft.answers} />
              ) : (
                <div className="text-sm text-text-subtle">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
