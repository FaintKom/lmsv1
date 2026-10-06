"use client";

import { CalendarView } from "@/components/calendar/calendar-view";
import { useTranslation } from "@/lib/i18n/context";
import { PageHeader } from "@/components/ui/page-kit";

export default function CalendarPage() {
 const { t } = useTranslation();
 return (
 <div className="space-y-8">
 <PageHeader title={t("cal.title")} description={t("cal.subtitle")} />
 <CalendarView canCreate={false} />
 </div>
 );
}
