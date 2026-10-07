"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { CalendarEvent } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { Plus, X, Loader2 } from "lucide-react";
import esLocale from "@fullcalendar/core/locales/es";
import ruLocale from "@fullcalendar/core/locales/ru";
import trLocale from "@fullcalendar/core/locales/tr";
import deLocale from "@fullcalendar/core/locales/de";
import ukLocale from "@fullcalendar/core/locales/uk";
import { useTranslation } from "@/lib/i18n/context";
import { useConfirm } from "@/components/ui/confirm-dialog";

// FullCalendar ships English; these carry its month names and toolbar words.
const FC_LOCALES = [esLocale, ruLocale, trLocale, deLocale, ukLocale];

const EVENT_COLORS: Record<string, string> = {
 deadline: "var(--color-danger)",
 lesson: "var(--color-info)",
 meeting: "var(--color-primary)",
 custom: "var(--viz-5)",
};

interface Props {
 canCreate?: boolean;
}

export function CalendarView({ canCreate = false }: Props) {
 const { t, locale } = useTranslation();
 const confirm = useConfirm();
 const [events, setEvents] = useState<CalendarEvent[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
 const user = useAuthStore((s) => s.user);
 const calendarRef = useRef<FullCalendar | null>(null);

 // A month grid needs seven columns. At 375px each day is about 60px wide and
 // an event title shows 6 of its 87 pixels — no layout fixes that, the columns
 // do not fit. So a phone opens on the day view: one column, names readable,
 // and the month button is still there for anyone who wants the overview.
 //
 // Waits for the calendar to exist. `loading` returns a spinner instead of
 // FullCalendar, so an effect with no dependencies fires while the ref is
 // still null and quietly does nothing — measured in prod, where the month
 // grid came back untouched. Runs once after that; the view is then the
 // reader's to choose, and a resize must not overrule them.
 const narrowedOnce = useRef(false);
 useEffect(() => {
 if (loading || narrowedOnce.current) return;
 if (typeof window === "undefined") return;
 // A minimised or hidden window reports 0, and `(max-width: 640px)` is
 // perfectly happy with 0 — caught on a desktop browser whose window was
 // minimised: the calendar switched to the day view and, since this fires
 // once, stayed there. Only narrow when the width is actually known.
 if (window.innerWidth < 1) return;
 if (!window.matchMedia("(max-width: 640px)").matches) return;
 const api = calendarRef.current?.getApi();
 if (!api) return;
 api.changeView("timeGridDay");
 narrowedOnce.current = true;
 }, [loading]);

 const [form, setForm] = useState({
 title: "",
 description: "",
 event_type: "custom",
 start_time: "",
 end_time: "",
 all_day: false,
 });

 const fetchEvents = useCallback(async (start?: string, end?: string) => {
 try {
 const params = new URLSearchParams();
 if (start) params.set("from", start);
 if (end) params.set("to", end);
 const { data } = await apiClient.get(`/calendar/events?${params}`);
 setEvents(data);
 } catch {
 toast.error(t("cal.loadFailed"));
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchEvents();
 }, [fetchEvents]);

 const handleDateSet = (arg: { start: Date; end: Date }) => {
 fetchEvents(arg.start.toISOString(), arg.end.toISOString());
 };

 const handleDateClick = (arg: { dateStr: string }) => {
 if (!canCreate) return;
 setForm({
 ...form,
 title: "",
 description: "",
 start_time: arg.dateStr.includes("T") ? arg.dateStr.slice(0, 16) : `${arg.dateStr}T09:00`,
 end_time: "",
 });
 setShowForm(true);
 setSelectedEvent(null);
 };

 const handleEventClick = (arg: { event: { id: string } }) => {
 const ev = events.find((e) => e.id === arg.event.id);
 if (ev) setSelectedEvent(ev);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!form.title || !form.start_time) return;
 setSubmitting(true);
 try {
 await apiClient.post("/calendar/events", {
 ...form,
 start_time: new Date(form.start_time).toISOString(),
 end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
 });
 toast.success(t("cal.created"));
 setShowForm(false);
 setForm({ title: "", description: "", event_type: "custom", start_time: "", end_time: "", all_day: false });
 fetchEvents();
 } catch {
 toast.error(t("cal.createFailed"));
 } finally {
 setSubmitting(false);
 }
 };

 const handleDelete = async (event: CalendarEvent) => {
 const ok = await confirm({
 title: t("cal.deleteTitle"),
 message: t("cal.deleteMsg").replace("{title}", event.title),
 confirmLabel: t("common.delete"),
 variant: "danger",
 });
 if (!ok) return;
 const eventId = event.id;
 try {
 await apiClient.delete(`/calendar/events/${eventId}`);
 toast.success(t("cal.deleted"));
 setSelectedEvent(null);
 fetchEvents();
 } catch {
 toast.error(t("cal.deleteFailed"));
 }
 };

 const calendarEvents = events.map((ev) => ({
 id: ev.id,
 title: ev.title,
 start: ev.start_time,
 end: ev.end_time || undefined,
 allDay: ev.all_day,
 backgroundColor: EVENT_COLORS[ev.event_type] || EVENT_COLORS.custom,
 borderColor: EVENT_COLORS[ev.event_type] || EVENT_COLORS.custom,
 }));

 if (loading) {
 return (
 <div className="flex h-96 items-center justify-center">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {/* Legend + Create */}
 <div className="flex flex-wrap items-center justify-between gap-2">
 <div className="flex flex-wrap gap-3">
 {Object.entries(EVENT_COLORS).map(([type, color]) => (
 <span key={type} className="flex items-center gap-1.5 text-xs text-text-muted ">
 <span className="h-2.5 w-2.5 rounded-pill" style={{ backgroundColor: color }} />
 {t(`cal.${type}`)}
 </span>
 ))}
 </div>
 {canCreate && (
 <button
 onClick={() => { setShowForm(!showForm); setSelectedEvent(null); }}
 className="flex items-center gap-1.5 rounded-pill bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
 >
 <Plus className="h-4 w-4" aria-hidden="true" /> {t("cal.newEvent")}
 </button>
 )}
 </div>

 {/* Create Form */}
 {showForm && canCreate && (
 <form onSubmit={handleSubmit} className="rounded-lg border border-border-strong bg-surface p-4 ">
 <div className="mb-3 flex items-center justify-between">
 <h3 className="text-sm font-semibold text-text ">{t("cal.newEvent")}</h3>
 <button type="button" onClick={() => setShowForm(false)} aria-label={t("common.close")} className="text-text-subtle hover:text-text-muted">
 <X className="h-4 w-4" aria-hidden="true" />
 </button>
 </div>
 <div className="grid gap-3 sm:grid-cols-2">
 <input
 placeholder={t("common.title")}
 aria-label={t("common.title")}
 value={form.title}
 onChange={(e) => setForm({ ...form, title: e.target.value })}
 required
 className="rounded-lg border border-border-strong px-3 py-2 text-sm "
 />
 <select
 value={form.event_type}
 onChange={(e) => setForm({ ...form, event_type: e.target.value })}
 className="rounded-lg border border-border-strong px-3 py-2 text-sm "
 >
 <option value="custom">{t("cal.custom")}</option>
 <option value="lesson">{t("cal.lesson")}</option>
 <option value="meeting">{t("cal.meeting")}</option>
 <option value="deadline">{t("cal.deadline")}</option>
 </select>
 <input
 type="datetime-local"
 value={form.start_time}
 onChange={(e) => setForm({ ...form, start_time: e.target.value })}
 aria-label={t("cal.start")}
 required
 className="rounded-lg border border-border-strong px-3 py-2 text-sm "
 />
 <input
 type="datetime-local"
 value={form.end_time}
 onChange={(e) => setForm({ ...form, end_time: e.target.value })}
 aria-label={t("cal.end")}
 className="rounded-lg border border-border-strong px-3 py-2 text-sm "
 />
 <textarea
 placeholder={t("cal.descPlaceholder")}
 aria-label={t("cal.descPlaceholder")}
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 className="rounded-lg border border-border-strong px-3 py-2 text-sm sm:col-span-2 "
 rows={2}
 />
 </div>
 <div className="mt-3 flex justify-end">
 <button
 type="submit"
 disabled={submitting}
 className="flex items-center gap-2 rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50"
 >
 {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
 {t("cal.createEvent")}
 </button>
 </div>
 </form>
 )}

 {/* Event Detail Popup */}
 {selectedEvent && (
 <div className="rounded-lg border border-border-strong bg-surface p-4 ">
 <div className="flex items-start justify-between">
 <div>
 <h3 className="text-sm font-semibold text-text ">{selectedEvent.title}</h3>
 <p className="mt-1 text-xs text-text-muted ">
 <span
 className="mr-2 inline-block h-2 w-2 rounded-pill"
 style={{ backgroundColor: EVENT_COLORS[selectedEvent.event_type] }}
 />
 {t(`cal.${selectedEvent.event_type}`)} &middot; {new Date(selectedEvent.start_time).toLocaleString(locale)}
 {selectedEvent.end_time && ` — ${new Date(selectedEvent.end_time).toLocaleString(locale)}`}
 </p>
 {selectedEvent.description && (
 <p className="mt-2 text-sm text-text-muted ">{selectedEvent.description}</p>
 )}
 </div>
 <div className="flex gap-2">
 {canCreate && selectedEvent.source !== "assignment" && selectedEvent.created_by === user?.id && (
 <button
 onClick={() => handleDelete(selectedEvent)}
 className="rounded-lg bg-danger-soft px-3 py-1 text-xs font-medium text-danger-fg hover:bg-danger-soft "
 >
 {t("common.delete")}
 </button>
 )}
 <button
 onClick={() => setSelectedEvent(null)}
 aria-label={t("common.close")}
 className="text-text-subtle hover:text-text-muted"
 >
 <X className="h-4 w-4" aria-hidden="true" />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Calendar */}
 <div className="rounded-lg border border-border-strong bg-surface p-2 [&_.fc]:text-sm [&_.fc-toolbar]:!flex-wrap [&_.fc-toolbar]:!gap-2 [&_.fc-button]:!rounded-lg [&_.fc-button]:!border-0 [&_.fc-button]:!bg-primary [&_.fc-button]:!text-primary-fg [&_.fc-button]:!shadow-none [&_.fc-button-active]:!bg-primary-hover [&_.fc-button:hover]:!bg-primary-hover [&_.fc-daygrid-day]: [&_.fc-day-today]:!bg-success-soft [&_.fc-day-today]: [&_.fc-theme-standard_td]:!border-border [&_.fc-theme-standard_td]: [&_.fc-theme-standard_th]:!border-border [&_.fc-theme-standard_th]:!bg-transparent [&_.fc-col-header-cell-cushion]:!text-text-muted [&_.fc-col-header-cell-cushion]: [&_.fc-daygrid-day-number]:!text-text-muted [&_.fc-daygrid-day-number]: [&_.fc-toolbar-title]:!text-lg [&_.fc-toolbar-title]:!font-semibold [&_.fc-toolbar-title]:!text-text [&_.fc-toolbar-title]:">
 <FullCalendar
 ref={calendarRef}
 plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
 locales={FC_LOCALES}
 locale={locale}
 initialView="dayGridMonth"
 headerToolbar={{
 left: "prev,next today",
 center: "title",
 right: "dayGridMonth,timeGridWeek,timeGridDay",
 }}
 events={calendarEvents}
 dateClick={handleDateClick}
 eventClick={handleEventClick}
 datesSet={handleDateSet}
 height="auto"
 editable={false}
 selectable={canCreate}
 />
 </div>
 </div>
 );
}
