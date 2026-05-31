"use client";

import { CalendarCheck, Loader2 } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  useMyAttendance,
  type AttendanceStatus,
} from "@/lib/api/attendance";

const BADGE_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-success-soft text-success-fg",
  late: "bg-warning-soft text-warning-fg",
  absent: "bg-danger-soft text-danger-fg",
  excused: "bg-ink-100 text-text-muted",
};

export default function StudentAttendancePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyAttendance();
  const records = data?.records ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <CalendarCheck className="h-6 w-6 text-primary" />
          {t("attendance.studentTitle")}
        </h1>
        <p className="text-base text-text-muted">
          {t("attendance.studentSubtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-subtle">
            {t("attendance.noMyRecords")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
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
