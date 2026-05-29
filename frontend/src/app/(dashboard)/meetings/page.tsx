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
 return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
 }

 return (
 <div className="mx-auto max-w-4xl space-y-6 p-6">
 <div>
 <h1 className="text-2xl font-bold text-text ">{t("meet.title")}</h1>
 <p className="text-base text-text-muted ">{t("meet.subtitle")}</p>
 </div>

 {active.length > 0 ? (
 <div className="grid gap-4 sm:grid-cols-2">
 {active.map((m) => (
 <Card key={m.id} className="border-l-4 border-l-green-500">
 <CardContent className="p-4">
 <div className="flex items-start justify-between">
 <div>
 <h3 className="font-semibold text-ink-700 ">{m.title}</h3>
 {m.description && <p className="mt-1 text-xs text-text-muted">{m.description}</p>}
 </div>
 <span className="flex items-center gap-1 rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-medium text-success-fg ">
 <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-primary" />
 {t("meet.live")}
 </span>
 </div>
 <a
 href={m.room_url}
 target="_blank"
 rel="noopener noreferrer"
 className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
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
 <div className="mb-3 rounded-pill bg-ink-100 p-3 ">
 <Video className="h-6 w-6 text-text-subtle" />
 </div>
 <p className="text-sm font-medium text-text-muted">{t("meet.noLive")}</p>
 <p className="mt-1 text-xs text-text-subtle">{t("meet.noLiveHint")}</p>
 </CardContent>
 </Card>
 )}

 {past.length > 0 && (
 <div>
 <h2 className="mb-3 text-lg font-semibold text-text ">{t("meet.pastMeetings")}</h2>
 <div className="space-y-2">
 {past.slice(0, 10).map((m) => (
 <Card key={m.id}>
 <CardContent className="flex items-center justify-between p-3">
 <div>
 <p className="text-sm font-medium text-ink-700 ">{m.title}</p>
 <p className="text-xs text-text-subtle">{new Date(m.created_at).toLocaleDateString()}</p>
 </div>
 <span className="text-xs text-text-subtle">{t("meet.ended")}</span>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
