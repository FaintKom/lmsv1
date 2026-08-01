"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Radio, Search } from "lucide-react";

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
  description?: string;
  category?: string | null;
  status?: string;
}

// Spec §4.1: course covers are radial gradients, never photos. Hue by hash.
const COVERS = [
  "radial-gradient(circle at 75% 25%, var(--green-500), var(--green-800))",
  "radial-gradient(circle at 75% 25%, var(--green-600), var(--ink-900))",
  "radial-gradient(circle at 75% 25%, var(--coral-500), var(--coral-700))",
  "radial-gradient(circle at 75% 25%, var(--sun-400), var(--sun-700))",
];
function coverFor(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return COVERS[Math.abs(h) % COVERS.length];
}

/**
 * Two-step source picker: course → lesson. Defaults into the group's
 * bound course; BACK returns to the course grid. The lesson currently
 * broadcast (activeLessonId) is marked live; a click gives instant
 * selected feedback while the scene mutation runs.
 */
export function MaterialPicker({
  defaultCourseId,
  activeLessonId,
  onPick,
}: {
  defaultCourseId: string | null;
  activeLessonId: string | null;
  onPick: (courseId: string, lessonId: string) => void;
}) {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState<string | null>(defaultCourseId);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [course, setCourse] = useState<{ title: string; modules: ModuleRow[] } | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null); // optimistic

  useEffect(() => {
    if (courseId) return;
    let cancelled = false;
    setCourses(null);
    void apiClient
      .get("/courses/")
      .then(({ data }) => {
        if (!cancelled) setCourses((data.items ?? []) as CourseRow[]);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setCourse(null);
    void apiClient
      .get(`/courses/${courseId}`)
      .then(({ data }) => {
        if (!cancelled)
          setCourse({ title: data.title ?? "", modules: (data.modules ?? []) as ModuleRow[] });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const filtered = useMemo(() => {
    if (!courses) return null;
    const q = query.trim().toLowerCase();
    return q ? courses.filter((c) => c.title.toLowerCase().includes(q)) : courses;
  }, [courses, query]);

  // ---- step 1: course grid ----
  if (!courseId) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
            {t("live.pickMaterial")}
          </div>
          <label className="flex h-9 w-56 items-center gap-2 rounded-md border-2 border-border bg-paper-2 px-3 transition-colors focus-within:border-border-focus">
            <Search size={14} className="shrink-0 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("common.search")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-300"
            />
          </label>
        </div>
        {!filtered ? (
          <div className="text-sm text-text-subtle">{t("common.loading")}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setQuery("");
                  setCourseId(c.id);
                }}
                className="group flex items-center gap-3.5 rounded-lg border border-border bg-paper-2 p-3.5 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md active:translate-y-0"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-end justify-start rounded-md p-1.5"
                  style={{ background: coverFor(c.title) }}
                >
                  <span className="font-mono text-lg font-bold leading-none text-white/40">
                    {c.title.charAt(0).toUpperCase()}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-text">
                    {c.title}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    {c.category && (
                      <span className="font-mono text-[10px] uppercase tracking-wide text-text-subtle">
                        {c.category}
                      </span>
                    )}
                    {c.status && c.status !== "published" && (
                      <span className="rounded-pill bg-sun-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-sun-700">
                        {c.status}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-ink-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-green-700"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- step 2: lesson list ----
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setCourseId(null)}
          className="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-700 transition-colors hover:bg-ink-100"
        >
          <ChevronLeft size={11} strokeWidth={3} /> {t("common.back")}
        </button>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wide text-text-subtle">
            {t("live.pickMaterial")}
          </div>
          <div className="truncate text-sm font-extrabold text-text">
            {course?.title ?? t("common.loading")}
          </div>
        </div>
      </div>

      {course?.modules.map((m, mi) => (
        <div key={m.id} className="mb-5">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-sm bg-surface-2 font-mono text-[10px] font-bold text-ink-700">
              {mi + 1}
            </span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
              {m.title}
            </span>
            <span className="font-mono text-[10px] text-ink-300">
              {(m.lessons ?? []).length} {t("courses.lessons")}
            </span>
          </div>
          {(m.lessons ?? []).map((l) => {
            const isLive = l.id === activeLessonId;
            const isPicked = l.id === picked && !isLive;
            return (
              <button
                key={l.id}
                onClick={() => {
                  setPicked(l.id);
                  onPick(courseId, l.id);
                }}
                className={`mb-1 flex w-full items-center gap-2.5 rounded-md border-2 p-2.5 text-left text-sm transition-all duration-150 ${
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
                  {(isLive || isPicked) && (
                    <Check size={9} strokeWidth={4} className="text-white" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{l.title}</span>
                {isLive && (
                  <Radio
                    size={14}
                    className="shrink-0 animate-pulse text-green-700"
                    aria-label={t("live.scene.material")}
                  />
                )}
              </button>
            );
          })}
        </div>
      ))}
      {course && course.modules.every((m) => (m.lessons ?? []).length === 0) && (
        <div className="flex flex-col items-center gap-3 pt-10">
          <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-sun-100 text-sun-700">
            <BookOpen size={28} />
          </span>
          <span className="text-sm text-text-muted">—</span>
        </div>
      )}
    </div>
  );
}
