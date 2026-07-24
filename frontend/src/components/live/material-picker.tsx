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
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-2 font-medium">{t("live.pickMaterial")}</div>
      {modules.map((m) => (
        <div key={m.id} className="mb-3">
          <div className="mb-1 text-sm text-text-muted">{m.title}</div>
          {(m.lessons ?? []).map((l) => (
            <button
              key={l.id}
              onClick={() => onPick(l.id)}
              className="block w-full rounded-lg p-2 text-left text-sm hover:bg-paper-2"
            >
              {l.title}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
