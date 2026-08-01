"use client";

import type { RosterMember, SignalType } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

const SIGNAL_EMOJI: Record<SignalType, string> = { hand: "✋", confused: "🤔", done: "✅" };

export function RosterPanel({
  members,
  onPick,
}: {
  members: RosterMember[];
  onPick: (m: RosterMember) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() => onPick(m)}
          className="flex items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-surface-2"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-pill ${m.online ? "bg-primary" : "bg-ink-200"}`}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{m.name}</span>
          {m.signal && <span className="text-base">{SIGNAL_EMOJI[m.signal]}</span>}
          <span className="font-mono text-[10px] uppercase tracking-wide text-text-subtle">
            {m.online ? (m.current_view ?? "") : t("live.notInLesson")}
          </span>
        </button>
      ))}
    </div>
  );
}
