"use client";

import { useState } from "react";

import { closePoll, startPoll, type PollResult } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function PollPanel({
  lessonId,
  liveCounts,
}: {
  lessonId: string;
  liveCounts: number[] | null; // fed from SSE poll_progress
}) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PollResult | null>(null);

  const options = optionsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (running) {
    return (
      <div>
        <div className="mb-2 font-medium">{question}</div>
        {options.map((opt, i) => (
          <div key={i} className="mb-1 text-sm">
            {opt} — {liveCounts?.[i] ?? 0}
          </div>
        ))}
        <button
          onClick={async () => {
            setResult(await closePoll(lessonId));
            setRunning(false);
          }}
          className="mt-3 w-full rounded-lg bg-danger p-2 text-sm font-medium text-white"
        >
          {t("live.poll.close")}
        </button>
      </div>
    );
  }
  return (
    <div>
      {result && (
        <div className="mb-4 rounded-lg bg-surface-2 p-3 text-sm">
          <div className="mb-1 font-medium">{t("live.poll.results")}</div>
          {result.options.map((opt, i) => (
            <div key={i}>
              {opt} — {result.counts[i]}
            </div>
          ))}
        </div>
      )}
      <label className="mb-1 block text-sm">{t("live.poll.question")}</label>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="mb-2 w-full rounded-lg border border-border bg-surface-2 p-2 text-sm"
      />
      <label className="mb-1 block text-sm">{t("live.poll.options")}</label>
      <textarea
        value={optionsText}
        onChange={(e) => setOptionsText(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-border bg-surface-2 p-2 text-sm"
      />
      <button
        disabled={!question.trim() || options.length < 2}
        onClick={async () => {
          await startPoll(lessonId, question.trim(), options);
          setResult(null);
          setRunning(true);
        }}
        className="mt-2 w-full rounded-lg bg-primary p-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {t("live.poll.start")}
      </button>
    </div>
  );
}
