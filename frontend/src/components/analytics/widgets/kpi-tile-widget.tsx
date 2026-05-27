"use client";
/**
 * KpiTileWidget — 4-up tile grid of KPIs with delta arrows.
 *
 * Reads /admin/analytics/v2/kpi-deltas?days=window. Window comes from
 * widget props (default 7d) so different tiles can show different
 * windows on the same dashboard.
 */
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { useKpiDeltas } from "@/hooks/use-dashboards";
import type { KpiDeltasResponse, KpiMetric } from "@/lib/api/analytics";

import type { WidgetProps } from "../widget-registry";

interface TileSpec {
  key: keyof KpiDeltasResponse["metrics"];
  label: string;
  formatter?: (n: number) => string;
}

const TILES: TileSpec[] = [
  { key: "submissions", label: "Submissions" },
  { key: "avg_score", label: "Avg score", formatter: (n) => n.toFixed(1) },
  { key: "active_students", label: "Active students" },
  { key: "new_enrollments", label: "New enrollments" },
];

export function KpiTileWidget({ props }: WidgetProps) {
  const days = (props?.days as number | undefined) ?? 7;
  const { data, isLoading, error } = useKpiDeltas(days);

  if (isLoading || !data) {
    return <div className="text-sm text-text-muted">Loading KPIs…</div>;
  }
  if (error) {
    return <div className="text-sm text-danger">{(error as Error).message}</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {TILES.map((t) => {
        const m = (data.metrics?.[t.key] as KpiMetric | undefined) ?? {
          current: 0,
          previous: 0,
          delta_pct: null,
        };
        const current = m.current ?? 0;
        return (
          <div
            key={t.key}
            className="bg-surface-2 rounded-md p-3 flex flex-col justify-between"
          >
            <div className="text-xs uppercase tracking-wide text-text-muted">
              {t.label}
            </div>
            <div className="text-2xl font-bold text-text mt-1">
              {t.formatter ? t.formatter(current) : current}
            </div>
            <DeltaPill metric={m} />
          </div>
        );
      })}
    </div>
  );
}

function DeltaPill({ metric }: { metric: KpiMetric }) {
  if (metric.delta_pct == null) {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-text-muted mt-1">
        <Minus className="w-3 h-3" />
        no baseline
      </div>
    );
  }
  const up = metric.delta_pct >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <div
      className={`inline-flex items-center gap-1 text-xs mt-1 ${
        up ? "text-success" : "text-danger"
      }`}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(metric.delta_pct).toFixed(1)}%
    </div>
  );
}
