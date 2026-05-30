"use client";
/**
 * TaskPerformanceWidget — methodist/teacher table of per-task statistics
 * for a selected course. Reads /analytics/task-stats/courses/{course_id}
 * (Phase 2 endpoint; RBAC + org isolation enforced server-side).
 *
 * Config: `course_id` (required, course picker) + optional `title`.
 * In-widget: optional lesson filter (built from the returned rows) and
 * sortable column headers. A CSV export button serializes the visible
 * rows client-side and triggers a download — no extra endpoint needed.
 *
 * Caller: components/analytics/widget-registry.tsx.
 */
import { useMemo, useState } from "react";

import { useCourseTaskStats } from "@/hooks/use-dashboards";
import { useTranslation } from "@/lib/i18n/context";
import type { TaskStats } from "@/lib/api/analytics";

import type { WidgetProps } from "../widget-registry";

type SortKey =
  | "title"
  | "total_submissions"
  | "unique_students"
  | "pass_rate"
  | "avg_attempts"
  | "avg_time_spent_seconds"
  | "completion_rate";

const NUMERIC_KEYS: ReadonlySet<SortKey> = new Set([
  "total_submissions",
  "unique_students",
  "pass_rate",
  "avg_attempts",
  "avg_time_spent_seconds",
  "completion_rate",
]);

/** Seconds → "m:ss" (e.g. 95 → "1:35"). Null/NaN → em dash. */
function formatDuration(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(0)}%`;
}

function formatNumber(value: number | null, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

/** Quote a CSV cell per RFC 4180 (wrap + double embedded quotes). */
function csvCell(value: string | number | null): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function TaskPerformanceWidget({ props }: WidgetProps) {
  const { t } = useTranslation();
  const courseId = props?.course_id as string | undefined;
  const { data, isLoading, error } = useCourseTaskStats(courseId);

  const [lessonFilter, setLessonFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("pass_rate");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Distinct lessons present in the returned tasks (for the in-widget filter).
  const lessons = useMemo(() => {
    if (!data) return [] as string[];
    const seen = new Set<string>();
    for (const task of data.tasks) {
      if (task.lesson_id) seen.add(task.lesson_id);
    }
    return [...seen];
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [] as TaskStats[];
    const filtered = lessonFilter
      ? data.tasks.filter((task) => task.lesson_id === lessonFilter)
      : data.tasks;
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "title") {
        return sortAsc
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      const av = (a[sortKey] as number | null) ?? -1;
      const bv = (b[sortKey] as number | null) ?? -1;
      return sortAsc ? av - bv : bv - av;
    });
    return sorted;
  }, [data, lessonFilter, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      // Text defaults to A→Z; numbers default to high→low (more useful).
      setSortAsc(!NUMERIC_KEYS.has(key));
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const header = [
      t("analytics.taskPerf.col.task"),
      t("analytics.taskPerf.col.type"),
      t("analytics.taskPerf.col.submissions"),
      t("analytics.taskPerf.col.students"),
      t("analytics.taskPerf.col.passRate"),
      t("analytics.taskPerf.col.avgAttempts"),
      t("analytics.taskPerf.col.avgTime"),
      t("analytics.taskPerf.col.success"),
      t("analytics.taskPerf.col.fail"),
      t("analytics.taskPerf.col.completion"),
    ];
    const lines = [
      header.map(csvCell).join(","),
      ...rows.map((r) =>
        [
          csvCell(r.title),
          csvCell(r.task_type),
          csvCell(r.total_submissions),
          csvCell(r.unique_students),
          csvCell(r.pass_rate == null ? "" : Number(r.pass_rate).toFixed(1)),
          csvCell(r.avg_attempts == null ? "" : Number(r.avg_attempts).toFixed(2)),
          csvCell(formatDuration(r.avg_time_spent_seconds)),
          csvCell(r.success_count),
          csvCell(r.failure_count),
          csvCell(
            r.completion_rate == null
              ? ""
              : Number(r.completion_rate).toFixed(1),
          ),
        ].join(","),
      ),
    ];
    const csv = `﻿${lines.join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = data.course_title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url;
    a.download = `task-stats-${safeTitle || data.course_id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!courseId) {
    return (
      <div className="text-sm text-text-muted">
        {t("analytics.taskPerf.pickCourse")}
      </div>
    );
  }
  if (isLoading)
    return (
      <div className="text-sm text-text-muted">{t("analytics.loading")}</div>
    );
  if (error)
    return (
      <div className="text-sm text-danger">{(error as Error).message}</div>
    );
  if (!data || data.tasks.length === 0)
    return (
      <div className="text-sm text-text-muted">
        {t("analytics.taskPerf.empty")}
      </div>
    );

  const sortIndicator = (key: SortKey) =>
    key === sortKey ? (sortAsc ? " ▲" : " ▼") : "";

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-text-muted">
          {t("analytics.taskPerf.enrolled")}: {data.enrolled_students}
        </div>
        <div className="flex items-center gap-2">
          {lessons.length > 1 ? (
            <select
              value={lessonFilter}
              onChange={(e) => setLessonFilter(e.target.value)}
              className="rounded border border-border bg-surface-2 px-2 py-1 text-xs text-text"
              aria-label={t("analytics.taskPerf.filterLesson")}
            >
              <option value="">{t("analytics.taskPerf.allLessons")}</option>
              {lessons.map((lessonId) => {
                const label =
                  data.tasks.find((task) => task.lesson_id === lessonId)
                    ?.title ?? lessonId;
                return (
                  <option key={lessonId} value={lessonId}>
                    {label}
                  </option>
                );
              })}
            </select>
          ) : null}
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-text hover:bg-ink-100"
          >
            {t("analytics.taskPerf.exportCsv")}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-text-muted">
              <th className="pb-1">
                <button
                  type="button"
                  className="hover:text-text"
                  onClick={() => handleSort("title")}
                >
                  {t("analytics.taskPerf.col.task")}
                  {sortIndicator("title")}
                </button>
              </th>
              <th className="pb-1 text-right">
                <button
                  type="button"
                  className="hover:text-text"
                  onClick={() => handleSort("total_submissions")}
                >
                  {t("analytics.taskPerf.col.submissions")}
                  {sortIndicator("total_submissions")}
                </button>
              </th>
              <th className="pb-1 text-right">
                <button
                  type="button"
                  className="hover:text-text"
                  onClick={() => handleSort("unique_students")}
                >
                  {t("analytics.taskPerf.col.students")}
                  {sortIndicator("unique_students")}
                </button>
              </th>
              <th className="pb-1 text-right">
                <button
                  type="button"
                  className="hover:text-text"
                  onClick={() => handleSort("pass_rate")}
                >
                  {t("analytics.taskPerf.col.passRate")}
                  {sortIndicator("pass_rate")}
                </button>
              </th>
              <th className="pb-1 text-right">
                <button
                  type="button"
                  className="hover:text-text"
                  onClick={() => handleSort("avg_attempts")}
                >
                  {t("analytics.taskPerf.col.avgAttempts")}
                  {sortIndicator("avg_attempts")}
                </button>
              </th>
              <th className="pb-1 text-right">
                <button
                  type="button"
                  className="hover:text-text"
                  onClick={() => handleSort("avg_time_spent_seconds")}
                >
                  {t("analytics.taskPerf.col.avgTime")}
                  {sortIndicator("avg_time_spent_seconds")}
                </button>
              </th>
              <th className="pb-1 text-right">
                {t("analytics.taskPerf.col.successFail")}
              </th>
              <th className="pb-1 text-right">
                <button
                  type="button"
                  className="hover:text-text"
                  onClick={() => handleSort("completion_rate")}
                >
                  {t("analytics.taskPerf.col.completion")}
                  {sortIndicator("completion_rate")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.task_type}-${row.task_id}`}
                className="border-t border-border"
              >
                <td className="max-w-[14rem] truncate py-1.5">
                  <span className="block truncate" title={row.title}>
                    {row.title}
                  </span>
                  <span className="text-xs text-text-muted">
                    {t(`analytics.taskPerf.type.${row.task_type}`)}
                  </span>
                </td>
                <td className="py-1.5 text-right">{row.total_submissions}</td>
                <td className="py-1.5 text-right">{row.unique_students}</td>
                <td className="py-1.5 text-right">
                  {row.pass_rate == null ? (
                    "—"
                  ) : (
                    <span
                      className={
                        row.pass_rate < 50
                          ? "text-danger"
                          : row.pass_rate < 75
                            ? "text-warning"
                            : "text-success"
                      }
                    >
                      {formatPercent(row.pass_rate)}
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-right">
                  {formatNumber(row.avg_attempts)}
                </td>
                <td className="py-1.5 text-right">
                  {formatDuration(row.avg_time_spent_seconds)}
                </td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  <span className="text-success">{row.success_count}</span>
                  <span className="text-text-muted"> / </span>
                  <span className="text-danger">{row.failure_count}</span>
                </td>
                <td className="py-1.5 text-right">
                  {formatPercent(row.completion_rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
