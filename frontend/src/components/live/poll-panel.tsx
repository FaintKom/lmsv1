"use client";

import { useState } from "react";

import { closePoll, startPoll, type PollResult } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

const LABEL = "mb-1.5 block font-mono text-xs font-bold uppercase tracking-wide text-ink-700";
const INPUT =
  "w-full rounded-md border-2 border-border bg-paper-2 px-3 py-2 text-sm transition-colors " +
  "placeholder:text-ink-300 focus:border-border-focus focus:outline-none focus:ring-4 focus:ring-primary-soft";

function CountBar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-semibold text-text">{label}</span>
        <span className="font-mono text-[11px] font-bold tabular-nums text-green-700">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-ink-100">
        <div
          className="h-full rounded-pill bg-gradient-to-r from-green-400 to-green-600 transition-[width] duration-400"
          style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%" }}
        />
      </div>
    </div>
  );
}

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
    const max = Math.max(1, ...(liveCounts ?? []));
    return (
      <div>
        <div className="mb-3 text-sm font-bold text-text">{question}</div>
        {options.map((opt, i) => (
          <CountBar key={i} label={opt} count={liveCounts?.[i] ?? 0} max={max} />
        ))}
        <button
          onClick={async () => {
            setResult(await closePoll(lessonId));
            setRunning(false);
          }}
          className="btn-pop btn-pop--coral mt-3 w-full rounded-md bg-danger p-2.5 text-sm font-bold text-white"
        >
          {t("live.poll.close")}
        </button>
      </div>
    );
  }
  return (
    <div>
      {result && (
        <div className="mb-4 rounded-md bg-surface-2 p-3">
          <div className="mb-2 font-mono text-xs font-bold uppercase tracking-wide text-ink-700">
            {t("live.poll.results")}
          </div>
          {result.options.map((opt, i) => (
            <CountBar
              key={i}
              label={opt}
              count={result.counts[i]}
              max={Math.max(1, ...result.counts)}
            />
          ))}
        </div>
      )}
      <label className={LABEL}>{t("live.poll.question")}</label>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className={`mb-3 ${INPUT}`}
      />
      <label className={LABEL}>{t("live.poll.options")}</label>
      <textarea
        value={optionsText}
        onChange={(e) => setOptionsText(e.target.value)}
        rows={4}
        className={INPUT}
      />
      <button
        disabled={!question.trim() || options.length < 2}
        onClick={async () => {
          await startPoll(lessonId, question.trim(), options);
          setResult(null);
          setRunning(true);
        }}
        className="btn-pop mt-3 w-full rounded-md bg-primary p-2.5 text-sm font-bold text-white"
      >
        {t("live.poll.start")}
      </button>
    </div>
  );
}
