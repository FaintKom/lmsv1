"use client";

import type { ProgressRow } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function ProgressGrid({ rows }: { rows: ProgressRow[] }) {
  const { t } = useTranslation();
  const solved = rows.filter((r) => r.passed).length;
  return (
    <div>
      <div className="mb-2 text-sm text-text-muted">
        {solved}/{rows.length}
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="text-xs text-text-subtle">
              {r.attempts} {t("live.attempts")}
            </span>
            <span>{r.passed ? "✅" : r.submitted ? "❌" : r.draft_updated_at ? "✏️" : "·"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
