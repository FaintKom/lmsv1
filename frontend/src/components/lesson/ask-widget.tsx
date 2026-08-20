"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/context";
import { askFailureFrom, useAskLesson, type AskFailure } from "@/lib/api/tutor";

interface Exchange {
  question: string;
  answer?: string;
  failure?: AskFailure;
}

const FAILURE_KEYS: Record<AskFailure, string> = {
  unconfigured: "tutor.unconfigured",
  unavailable: "tutor.unavailable",
  limit: "tutor.limitReached",
  noText: "tutor.noText",
  generic: "tutor.error",
};

export function AskWidget({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<Exchange[]>([]);
  const ask = useAskLesson(lessonId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || ask.isPending) return;

    const index = thread.length;
    setThread((prev) => [...prev, { question: trimmed }]);
    setQuestion("");

    ask.mutate(trimmed, {
      onSuccess: (data) =>
        setThread((prev) =>
          prev.map((x, i) => (i === index ? { ...x, answer: data.answer } : x)),
        ),
      onError: (error) =>
        setThread((prev) =>
          prev.map((x, i) =>
            i === index ? { ...x, failure: askFailureFrom(error) } : x,
          ),
        ),
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 rounded-xl border border-ink-200 bg-sun-300 px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:bg-sun-400 pointer-coarse:min-h-11"
      >
        {t("tutor.ask")}
      </button>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-ink-200 bg-sun-300 p-5 text-ink-900">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-ink-900">
          {t("tutor.ask")}
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center text-sm text-ink-700 underline underline-offset-2 pointer-coarse:min-h-11 pointer-coarse:px-2"
        >
          {t("tutor.close")}
        </button>
      </div>

      {thread.length > 0 && (
        <ol className="mb-4 space-y-4">
          {thread.map((item, i) => (
            <li key={i} className="space-y-1.5">
              <p className="text-sm font-medium text-ink-900">{item.question}</p>
              {item.answer !== undefined && (
                // Model output is untrusted — rendered as text, never as HTML.
                <p className="whitespace-pre-wrap text-sm text-ink-700">
                  {item.answer}
                </p>
              )}
              {item.failure !== undefined && (
                <p className="text-sm text-clay-700">
                  {t(FAILURE_KEYS[item.failure])}
                </p>
              )}
              {item.answer === undefined && item.failure === undefined && (
                <p className="text-sm text-ink-700">{t("tutor.thinking")}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("tutor.placeholder")}
          className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-border-focus focus:outline-none focus:ring-4 focus:ring-primary-soft pointer-coarse:h-11"
        />
        <button
          type="submit"
          disabled={ask.isPending || question.trim().length === 0}
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 pointer-coarse:min-h-11"
        >
          {ask.isPending ? t("tutor.thinking") : t("tutor.send")}
        </button>
      </form>

      <p className="mt-3 text-xs text-ink-700">{t("tutor.disclaimer")}</p>
    </section>
  );
}
