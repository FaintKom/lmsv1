"use client";
/**
 * StudentRisksWidget — list of at-risk students grouped by risk level.
 * Reads /admin/analytics/v2/student-risks.
 *
 * Caller: components/analytics/widget-registry.tsx. No file I/O.
 */
import { useTranslation } from "@/lib/i18n/context";
import { WidgetError } from "./widget-error";
import { useStudentRisks } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

const RISK_STYLES: Record<string, string> = {
  high: "bg-danger/10 text-danger",
  medium: "bg-warning/10 text-warning",
  low: "bg-success/10 text-success",
};

// Status in words; the tint only repeats it.
const RISK_KEY = { high: "an.riskHigh", medium: "an.riskMedium", low: "an.riskLow" } as const;

export function StudentRisksWidget({ props }: WidgetProps) {
  const { t } = useTranslation();
  const courseId = props?.course_id as string | undefined;
  const { data, isLoading, error } = useStudentRisks(courseId);

  if (isLoading) return <div className="text-sm text-text-muted">{t("exercise.loading")}</div>;
  if (error)
    return <WidgetError />;
  if (!data || data.length === 0)
    return <div className="text-sm text-text-muted">{t("an.noRisk")}</div>;

  const counts = {
    high: data.filter((r) => r.risk_level === "high").length,
    medium: data.filter((r) => r.risk_level === "medium").length,
    low: data.filter((r) => r.risk_level === "low").length,
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        {(["high", "medium", "low"] as const).map((lvl) => (
          <span key={lvl} className={`px-2 py-1 rounded ${RISK_STYLES[lvl]}`}>
            {t(RISK_KEY[lvl])}: {counts[lvl]}
          </span>
        ))}
      </div>
      <ul className="text-sm divide-y divide-border">
        {data.slice(0, 15).map((r) => (
          <li
            key={r.user_id}
            className="py-1.5 flex justify-between items-center"
          >
            <span className="truncate max-w-[12rem]">
              {r.full_name || r.email}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${RISK_STYLES[r.risk_level]}`}
            >
              {t(RISK_KEY[r.risk_level as keyof typeof RISK_KEY] ?? r.risk_level)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
