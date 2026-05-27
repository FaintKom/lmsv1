"use client";
/**
 * DashboardFilterBar — top-level filter row that writes to
 * `dashboard.filters` (range + course). Widgets read these as
 * defaults via DashboardCanvas (per-widget props still win).
 *
 * Persists via PATCH /admin/dashboards/{id} like layout changes.
 */
import { useAdminCourses, useUpdateDashboard } from "@/hooks/use-dashboards";
import type { DashboardFilters, DashboardResponse } from "@/lib/api/analytics";

interface Props {
  dashboard: DashboardResponse;
}

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export function DashboardFilterBar({ dashboard }: Props) {
  const update = useUpdateDashboard();
  const { data: courses } = useAdminCourses();
  const filters: DashboardFilters = dashboard.filters ?? {};

  const patch = (nextFilters: DashboardFilters) => {
    update.mutate({
      id: dashboard.id,
      body: { filters: { ...filters, ...nextFilters } },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-surface-2 border border-border rounded-md">
      <div className="text-xs uppercase tracking-wide text-text-muted">
        Filters:
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Range</span>
        <select
          value={filters.range ?? "30d"}
          onChange={(e) => patch({ range: e.target.value })}
          className="px-2 py-1 bg-paper-2 border border-border rounded"
        >
          {RANGE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Course</span>
        <select
          value={filters.course_ids?.[0] ?? ""}
          onChange={(e) =>
            patch({
              course_ids: e.target.value ? [e.target.value] : [],
            })
          }
          className="px-2 py-1 bg-paper-2 border border-border rounded max-w-[16rem]"
        >
          <option value="">— All courses —</option>
          {(courses ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>

      {filters.range || filters.course_ids?.length ? (
        <button
          type="button"
          onClick={() => patch({ range: undefined, course_ids: [] })}
          className="ml-auto text-xs text-text-muted hover:text-text underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

/** Parse "30d" → 30. Returns null on unknown shape. */
export function rangeToDays(range: string | undefined): number | null {
  if (!range) return null;
  const m = range.match(/^(\d+)d$/);
  return m ? Number(m[1]) : null;
}
