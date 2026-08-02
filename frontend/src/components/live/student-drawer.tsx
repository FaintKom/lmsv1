"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { fetchDraft, sendHint, type Draft, type RosterMember } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function StudentDrawer({
  lessonId,
  member,
  exerciseId,
  onClose,
}: {
  lessonId: string;
  member: RosterMember;
  exerciseId: string | null; // current task scene's exercise
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hint, setHint] = useState("");
  const etagRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!exerciseId) return;
    let stop = false;
    etagRef.current = undefined;
    setDraft(null);
    const tick = async () => {
      const d = await fetchDraft(exerciseId, member.id, etagRef.current);
      if (stop) return;
      if (d) {
        etagRef.current = d.updated_at;
        setDraft(d);
      }
    };
    void tick();
    const iv = setInterval(() => void tick(), 4000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [exerciseId, member.id]);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 border-l border-border bg-surface p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-md font-bold text-text">{member.name}</div>
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mb-2 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-text">
        <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-green-500" />
        {t("live.draft")}
      </div>
      {draft ? (
        <pre className="max-h-64 overflow-auto rounded-md bg-ink-900 p-3 font-mono text-xs text-paper">
          {draft.source_code ?? JSON.stringify(draft.answers, null, 2)}
        </pre>
      ) : (
        <div className="text-sm text-text-subtle">—</div>
      )}
      <div className="mt-6">
        <textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder={t("live.hint.placeholder")}
          className="w-full rounded-md border-2 border-border bg-surface px-3 py-2 text-sm transition-colors placeholder:text-text-subtle focus:border-border-focus focus:outline-none focus:ring-4 focus:ring-primary-soft"
          rows={3}
        />
        <button
          disabled={!hint.trim()}
          onClick={async () => {
            await sendHint(lessonId, member.id, hint.trim());
            setHint("");
            toast.success(t("live.hint.send"));
          }}
          className="btn-pop mt-2 w-full rounded-md bg-primary p-2.5 text-sm font-bold text-white"
        >
          {t("live.hint.send")}
        </button>
      </div>
    </div>
  );
}
