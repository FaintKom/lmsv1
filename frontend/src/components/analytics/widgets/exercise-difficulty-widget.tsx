"use client";
/**
 * ExerciseDifficultyWidget — table of exercises sorted by lowest
 * pass-rate. Reads /admin/analytics/v2/exercise-difficulty.
 */
import { useExerciseDifficulty } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

export function ExerciseDifficultyWidget({ props }: WidgetProps) {
  const courseId = props?.course_id as string | undefined;
  const { data, isLoading, error } = useExerciseDifficulty(courseId);

  if (isLoading) return <div className="text-sm text-text-muted">Loading…</div>;
  if (error)
    return <div className="text-sm text-danger">{(error as Error).message}</div>;
  if (!data || data.length === 0)
    return <div className="text-sm text-text-muted">No exercises yet.</div>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase text-text-muted">
          <th className="pb-1">Exercise</th>
          <th className="pb-1 text-right">Attempts</th>
          <th className="pb-1 text-right">Pass %</th>
          <th className="pb-1 text-right">Avg</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.exercise_id} className="border-t border-border">
            <td className="py-1.5 truncate max-w-[14rem]">{row.title}</td>
            <td className="py-1.5 text-right">{row.attempts ?? 0}</td>
            <td className="py-1.5 text-right">
              {row.pass_rate == null ? (
                "—"
              ) : (
                <span
                  className={
                    row.pass_rate < 50
                      ? "text-danger"
                      : row.pass_rate < 75
                        ? "text-warning"
                        : "text-success"
                  }
                >
                  {Number(row.pass_rate).toFixed(0)}%
                </span>
              )}
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
