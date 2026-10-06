"use client";

import { Loader2, CalendarCheck } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-kit";
import {
  useMyAttendance,
  type AttendanceStatus,
} from "@/lib/api/attendance";

const BADGE_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-success-soft text-success-fg",
  late: "bg-warning-soft text-warning-fg",
  absent: "bg-danger-soft text-danger-fg",
  excused: "bg-surface-2 text-text-muted",
};

export default function StudentAttendancePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyAttendance();
  const records = data?.records ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title={t("attendance.studentTitle")} description={t("attendance.studentSubtitle")} />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : records.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={t("attendance.noMyRecords")} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-text-subtle">
                  <th className="py-1 pr-3">{t("attendance.date")}</th>
                  <th className="py-1 pr-3">{t("attendance.course")}</th>
                  <th className="py-1 pr-3">{t("attendance.status")}</th>
                  <th className="py-1">{t("attendance.note")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-1.5 pr-3 text-text">
                      {r.session_date ?? "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-text-muted">
                      {r.course_title ?? "—"}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[r.status]}`}
                      >
                        {t(`attendance.statusValue.${r.status}`)}
                      </span>
                    </td>
                    <td className="py-1.5 text-text-muted">{r.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
