"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateSlot,
  useDeleteSlot,
  useScheduleWeek,
  useUpdateSlot,
  type ScheduleSlot,
} from "@/lib/api/schedule";

interface CourseOption {
  id: string;
  title: string;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

interface FormState {
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  course_id: "",
  day_of_week: 0,
  start_time: "09:00",
  end_time: "10:00",
  location: "",
  note: "",
};

export default function AdminSchedulePage() {
  const { t } = useTranslation();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<CourseOption[]>("/admin/courses")
      .then(({ data }) => setCourses(data))
      .catch(() => {});
  }, []);

  const weekQuery = useScheduleWeek();
  const createMutation = useCreateSlot();
  const updateMutation = useUpdateSlot();
  const deleteMutation = useDeleteSlot();

  const byDay = useMemo(() => {
    const map: Record<number, ScheduleSlot[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    };
    for (const slot of weekQuery.data?.slots ?? []) {
      if (map[slot.day_of_week]) map[slot.day_of_week].push(slot);
    }
    for (const day of DAYS) {
      map[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [weekQuery.data]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (slot: ScheduleSlot) => {
    setEditingId(slot.id);
    setForm({
      course_id: slot.course_id,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      location: slot.location,
      note: slot.note,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_id) return;
    if (form.end_time <= form.start_time) {
      toast.error(t("schedule.invalidTimes"));
      return;
    }

    if (editingId) {
      updateMutation.mutate(
        {
          slotId: editingId,
          body: {
            day_of_week: form.day_of_week,
            start_time: form.start_time,
            end_time: form.end_time,
            location: form.location,
            note: form.note,
          },
        },
        {
          onSuccess: () => {
            toast.success(t("schedule.updated"));
            resetForm();
          },
          onError: () => toast.error(t("schedule.saveFailed")),
        },
      );
    } else {
      createMutation.mutate(
        {
          course_id: form.course_id,
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
          location: form.location,
          note: form.note,
        },
        {
          onSuccess: () => {
            toast.success(t("schedule.created"));
            resetForm();
          },
          onError: () => toast.error(t("schedule.saveFailed")),
        },
      );
    }
  };

  const handleDelete = (slotId: string) => {
    deleteMutation.mutate(slotId, {
      onSuccess: () => {
        toast.success(t("schedule.deleted"));
        if (editingId === slotId) resetForm();
      },
      onError: () => toast.error(t("schedule.deleteFailed")),
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <CalendarClock className="h-6 w-6 text-primary" />
          {t("schedule.adminTitle")}
        </h1>
        <p className="text-base text-text-muted">{t("schedule.adminSubtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t("schedule.course")}
              <select
                value={form.course_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, course_id: e.target.value }))
                }
                disabled={!!editingId}
                className="rounded-lg border border-border-strong px-3 py-2 text-sm disabled:opacity-60"
                required
              >
                <option value="">{t("schedule.selectCourse")}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t("schedule.dayOfWeek")}
              <select
                value={form.day_of_week}
                onChange={(e) =>
                  setForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))
                }
                className="rounded-lg border border-border-strong px-3 py-2 text-sm"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {t(`schedule.day.${d}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t("schedule.startTime")}
              <input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_time: e.target.value }))
                }
                className="rounded-lg border border-border-strong px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t("schedule.endTime")}
              <input
                type="time"
                value={form.end_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_time: e.target.value }))
                }
                className="rounded-lg border border-border-strong px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              {t("schedule.location")}
              <input
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                placeholder={t("schedule.locationPlaceholder")}
                className="rounded-lg border border-border-strong px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
              {t("schedule.note")}
              <input
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                placeholder={t("schedule.notePlaceholder")}
                className="min-w-[8rem] rounded-lg border border-border-strong px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving || !form.course_id}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingId ? t("schedule.save") : t("schedule.addSlot")}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-2 text-sm font-medium text-text-muted hover:bg-ink-200"
                >
                  <X className="h-4 w-4" />
                  {t("schedule.cancel")}
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {weekQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {DAYS.map((day) => (
            <div key={day} className="space-y-2">
              <h2 className="text-sm font-semibold text-text">
                {t(`schedule.day.${day}`)}
              </h2>
              {byDay[day].length === 0 ? (
                <p className="text-xs text-text-subtle">
                  {t("schedule.noSlotsDay")}
                </p>
              ) : (
                byDay[day].map((slot) => (
                  <Card key={slot.id}>
                    <CardContent className="space-y-1 p-3">
                      <div className="text-sm font-medium text-text">
                        {slot.course_title}
                      </div>
                      <div className="text-xs text-text-muted">
                        {slot.start_time}–{slot.end_time}
                      </div>
                      {slot.location && (
                        <div className="flex items-center gap-1 text-xs text-text-subtle">
                          <MapPin className="h-3 w-3" />
                          {slot.location}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => startEdit(slot)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Pencil className="h-3 w-3" />
                          {t("schedule.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(slot.id)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 text-xs text-danger-fg hover:underline disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("schedule.delete")}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
