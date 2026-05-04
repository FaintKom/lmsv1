"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { Video, Plus, X, Loader2, ExternalLink, StopCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { Meeting } from "@/types/api";

export default function AdminMeetingsPage() {
 const user = useAuthStore((s) => s.user);
 const { t } = useTranslation();
 const [meetings, setMeetings] = useState<Meeting[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [form, setForm] = useState({ title: "", description: "", duration_minutes: 60 });

 const fetchMeetings = async () => {
 try {
 const { data } = await apiClient.get("/meetings/");
 setMeetings(data);
 } catch {
 toast.error("Failed to load meetings");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { fetchMeetings(); }, []);

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);
 try {
 await apiClient.post("/meetings/", form);
 toast.success("Meeting started");
 setShowForm(false);
 setForm({ title: "", description: "", duration_minutes: 60 });
 fetchMeetings();
 } catch {
 toast.error("Failed to create meeting");
 } finally {
 setSubmitting(false);
 }
 };

 const handleEnd = async (id: string) => {
 try {
 await apiClient.post(`/meetings/${id}/end`);
 toast.success("Meeting ended");
 fetchMeetings();
 } catch {
 toast.error("Failed to end meeting");
 }
 };

 const activeMeetings = meetings.filter((m) => m.is_active);
 const pastMeetings = meetings.filter((m) => !m.is_active);

 return (
 <div className="mx-auto max-w-5xl space-y-6 p-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text ">{t("meet.adminTitle")}</h1>
 <p className="text-base text-text-muted ">{t("meet.adminSubtitle")}</p>
 </div>
 <button
 onClick={() => setShowForm(!showForm)}
 className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white $1:bg-primary-hover"
 >
 <Plus className="h-4 w-4" /> {t("meet.startLesson")}
 </button>
 </div>

 {showForm && (
 <Card>
 <CardContent className="p-4">
 <form onSubmit={handleCreate} className="space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold text-ink-700 ">New Meeting</h3>
 <button type="button" onClick={() => setShowForm(false)} className="text-text-subtle hover:text-text-muted">
 <X className="h-4 w-4" />
 </button>
 </div>
 <div className="grid gap-3 sm:grid-cols-2">
 <input
 placeholder="Title (e.g. Math Lesson #5)"
 value={form.title}
 onChange={(e) => setForm({ ...form, title: e.target.value })}
 required
 className="rounded-lg border border-border-strong px-3 py-2 text-sm "
 />
 <input
 type="number"
 placeholder="Duration (min)"
 value={form.duration_minutes}
 onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
 className="rounded-lg border border-border-strong px-3 py-2 text-sm "
 />
 <textarea
 placeholder="Description (optional)"
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 className="rounded-lg border border-border-strong px-3 py-2 text-sm sm:col-span-2 "
 rows={2}
 />
 </div>
 <div className="flex justify-end">
 <button type="submit" disabled={submitting}
 className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white $1:bg-primary-hover disabled:opacity-50">
 {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
 Start Meeting
 </button>
 </div>
 </form>
 </CardContent>
 </Card>
 )}

 {/* Active meetings */}
 {activeMeetings.length > 0 && (
 <div>
 <h2 className="mb-3 text-lg font-semibold text-text ">
 {t("meet.liveNow")} ({activeMeetings.length})
 </h2>
 <div className="grid gap-4 sm:grid-cols-2">
 {activeMeetings.map((m) => (
 <Card key={m.id} className="border-l-4 border-l-green-500">
 <CardContent className="p-4">
 <div className="flex items-start justify-between">
 <div>
 <h3 className="font-semibold text-ink-700 ">{m.title}</h3>
 {m.description && <p className="mt-1 text-xs text-text-muted">{m.description}</p>}
 <p className="mt-2 text-xs text-text-subtle">
 Started {new Date(m.created_at).toLocaleTimeString()} &middot; {m.duration_minutes} min
 </p>
 </div>
 <span className="flex items-center gap-1 rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-medium text-success-fg ">
 <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-primary" />
 {t("meet.live")}
 </span>
 </div>
 <div className="mt-3 flex gap-2">
 <a
 href={m.room_url}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white $1:bg-primary-hover"
 >
 <ExternalLink className="h-3.5 w-3.5" /> {t("meet.join")}
 </a>
 <button
 onClick={() => handleEnd(m.id)}
 className="flex items-center gap-1.5 rounded-lg bg-danger-soft px-3 py-1.5 text-sm font-medium text-danger-fg hover:bg-danger-soft "
 >
 <StopCircle className="h-3.5 w-3.5" /> {t("meet.end")}
 </button>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 )}

 {/* Past meetings */}
 <div>
 <h2 className="mb-3 text-lg font-semibold text-text ">{t("meet.pastMeetings")}</h2>
 {loading ? (
 <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
 ) : pastMeetings.length === 0 ? (
 <Card><CardContent className="py-8 text-center text-sm text-text-subtle">{t("meet.noMeetings")}</CardContent></Card>
 ) : (
 <div className="space-y-2">
 {pastMeetings.map((m) => (
 <Card key={m.id}>
 <CardContent className="flex items-center justify-between p-4">
 <div>
 <h3 className="text-sm font-medium text-ink-700 ">{m.title}</h3>
 <p className="text-xs text-text-subtle">
 {new Date(m.created_at).toLocaleDateString()} &middot; {m.duration_minutes} min
 {m.ended_at && ` · Ended ${new Date(m.ended_at).toLocaleTimeString()}`}
 </p>
 </div>
 <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-xs text-text-muted ">Ended</span>
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
