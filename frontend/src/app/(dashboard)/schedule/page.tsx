"use client";

import { useMemo } from "react";
import { CalendarClock, Loader2, MapPin, Video } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { buildJoinUrl } from "@/lib/meetings";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { useMySchedule, type ScheduleSlot } from "@/lib/api/schedule";

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const HOST_ROLES = new Set(["teacher", "admin", "super_admin"]);

export default function StudentSchedulePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMySchedule();
  const user = useAuthStore((s) => s.user);
  const isHost = !!user && HOST_ROLES.has(user.role);

  const byDay = useMemo(() => {
    const map: Record<number, ScheduleSlot[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    };
    for (const slot of data?.slots ?? []) {
      if (map[slot.day_of_week]) map[slot.day_of_week].push(slot);
    }
    for (const day of DAYS) {
      map[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [data]);

  const hasAny = (data?.slots?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <CalendarClock className="h-6 w-6 text-primary" />
          {t("schedule.studentTitle")}
        </h1>
        <p className="text-base text-text-muted">
          {t("schedule.studentSubtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !hasAny ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-subtle">
            {t("schedule.noSlots")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {DAYS.filter((day) => byDay[day].length > 0).map((day) => (
            <div key={day} className="space-y-2">
              <h2 className="text-sm font-semibold text-text">
                {t(`schedule.day.${day}`)}
              </h2>
              {byDay[day].map((slot) => (
                <Card key={slot.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <span className="min-w-[6rem] text-sm font-medium text-text-muted tabular-nums">
                      {slot.start_time}–{slot.end_time}
                    </span>
                    <span className="flex-1 text-sm font-medium text-text">
                      {slot.course_title}
                    </span>
                    {slot.location && (
                      <span className="flex items-center gap-1 text-xs text-text-subtle">
                        <MapPin className="h-3 w-3" />
                        {slot.location}
                      </span>
                    )}
                    {slot.is_online && slot.room_url && (
                      <a
                        href={buildJoinUrl(slot.room_url, {
                          displayName: user?.full_name,
                          isHost,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
                      >
                        <Video className="h-3.5 w-3.5" />
                        {t("schedule.joinOnline")}
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
