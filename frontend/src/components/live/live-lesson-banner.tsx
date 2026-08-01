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
    <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-primary px-4 py-2.5 text-sm text-white shadow-pop">
      <span className="flex items-center gap-2 font-semibold">
        <span className="h-2 w-2 animate-pulse rounded-pill bg-sun-300" />
        {t("live.joinBanner")}
      </span>
      <button
        onClick={() => router.push(`/lesson/${lessonId}`)}
        className="rounded-pill bg-paper-2 px-3.5 py-1 text-xs font-bold text-green-800 transition-transform hover:translate-y-px"
      >
        {t("live.join")}
      </button>
    </div>
  );
}
