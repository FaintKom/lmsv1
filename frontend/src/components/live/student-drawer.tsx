"use client";

import { useEffect, useRef, useState } from "react";
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
    <div className="fixed inset-y-0 right-0 z-40 w-96 border-l border-border bg-paper-2 p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-semibold">{member.name}</div>
        <button onClick={onClose} className="text-text-muted">
          ✕
        </button>
      </div>
      <div className="mb-2 text-sm font-medium">{t("live.draft")}</div>
      {draft ? (
        <pre className="max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs">
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
          className="w-full rounded-lg border border-border bg-surface-2 p-2 text-sm"
          rows={3}
        />
        <button
          disabled={!hint.trim()}
          onClick={async () => {
            await sendHint(lessonId, member.id, hint.trim());
            setHint("");
            toast.success(t("live.hint.send"));
          }}
          className="mt-2 w-full rounded-lg bg-primary p-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("live.hint.send")}
        </button>
      </div>
    </div>
  );
}
