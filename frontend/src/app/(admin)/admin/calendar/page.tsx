"use client";

import { CalendarView } from "@/components/calendar/calendar-view";
import { useTranslation } from "@/lib/i18n/context";

export default function AdminCalendarPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">{t("cal.title")}</h1>
        <p className="text-base text-ink-500 dark:text-ink-400">
          {t("cal.adminSubtitle")}
        </p>
      </div>
      <CalendarView canCreate={true} />
    </div>
  );
}
