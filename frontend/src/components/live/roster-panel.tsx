"use client";

import { CircleCheck, CircleHelp, Hand, type LucideIcon } from "lucide-react";

import type { RosterMember, SignalType } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

const SIGNAL_ICON: Record<SignalType, { Icon: LucideIcon; tone: string }> = {
  hand: { Icon: Hand, tone: "text-warning-fg" },
  confused: { Icon: CircleHelp, tone: "text-danger-fg" },
  done: { Icon: CircleCheck, tone: "text-success-fg" },
};

function SignalIcon({ signal, label }: { signal: SignalType; label: string }) {
  const { Icon, tone } = SIGNAL_ICON[signal];
  return <Icon className={`h-4 w-4 shrink-0 ${tone}`} role="img" aria-label={label} />;
}

export function RosterPanel({
  members,
  onPick,
}: {
  members: RosterMember[];
  onPick: (m: RosterMember) => void;
}) {
  const { t } = useTranslation();
  // signals first, then online, then alphabetically — the row that needs
  // attention is always on top
  const sorted = [...members].sort(
    (a, b) =>
      Number(!!b.signal) - Number(!!a.signal) ||
      Number(b.online) - Number(a.online) ||
      a.name.localeCompare(b.name),
  );
  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {sorted.map((m) => (
        <button
          key={m.id}
          onClick={() => onPick(m)}
          className="flex items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-surface-2"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-pill ${m.online ? "bg-primary" : "bg-ink-200"}`}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{m.name}</span>
          {m.signal && <SignalIcon signal={m.signal} label={t(`live.signal.${m.signal}`)} />}
          <span className="text-xs text-text-subtle">
            {m.online ? (m.current_view ?? "") : t("live.notInLesson")}
          </span>
        </button>
      ))}
    </div>
  );
}
