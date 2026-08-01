"use client";

import { useEffect, useState } from "react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";

interface LessonRow {
  id: string;
  title: string;
}
interface ModuleRow {
  id: string;
  title: string;
  lessons?: LessonRow[];
}

export function MaterialPicker({
  courseId,
  onPick,
}: {
  courseId: string;
  onPick: (lessonId: string) => void;
}) {
  const { t } = useTranslation();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get(`/courses/${courseId}`)
      .then(({ data }) => {
        if (!cancelled) setModules((data.modules ?? []) as ModuleRow[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [courseId]);
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-3 font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
        {t("live.pickMaterial")}
      </div>
      {modules.map((m) => (
        <div key={m.id} className="mb-4">
          <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
            {m.title}
          </div>
          {(m.lessons ?? []).map((l) => (
            <button
              key={l.id}
              onClick={() => onPick(l.id)}
              className="block w-full rounded-md p-2 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-2"
            >
              {l.title}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
