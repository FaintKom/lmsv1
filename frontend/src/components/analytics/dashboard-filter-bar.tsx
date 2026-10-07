"use client";
/**
 * DashboardFilterBar — top-level filter row that writes to
 * `dashboard.filters` (range + course). Widgets read these as
 * defaults via DashboardCanvas (per-widget props still win).
 *
 * Persists via PATCH /admin/dashboards/{id} like layout changes.
 */
import { useTranslation } from "@/lib/i18n/context";
import { useAdminCourses, useUpdateDashboard } from "@/hooks/use-dashboards";
import type { DashboardFilters, DashboardResponse } from "@/lib/api/analytics";

interface Props {
  dashboard: DashboardResponse;
}

const RANGE_DAYS = [7, 14, 30, 90];

export function DashboardFilterBar({ dashboard }: Props) {
  const { t } = useTranslation();
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
      <div className="text-sm text-text-muted">
        {t("an.filters")}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">{t("an.range")}</span>
        <select
          value={filters.range ?? "30d"}
          onChange={(e) => patch({ range: e.target.value })}
          className="px-2 py-1 bg-surface border border-border rounded"
        >
          {RANGE_DAYS.map((n) => (
            <option key={n} value={`${n}d`}>
              {t("an.lastDays").replace("{n}", String(n))}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">{t("an.colCourse")}</span>
        <select
          value={filters.course_ids?.[0] ?? ""}
          onChange={(e) =>
            patch({
              course_ids: e.target.value ? [e.target.value] : [],
            })
          }
          className="px-2 py-1 bg-surface border border-border rounded max-w-[16rem]"
        >
          <option value="">{t("an.allCourses")}</option>
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
          {t("an.clear")}
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
