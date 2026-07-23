"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchActiveLesson } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function LiveLessonBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [lessonId, setLessonId] = useState<string | null>(null);

  useEffect(() => {
    // one check per page load — deliberately NOT an interval (spec §9)
    void fetchActiveLesson()
      .then(setLessonId)
      .catch(() => {});
  }, [pathname]);

  if (!lessonId || pathname.startsWith("/lesson/")) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-sm text-white">
      <span>🔴 {t("live.joinBanner")}</span>
      <button
        onClick={() => router.push(`/lesson/${lessonId}`)}
        className="rounded-pill bg-white/20 px-3 py-1 font-medium"
      >
        {t("live.join")}
      </button>
    </div>
  );
}
