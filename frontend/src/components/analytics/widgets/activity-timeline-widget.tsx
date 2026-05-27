"use client";
/**
 * ActivityTimelineWidget — line chart of daily submissions + active
 * students over a configurable window (default 30 days).
 *
 * Reads /admin/analytics/v2/activity-timeline?days=N. Recharts handles
 * the responsive sizing — wrapper just gives it a parent.
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useActivityTimeline } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

export function ActivityTimelineWidget({ props }: WidgetProps) {
  const days = (props?.days as number | undefined) ?? 30;
  const { data, isLoading, error } = useActivityTimeline(days);

  if (isLoading) {
    return <div className="text-sm text-text-muted">Loading activity…</div>;
  }
  if (error) {
    return <div className="text-sm text-danger">{(error as Error).message}</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-text-muted">
        No activity in the last {days} days.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[160px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={120}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          stroke="var(--color-text-muted)"
          fontSize={11}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis stroke="var(--color-text-muted)" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: "var(--color-paper-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="submissions"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="active_students"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
