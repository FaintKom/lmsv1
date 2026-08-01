"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { getApiError } from "@/lib/api-client";
import { startLesson } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function StartLessonButton({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          const lesson = await startLesson(groupId);
          router.push(`/admin/live/${lesson.id}`);
        } catch (err: unknown) {
          const resp = (
            err as {
              response?: { status?: number; data?: { detail?: { active_lesson_id?: string } } };
            }
          ).response;
          if (resp?.status === 409 && resp.data?.detail?.active_lesson_id) {
            router.push(`/admin/live/${resp.data.detail.active_lesson_id}`);
          } else {
            toast.error(getApiError(err, t("live.start")));
            setBusy(false);
          }
        }
      }}
      className="btn-pop inline-flex items-center gap-1.5 rounded-sm bg-primary px-3.5 py-1.5 text-xs font-bold text-white"
    >
      <Play size={12} strokeWidth={3} /> {t("live.start")}
    </button>
  );
}
