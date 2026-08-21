"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchActiveLesson } from "@/lib/api/live";
import { useAuthStore } from "@/stores/auth-store";
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

  // Staff and pupils reach the same lesson by different routes, and each is
  // barred from the other's: the dashboard layout bounces staff to /admin, so a
  // teacher sent to /lesson/… lands anywhere but their own lesson (FR-030).
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = role === "teacher" || role === "admin" || role === "super_admin";
  const target = isStaff ? `/admin/live/${lessonId}` : `/lesson/${lessonId}`;
  const alreadyThere = pathname.startsWith("/lesson/") || pathname.startsWith("/admin/live/");

  if (!lessonId || alreadyThere) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-primary px-4 py-2.5 text-sm text-primary-fg shadow-pop">
      <span className="flex items-center gap-2 font-semibold">
        <span className="h-2 w-2 animate-pulse rounded-pill bg-sun-300" />
        {t("live.joinBanner")}
      </span>
      <button
        onClick={() => router.push(target)}
        // text-text, not text-green-800: the pill's background follows the
        // theme and that fixed green did not, so in dark mode this was dark
        // green on near-black — 1.82:1, on the banner's only action. Surfaced
        // by the dark-theme audit once live lessons became reachable enough to
        // leave one running.
        className="rounded-pill bg-surface px-3.5 py-1 text-xs font-bold text-text transition-transform hover:translate-y-px"
      >
        {t("live.join")}
      </button>
    </div>
  );
}
