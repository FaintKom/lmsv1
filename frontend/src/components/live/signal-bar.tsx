"use client";

import { useState } from "react";
import { Check, Hand, HelpCircle, MessageCircleQuestion, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { askQuestion, clearSignal, setSignal, type SignalType } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function SignalBar({
  lessonId,
  initial,
  variant = "bar",
}: {
  lessonId: string;
  initial: SignalType | null;
  /**
   * "bar" is the original full-width strip with its own Ask modal. "rail" is
   * one compact row of the three signals for the lesson rail (FR-035), where
   * asking lives in the chat beside it and a second entrance would be one
   * entrance too many.
   */
  variant?: "bar" | "rail";
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<SignalType | null>(initial);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");

  const toggle = async (type: SignalType) => {
    if (active === type) {
      setActive(null);
      await clearSignal(lessonId);
    } else {
      setActive(type);
      await setSignal(lessonId, type);
    }
  };

  const btn = (type: SignalType, label: string, Icon: LucideIcon) => (
    <button
      key={type}
      onClick={() => void toggle(type)}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill px-4 py-2 text-sm font-bold transition-colors ${
        active === type
          ? "btn-pop bg-primary text-primary-fg"
          : "border-2 border-border bg-surface text-text hover:border-green-300"
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  if (variant === "rail") {
    const railBtn = (type: SignalType, label: string, Icon: LucideIcon) => (
      <button
        key={type}
        onClick={() => void toggle(type)}
        title={label}
        aria-label={label}
        aria-pressed={active === type}
        className={`inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-xs font-bold transition-colors pointer-coarse:h-11 ${
          active === type
            ? "btn-pop bg-primary text-primary-fg"
            : "border-2 border-border bg-surface text-text hover:border-green-300"
        }`}
      >
        <Icon size={15} aria-hidden />
        <span className="hidden xl:inline">{label}</span>
      </button>
    );
    return (
      <>
        {railBtn("hand", t("live.signal.hand"), Hand)}
        {railBtn("confused", t("live.signal.confused"), HelpCircle)}
        {railBtn("done", t("live.signal.done"), Check)}
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 border-t border-border bg-surface p-3 pt-2">
      <div className="font-mono text-3xs font-bold uppercase tracking-wide text-text-subtle">
        {t("live.signalHint")}
      </div>
      <div className="flex items-center justify-center gap-3">
        {btn("hand", t("live.signal.hand"), Hand)}
        {btn("confused", t("live.signal.confused"), HelpCircle)}
        {btn("done", t("live.signal.done"), Check)}
        <button
          onClick={() => setAsking(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border-2 border-border bg-surface px-4 py-2 text-sm font-bold text-text transition-colors hover:border-green-300"
        >
          <MessageCircleQuestion size={16} /> {t("live.ask")}
        </button>
      </div>

      {asking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 backdrop-blur-[2px]">
          <div className="w-full max-w-[480px] rounded-xl bg-surface p-8 shadow-lg">
            <h3 className="mb-4 text-lg font-bold text-text">{t("live.ask")}</h3>
            <textarea
              autoFocus
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-md border-2 border-border bg-surface px-3 py-2 text-sm transition-colors placeholder:text-text-subtle focus:border-border-focus focus:outline-none focus:ring-4 focus:ring-primary-soft"
            />
            <div className="mt-4 flex justify-end gap-2.5">
              <button
                onClick={() => setAsking(false)}
                className="btn-pop btn-pop--secondary rounded-md border border-border bg-surface px-4 py-2 text-sm font-bold text-text"
              >
                {t("common.cancel")}
              </button>
              <button
                disabled={!question.trim()}
                onClick={async () => {
                  await askQuestion(lessonId, question.trim());
                  setQuestion("");
                  setAsking(false);
                  toast.success(t("live.askSent"));
                }}
                className="btn-pop rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-fg"
              >
                {t("live.ask")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
