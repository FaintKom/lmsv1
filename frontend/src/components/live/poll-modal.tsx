"use client";

import { useState } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-paper-2 p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">{poll.question}</h3>
        <div className="flex flex-col gap-2">
          {poll.options.map((opt, i) => (
            <button
              key={i}
              disabled={voted}
              onClick={() => setSelected(i)}
              className={`rounded-lg border p-3 text-left ${
                selected === i ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              {opt}
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
          className="mt-4 w-full rounded-lg bg-primary p-3 font-medium text-white disabled:opacity-50"
        >
          {t("live.poll.vote")}
        </button>
      </div>
    </div>
  );
}
