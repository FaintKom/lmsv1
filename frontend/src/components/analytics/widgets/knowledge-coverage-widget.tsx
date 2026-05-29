"use client";
/**
 * KnowledgeCoverageWidget — methodist view of verified KB entries per facet.
 *
 * Reads /knowledge/facets. The `facet` prop selects which dimension to chart
 * (stage / type / audience / mode / problems); defaults to stage.
 */
import { useKnowledgeFacets } from "@/hooks/use-dashboards";

import type { KnowledgeFacets } from "@/lib/api/analytics";

import type { WidgetProps } from "../widget-registry";

type FacetKey = keyof KnowledgeFacets;

const FACET_KEYS: FacetKey[] = ["stage", "type", "audience", "mode", "problems"];

export function KnowledgeCoverageWidget({ props }: WidgetProps) {
  const raw = (props?.facet as string | undefined) ?? "stage";
  const facet: FacetKey = (FACET_KEYS as string[]).includes(raw)
    ? (raw as FacetKey)
    : "stage";
  const limit = (props?.limit as number | undefined) ?? 8;
  const { data, isLoading, error } = useKnowledgeFacets();

  if (isLoading) {
    return <div className="text-sm text-text-muted">Loading coverage…</div>;
  }
  if (error) {
    return <div className="text-sm text-danger">{(error as Error).message}</div>;
  }
  if (!data) return null;

  const rows = (data[facet] ?? []).slice(0, limit);
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wide text-text-muted">
        Knowledge entries by {facet}
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-text-muted">No verified entries yet.</div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.value} className="text-sm">
              <div className="flex justify-between mb-0.5">
                <span className="truncate max-w-[12rem]">{r.value}</span>
                <span className="text-text-muted">{r.count}</span>
              </div>
              <div className="h-1.5 rounded bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
