"use client";
/**
 * AttendanceImpactWidget — compares avg score of high vs low attenders
 * + correlation coefficient. Reads /admin/analytics/v2/attendance-impact.
 *
 * Caller: components/analytics/widget-registry.tsx. No file I/O.
 */
import { useTranslation } from "@/lib/i18n/context";
import { WidgetError } from "./widget-error";
import { useAttendanceImpact } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

export function AttendanceImpactWidget(_props: WidgetProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useAttendanceImpact();

  if (isLoading) return <div className="text-sm text-text-muted">{t("exercise.loading")}</div>;
  if (error)
    return <WidgetError />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      <Tile
        label={t("an.highAttendance")}
        value={data.high_attendance_avg_score}
      />
      <Tile label={t("an.lowAttendance")} value={data.low_attendance_avg_score} />
      <Tile
        label={t("an.correlation")}
        value={data.correlation}
        formatter={(n) => Number(n ?? 0).toFixed(2)}
      />
      <Tile
        label={t("an.sample")}
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
      <div className="text-sm text-text-muted">
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
