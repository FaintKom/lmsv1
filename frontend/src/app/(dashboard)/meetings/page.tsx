"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { Meeting } from "@/types/api";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    apiClient.get("/meetings/").then(({ data }) => setMeetings(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const active = meetings.filter((m) => m.is_active);
  const past = meetings.filter((m) => !m.is_active);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">{t("meet.title")}</h1>
        <p className="text-base text-ink-500 dark:text-ink-400">{t("meet.subtitle")}</p>
      </div>

      {active.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((m) => (
            <Card key={m.id} className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-ink-900 dark:text-ink-200">{m.title}</h3>
                    {m.description && <p className="mt-1 text-xs text-ink-500">{m.description}</p>}
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    {t("meet.live")}
                  </span>
                </div>
                <a
                  href={m.room_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Video className="h-4 w-4" /> {t("meet.joinLesson")}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 rounded-full bg-ink-100 p-3 dark:bg-white/10">
              <Video className="h-6 w-6 text-ink-400" />
            </div>
            <p className="text-sm font-medium text-ink-500">{t("meet.noLive")}</p>
            <p className="mt-1 text-xs text-ink-400">{t("meet.noLiveHint")}</p>
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-100">{t("meet.pastMeetings")}</h2>
          <div className="space-y-2">
            {past.slice(0, 10).map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium text-ink-700 dark:text-ink-300">{m.title}</p>
                    <p className="text-xs text-ink-400">{new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-ink-400">{t("meet.ended")}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
