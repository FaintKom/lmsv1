"use client";
/**
 * ReviewQueueWidget — teacher-facing list of submissions awaiting grading.
 *
 * Reads /admin/review-queue (the same feed the Review page uses) and shows
 * the pending count plus the oldest items so a teacher sees what to grade
 * next without leaving analytics.
 */
import { useTranslation } from "@/lib/i18n/context";
import Link from "next/link";

import { WidgetError } from "./widget-error";
import { useReviewQueue } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

function daysAgo(iso: string, t: (key: string) => string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return t("an.today");
  if (days === 1) return "1d ago";
  return t("an.daysAgo").replace("{n}", String(days));
}

export function ReviewQueueWidget({ props }: WidgetProps) {
  const { t } = useTranslation();
  const limit = (props?.limit as number | undefined) ?? 6;
  const { data, isLoading, error } = useReviewQueue();

  if (isLoading) {
    return <div className="text-sm text-text-muted">{t("exercise.loading")}</div>;
  }
  if (error) {
    return <WidgetError />;
  }
  if (!data) return null;

  const items = [...data].sort(
    (a, b) =>
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  );
  const shown = items.slice(0, limit);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold text-text">{data.length}</span>
        <Link href="/admin/review" className="text-xs text-primary hover:underline">
          {t("an.openReview")}
        </Link>
      </div>
      <div className="text-sm text-text-muted">
        {t("an.awaiting")}
      </div>
      {shown.length === 0 ? (
        <div className="text-xs text-text-muted">{t("an.nothingToGrade")}</div>
      ) : (
        <ul className="text-sm divide-y divide-border">
          {shown.map((item) => (
            <li
              key={item.id}
              className="py-1.5 flex items-center justify-between gap-2"
            >
              <span className="min-w-0">
                <span className="block truncate">{item.assignment_title}</span>
                <span className="block truncate text-xs text-text-muted">
                  {item.student_name}
                </span>
              </span>
              <span className="shrink-0 text-xs text-text-muted">
                {daysAgo(item.submitted_at, t)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
