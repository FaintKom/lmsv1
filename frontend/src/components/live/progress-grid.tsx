"use client";

import { Check, Pencil, X } from "lucide-react";

import type { ProgressRow } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

function StatusTile({ row }: { row: ProgressRow }) {
  if (row.passed)
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-green-500 text-white">
        <Check size={12} strokeWidth={3} />
      </span>
    );
  if (row.submitted)
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-clay-500 text-white">
        <X size={12} strokeWidth={3} />
      </span>
    );
  if (row.draft_updated_at)
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-sun-300 text-sun-700">
        <Pencil size={11} strokeWidth={2.5} />
      </span>
    );
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-sm border-2 border-border-strong text-text-subtle">
      ·
    </span>
  );
}

export function ProgressGrid({ rows }: { rows: ProgressRow[] }) {
  const { t } = useTranslation();
  const solved = rows.filter((r) => r.passed).length;
  return (
    <div>
      <div className="mb-2 font-mono text-xs font-bold tabular-nums text-green-700">
        {solved}/{rows.length}
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 rounded-md bg-surface-2 p-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate font-semibold text-text">{r.name}</span>
            <span className="font-mono text-3xs uppercase tracking-wide text-text-subtle">
              {r.attempts} {t("live.attempts")}
            </span>
            <StatusTile row={r} />
          </div>
        ))}
      </div>
    </div>
  );
}
