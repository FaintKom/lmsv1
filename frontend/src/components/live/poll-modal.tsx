"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { votePoll, type Poll } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function PollModal({
  lessonId,
  poll,
  onDone,
}: {
  lessonId: string;
  poll: Poll;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 backdrop-blur-[2px]">
      <div className="w-full max-w-[560px] rounded-xl bg-surface p-8 shadow-lg">
        <h3 className="mb-5 text-xl font-bold text-text">{poll.question}</h3>
        <div className="flex flex-col gap-2">
          {poll.options.map((opt, i) => (
            <button
              key={i}
              disabled={voted}
              onClick={() => setSelected(i)}
              className={`relative rounded-md border-2 p-3.5 text-left text-sm font-semibold transition-colors ${
                selected === i
                  ? "border-primary bg-primary-soft text-success-fg"
                  : "border-border bg-surface text-text hover:border-green-300"
              }`}
            >
              {opt}
              {selected === i && (
                <span className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-pill bg-primary text-primary-fg">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          disabled={selected === null || voted}
          onClick={async () => {
            if (selected === null) return;
            setVoted(true);
            await votePoll(lessonId, selected);
            onDone();
          }}
          className="btn-pop mt-6 w-full rounded-md bg-primary p-3 text-sm font-bold text-primary-fg"
        >
          {t("live.poll.vote")}
        </button>
      </div>
    </div>
  );
}
