"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

/**
 * The lesson's conversation, as a thread instead of a vanishing toast.
 *
 * Everything here already flowed before this panel existed: the teacher's
 * messages arrive on the lesson channel, and a pupil's questions POST to an
 * endpoint the attention panel already reads. What was missing was a place
 * where either could be read twice (FR-036) — a message that lives for
 * fifteen seconds is not something a pupil can act on while also solving a
 * task.
 */

export interface ChatEntry {
  id: number;
  from: "teacher" | "me";
  text: string;
}

export function ChatPanel({
  entries,
  onSend,
}: {
  entries: ChatEntry[];
  /** Sends a question to the teacher. The caller owns the transport. */
  onSend: (text: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Follow the conversation: new entries scroll into view. The log is the one
  // surface here that is ALLOWED to scroll — controls never do (FR-035).
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [entries.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={logRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {entries.length === 0 && (
          <p className="px-1 pt-2 text-center text-2xs text-text-subtle">
            {t("live.chat.empty")}
          </p>
        )}
        {entries.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-md px-2.5 py-1.5 text-xs ${
              m.from === "me"
                ? "ml-auto bg-primary text-primary-fg"
                : "bg-surface-2 text-text"
            }`}
          >
            {m.from === "teacher" && (
              <span className="mb-0.5 block font-mono text-3xs font-bold uppercase tracking-wide opacity-70">
                {t("live.chat.teacher")}
              </span>
            )}
            {m.text}
          </div>
        ))}
      </div>
      <form
        className="flex shrink-0 items-center gap-1.5 border-t border-border p-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("live.chat.placeholder")}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 text-xs text-text placeholder:text-text-subtle focus:border-border-focus focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label={t("live.chat.send")}
          className="btn-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg disabled:opacity-50"
        >
          <SendHorizonal size={15} aria-hidden />
        </button>
      </form>
    </div>
  );
}
