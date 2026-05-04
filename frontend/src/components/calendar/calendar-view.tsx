"use client";

import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { CalendarEvent } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { Plus, X, Loader2 } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  deadline: "#ff7a5c",
  lesson: "#3b82f6",
  meeting: "#3fb04b",
  custom: "#8b5cf6",
};

interface Props {
  canCreate?: boolean;
}

export function CalendarView({ canCreate = false }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const user = useAuthStore((s) => s.user);

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
      toast.error("Failed to load events");
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
      toast.success("Event created");
      setShowForm(false);
      setForm({ title: "", description: "", event_type: "custom", start_time: "", end_time: "", all_day: false });
      fetchEvents();
    } catch {
      toast.error("Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await apiClient.delete(`/calendar/events/${eventId}`);
      toast.success("Event deleted");
      setSelectedEvent(null);
      fetchEvents();
    } catch {
      toast.error("Failed to delete event");
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
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend + Create */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-3">
          {Object.entries(EVENT_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-ink-700 dark:text-ink-400">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          ))}
        </div>
        {canCreate && (
          <button
            onClick={() => { setShowForm(!showForm); setSelectedEvent(null); }}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" /> New Event
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && canCreate && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#232323]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-200">New Event</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#181818] dark:text-ink-200"
            />
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#181818] dark:text-ink-200"
            >
              <option value="custom">Custom</option>
              <option value="lesson">Lesson</option>
              <option value="meeting">Meeting</option>
              <option value="deadline">Deadline</option>
            </select>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              required
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#181818] dark:text-ink-200"
            />
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#181818] dark:text-ink-200"
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm sm:col-span-2 dark:border-white/10 dark:bg-[#181818] dark:text-ink-200"
              rows={2}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Event
            </button>
          </div>
        </form>
      )}

      {/* Event Detail Popup */}
      {selectedEvent && (
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#232323]">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-200">{selectedEvent.title}</h3>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: EVENT_COLORS[selectedEvent.event_type] }}
                />
                {selectedEvent.event_type} &middot; {new Date(selectedEvent.start_time).toLocaleString()}
                {selectedEvent.end_time && ` — ${new Date(selectedEvent.end_time).toLocaleString()}`}
              </p>
              {selectedEvent.description && (
                <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">{selectedEvent.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {canCreate && selectedEvent.source !== "assignment" && selectedEvent.created_by === user?.id && (
                <button
                  onClick={() => handleDelete(selectedEvent.id)}
                  className="rounded-lg bg-coral-50 px-3 py-1 text-xs font-medium text-coral-500 hover:bg-coral-50 dark:bg-coral-500/10 dark:text-coral-300"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-ink-400 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-xl border border-ink-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#232323] [&_.fc]:text-sm [&_.fc-button]:!rounded-lg [&_.fc-button]:!border-0 [&_.fc-button]:!bg-green-600 [&_.fc-button]:!text-white [&_.fc-button]:!shadow-none [&_.fc-button-active]:!bg-green-700 [&_.fc-button:hover]:!bg-green-700 [&_.fc-daygrid-day]:dark:!bg-[#1a1a1a] [&_.fc-day-today]:!bg-green-50 [&_.fc-day-today]:dark:!bg-green-500/10 [&_.fc-theme-standard_td]:!border-ink-100 [&_.fc-theme-standard_td]:dark:!border-white/5 [&_.fc-theme-standard_th]:!border-ink-100 [&_.fc-theme-standard_th]:dark:!border-white/5 [&_.fc-col-header-cell-cushion]:!text-ink-500 [&_.fc-col-header-cell-cushion]:dark:!text-ink-400 [&_.fc-daygrid-day-number]:!text-ink-700 [&_.fc-daygrid-day-number]:dark:!text-ink-300 [&_.fc-toolbar-title]:!text-lg [&_.fc-toolbar-title]:!font-semibold [&_.fc-toolbar-title]:!text-ink-900 [&_.fc-toolbar-title]:dark:!text-ink-100">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
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
