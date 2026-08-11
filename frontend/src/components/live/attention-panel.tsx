"use client";

/**
 * AttentionPanel — four counters and a short list of who to walk over to.
 *
 * Sits above the per-task rows in the task rail. The teacher reads this,
 * not a 30x8 grid: mid-lesson the only question is who needs help now.
 */

import { useEffect, useState } from "react";
import { Hand, Pause, Repeat } from "lucide-react";

import type { ProgressRow, RosterMember } from "@/lib/api/live";
import { summarizeAttention, type AttentionReason } from "@/lib/live/attention";
import { useTranslation } from "@/lib/i18n/context";

const REASON_ICON: Record<AttentionReason, typeof Hand> = {
  signal: Hand,
  stuck: Repeat,
  idle: Pause,
};

const REASON_KEY: Record<AttentionReason, string> = {
  signal: "live.attention.signal",
  stuck: "live.attention.stuck",
  idle: "live.attention.idle",
};

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex-1 rounded-md bg-surface-2 px-2 py-1.5 text-center">
      <div className={`font-mono text-base font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-3xs uppercase tracking-wide text-text-subtle">{label}</div>
    </div>
  );
}

export function AttentionPanel({
  rows,
  roster,
  currentExerciseId,
}: {
  rows: ProgressRow[];
  roster: RosterMember[];
  currentExerciseId: string | null;
}) {
  const { t } = useTranslation();
  // "Stalled for N minutes" has to age on its own — without this tick it would
  // only be re-evaluated when the progress query happens to refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const s = summarizeAttention({ rows, roster, currentExerciseId, now });

  return (
    <div className="mb-3">
      <div className="mb-2 flex gap-1.5">
        <Kpi label={t("live.kpi.solved")} value={s.solved} tone="text-green-700" />
        <Kpi label={t("live.kpi.working")} value={s.working} tone="text-text" />
        <Kpi label={t("live.kpi.stuck")} value={s.stuck} tone="text-clay-700" />
        <Kpi label={t("live.kpi.ahead")} value={s.ahead} tone="text-primary" />
      </div>

      <div className="eyebrow px-1.5 pb-1">{t("live.attention.title")}</div>
      {s.needHelp.length === 0 ? (
        <div className="px-1.5 pb-1 text-sm text-text-subtle">{t("live.attention.clear")}</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {s.needHelp.map((e) => {
            const Icon = REASON_ICON[e.reason];
            return (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-md bg-sun-100 p-2 text-sm text-ink-900"
              >
                <Icon size={14} strokeWidth={2.5} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate font-semibold">{e.name}</span>
                <span className="font-mono text-3xs uppercase tracking-wide">
                  {t(REASON_KEY[e.reason])}
                  {e.reason === "stuck" ? ` ${e.attempts}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
