"use client";
/**
 * TopMoversWidget — ranked list of most active students in window
 * plus a decliners section underneath.
 *
 * Reads /admin/analytics/v2/xp-movers?window_days=N&limit=K.
 */
import { useXpMovers } from "@/hooks/use-dashboards";

import type { WidgetProps } from "../widget-registry";

export function TopMoversWidget({ props }: WidgetProps) {
  const windowDays = (props?.window_days as number | undefined) ?? 7;
  const limit = (props?.limit as number | undefined) ?? 5;
  const { data, isLoading, error } = useXpMovers(windowDays, limit);

  if (isLoading) {
    return <div className="text-sm text-text-muted">Loading movers…</div>;
  }
  if (error) {
    return <div className="text-sm text-danger">{(error as Error).message}</div>;
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Section title={`Top ${limit} movers (${windowDays}d)`}>
        {data.movers.length === 0 ? (
          <div className="text-xs text-text-muted">No activity yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-text-muted">
                <th className="pb-1">Student</th>
                <th className="pb-1 text-right">Subs</th>
                <th className="pb-1 text-right">Score Σ</th>
              </tr>
            </thead>
            <tbody>
              {data.movers.map((m) => (
                <tr key={m.user_id} className="border-t border-border">
                  <td className="py-1.5 truncate max-w-[10rem]">
                    {m.full_name || m.email}
                  </td>
                  <td className="py-1.5 text-right">{m.submission_count}</td>
                  <td className="py-1.5 text-right">{m.score_sum.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Decliners (active prior, silent now)">
        {data.decliners.length === 0 ? (
          <div className="text-xs text-text-muted">No decliners.</div>
        ) : (
          <ul className="text-sm divide-y divide-border">
            {data.decliners.map((d) => (
              <li
                key={d.user_id}
                className="py-1.5 flex justify-between items-center"
              >
                <span className="truncate max-w-[12rem]">
                  {d.full_name || d.email}
                </span>
                <span className="text-xs text-text-muted">
                  {d.prior_count} prior
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-text-muted mb-1">
        {title}
      </div>
      {children}
    </div>
  );
}
