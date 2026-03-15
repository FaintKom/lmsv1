"use client";

import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calendar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          View your schedule, deadlines, and events
        </p>
      </div>
      <CalendarView canCreate={false} />
    </div>
  );
}
