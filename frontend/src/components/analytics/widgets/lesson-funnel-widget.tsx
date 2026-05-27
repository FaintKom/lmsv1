"use client";
/**
 * LessonFunnelWidget — sequential bar showing how many learners
 * reached each lesson + completed it. Reads
 * /admin/analytics/v2/courses/{course_id}/funnel.
 *
 * Requires `props.course_id` to be set. Empty state prompts the user
 * to pick a course (configurable via UI in a later sprint).
 *
 * Caller: components/analytics/widget-registry.tsx. No file I/O.
 */
import { useLessonFunnel } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

export function LessonFunnelWidget({ props }: WidgetProps) {
  const courseId = props?.course_id as string | undefined;
  const { data, isLoading, error } = useLessonFunnel(courseId);

  if (!courseId) {
    return (
      <div className="text-sm text-text-muted">
        Pick a course in widget settings to populate the funnel.
      </div>
    );
  }
  if (isLoading) return <div className="text-sm text-text-muted">Loading…</div>;
  if (error)
    return <div className="text-sm text-danger">{(error as Error).message}</div>;
  if (!data || data.length === 0)
    return <div className="text-sm text-text-muted">No lessons yet.</div>;

  const maxReached = Math.max(...data.map((s) => s.reached), 1);

  return (
    <ul className="space-y-1.5 text-sm">
      {data.map((step) => {
        const pctReached = (step.reached / maxReached) * 100;
        const pctCompleted =
          step.reached === 0 ? 0 : (step.completed / step.reached) * 100;
        return (
          <li key={step.lesson_id}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="truncate max-w-[60%]">{step.lesson_title}</span>
              <span className="text-text-muted">
                {step.reached} reached · {step.completed} done
              </span>
            </div>
            <div className="relative h-4 bg-surface-2 rounded overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary/30"
                style={{ width: `${pctReached}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-primary"
                style={{ width: `${pctReached * (pctCompleted / 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
