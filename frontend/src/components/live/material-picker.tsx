"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

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
interface CourseRow {
  id: string;
  title: string;
}

/**
 * Teacher picks a source course, then a lesson from it. Defaults to the
 * group's bound course when there is one, but any course can be chosen.
 * ponytail: shows all teacher-visible courses; a draft course's material
 * won't render for students (published-or-enrolled check server-side) —
 * add a status filter here if that bites.
 */
export function MaterialPicker({
  defaultCourseId,
  onPick,
}: {
  defaultCourseId: string | null;
  onPick: (courseId: string, lessonId: string) => void;
}) {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState<string | null>(defaultCourseId);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);

  useEffect(() => {
    if (courseId) return;
    let cancelled = false;
    void apiClient
      .get("/courses/")
      .then(({ data }) => {
        if (!cancelled) setCourses((data.items ?? []) as CourseRow[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setModules([]);
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

  if (!courseId) {
    return (
      <div className="h-full overflow-y-auto p-5">
        <div className="mb-3 font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
          {t("live.pickMaterial")}
        </div>
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => setCourseId(c.id)}
            className="block w-full rounded-md p-2 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-2"
          >
            {c.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
          {t("live.pickMaterial")}
        </div>
        <button
          onClick={() => setCourseId(null)}
          className="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-700 transition-colors hover:bg-ink-100"
        >
          <ChevronLeft size={11} strokeWidth={3} /> {t("common.back")}
        </button>
      </div>
      {modules.map((m) => (
        <div key={m.id} className="mb-4">
          <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
            {m.title}
          </div>
          {(m.lessons ?? []).map((l) => (
            <button
              key={l.id}
              onClick={() => onPick(courseId, l.id)}
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
