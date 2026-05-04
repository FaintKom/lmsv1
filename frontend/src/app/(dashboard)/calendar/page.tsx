"use client";

import { CalendarView } from "@/components/calendar/calendar-view";
import { useTranslation } from "@/lib/i18n/context";

export default function CalendarPage() {
 const { t } = useTranslation();
 return (
 <div className="mx-auto max-w-6xl space-y-6 p-6">
 <div>
 <h1 className="text-2xl font-bold text-text ">{t("cal.title")}</h1>
 <p className="text-base text-text-muted ">
 {t("cal.subtitle")}
 </p>
 </div>
 <CalendarView canCreate={false} />
 </div>
 );
}
