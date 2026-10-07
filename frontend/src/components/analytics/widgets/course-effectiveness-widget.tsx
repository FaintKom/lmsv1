"use client";
/**
 * CourseEffectivenessWidget — table of courses sorted by completion
 * rate, with avg-score + enrollment counts. Reads
 * /admin/analytics/v2/course-effectiveness.
 */
import { useTranslation } from "@/lib/i18n/context";
import { WidgetError } from "./widget-error";
import { useCourseEffectiveness } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

export function CourseEffectivenessWidget(_props: WidgetProps) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useCourseEffectiveness();

  if (isLoading) return <div className="text-sm text-text-muted">{t("exercise.loading")}</div>;
  if (error)
    return <WidgetError />;
  if (!data || data.length === 0)
    return <div className="text-sm text-text-muted">{t("an.noCourses")}</div>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase text-text-muted">
          <th className="pb-1">{t("an.colCourse")}</th>
          <th className="pb-1 text-right">{t("an.colEnrolled")}</th>
          <th className="pb-1 text-right">{t("an.colCompleted")}</th>
          <th className="pb-1 text-right">{t("an.colAvg")}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.course_id} className="border-t border-border">
            <td className="py-1.5 truncate max-w-[12rem]">{row.course_title}</td>
            <td className="py-1.5 text-right">{row.enrollments ?? 0}</td>
            <td className="py-1.5 text-right">
              {row.completion_rate == null
                ? "—"
                : `${Number(row.completion_rate).toFixed(1)}%`}
            </td>
            <td className="py-1.5 text-right">
              {row.avg_score == null ? "—" : Number(row.avg_score).toFixed(1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
