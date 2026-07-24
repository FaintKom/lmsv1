"use client";

import { useState } from "react";

import { clearSignal, setSignal, type SignalType } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function SignalBar({
  lessonId,
  initial,
}: {
  lessonId: string;
  initial: SignalType | null;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<SignalType | null>(initial);

  const toggle = async (type: SignalType) => {
    if (active === type) {
      setActive(null);
      await clearSignal(lessonId);
    } else {
      setActive(type);
      await setSignal(lessonId, type);
    }
  };

  const btn = (type: SignalType, label: string, emoji: string) => (
    <button
      key={type}
      onClick={() => void toggle(type)}
      className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
        active === type ? "bg-primary text-white" : "bg-surface-2 text-text hover:bg-paper-2"
      }`}
    >
      {emoji} {label}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-3 border-t border-border bg-paper-2 p-3">
      {btn("hand", t("live.signal.hand"), "✋")}
      {btn("confused", t("live.signal.confused"), "🤔")}
      {btn("done", t("live.signal.done"), "✅")}
    </div>
  );
}
