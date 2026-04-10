"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, FileText, X } from "lucide-react";
import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";

interface CourseResult {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
}

interface LessonResult {
  id: string;
  title: string;
  content_type: string;
  course_id: string;
  course_title: string;
}

interface SearchResults {
  courses: CourseResult[];
  lessons: LessonResult[];
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();
  const { t } = useTranslation();

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get("/courses/search/", { params: { q } });
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (type: "course" | "lesson", item: CourseResult | LessonResult) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    if (type === "course") {
      router.push(`/courses/${item.id}`);
    } else {
      const lesson = item as LessonResult;
      router.push(`/courses/${lesson.course_id}/lessons/${lesson.id}`);
    }
  };

  const hasResults = results && (results.courses.length > 0 || results.lessons.length > 0);
  const noResults = results && results.courses.length === 0 && results.lessons.length === 0;

  return (
    <div ref={containerRef} className="relative px-3">
      {/* Search trigger button */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:bg-white"
          aria-label="Search courses and lessons"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="flex-1 text-left">{t("search.placeholder") === "search.placeholder" ? "Search..." : t("search.placeholder")}</span>
          <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-500 sm:inline-block">
            Ctrl+K
          </kbd>
        </button>
      )}

      {/* Search input */}
      {open && (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-white px-3 py-2 shadow-sm ring-1 ring-green-100">
            <Search className="h-3.5 w-3.5 text-green-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={t("search.placeholder") === "search.placeholder" ? "Search courses and lessons..." : t("search.placeholder")}
              className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults(null);
                  inputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {(hasResults || noResults || loading) && (
            <div role="listbox" aria-label="Search results" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {loading && (
                <div className="px-3 py-4 text-center text-xs text-slate-500">
                  Searching...
                </div>
              )}

              {!loading && noResults && (
                <div className="px-3 py-4 text-center text-xs text-slate-500">
                  No results found
                </div>
              )}

              {!loading && hasResults && (
                <>
                  {results!.courses.length > 0 && (
                    <div>
                      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Courses
                      </p>
                      {results!.courses.map((course) => (
                        <button
                          key={course.id}
                          onClick={() => handleSelect("course", course)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-green-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-700">{course.title}</p>
                            {course.description && (
                              <p className="truncate text-xs text-slate-500">{course.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results!.lessons.length > 0 && (
                    <div>
                      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Lessons
                      </p>
                      {results!.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => handleSelect("lesson", lesson)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-700">{lesson.title}</p>
                            {lesson.course_title && (
                              <p className="truncate text-xs text-slate-500">
                                in {lesson.course_title}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
