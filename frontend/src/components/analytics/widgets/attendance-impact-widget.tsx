"use client";
/**
 * AttendanceImpactWidget — compares avg score of high vs low attenders
 * + correlation coefficient. Reads /admin/analytics/v2/attendance-impact.
 *
 * Caller: components/analytics/widget-registry.tsx. No file I/O.
 */
import { useAttendanceImpact } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

export function AttendanceImpactWidget(_props: WidgetProps) {
  const { data, isLoading, error } = useAttendanceImpact();

  if (isLoading) return <div className="text-sm text-text-muted">Loading…</div>;
  if (error)
    return <div className="text-sm text-danger">{(error as Error).message}</div>;
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      <Tile
        label="High attendance avg"
        value={data.high_attendance_avg_score}
      />
      <Tile label="Low attendance avg" value={data.low_attendance_avg_score} />
      <Tile
        label="Correlation"
        value={data.correlation}
        formatter={(n) => Number(n ?? 0).toFixed(2)}
      />
      <Tile
        label="Sample"
        value={data.sample_size}
        formatter={(n) => `${n}`}
      />
    </div>
  );
}

interface TileProps {
  label: string;
  value: number | null;
  formatter?: (n: number) => string;
}

function Tile({ label, value, formatter }: TileProps) {
  return (
    <div className="bg-surface-2 rounded-md p-3 flex flex-col justify-between">
      <div className="text-xs uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="text-2xl font-bold text-text mt-1">
        {value == null
          ? "—"
          : formatter
            ? formatter(value)
            : Number(value).toFixed(1)}
      </div>
    </div>
  );
}
