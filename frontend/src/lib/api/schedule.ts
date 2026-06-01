/**
 * Typed wrappers + TanStack Query hooks around /api/v1/schedule/* endpoints.
 *
 * Response shapes mirror backend handlers in app/schedule/router.py. Times are
 * "HH:MM" strings; day_of_week is 0=Monday … 6=Sunday.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";

/** One overlapping booking returned in a 409 `room_conflict` payload. */
export interface RoomConflict {
  slot_id: string;
  course_title: string;
  start_time: string;
  end_time: string;
}

export interface ScheduleSlot {
  id: string;
  org_id: string;
  course_id: string;
  course_title: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  room_id: string | null;
  room_name: string | null;
  note: string;
  active: boolean;
  is_online: boolean;
  room_url: string | null;
  // Present (non-blocking) when a slot was saved with ?force=true despite a clash.
  warning?: { code: string; conflicts: RoomConflict[] };
}

export interface SlotsResponse {
  slots: ScheduleSlot[];
}

export interface SlotCreate {
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  room_id?: string | null;
  note?: string;
  is_online?: boolean;
}

export interface SlotUpdate {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  location?: string;
  room_id?: string | null;
  note?: string;
  active?: boolean;
  is_online?: boolean;
}

// ── Raw API functions ──────────────────────────────────────────────────

export async function fetchWeek(): Promise<SlotsResponse> {
  const { data } = await apiClient.get<SlotsResponse>("/schedule/week");
  return data;
}

export async function fetchMySchedule(): Promise<SlotsResponse> {
  const { data } = await apiClient.get<SlotsResponse>("/schedule/my");
  return data;
}

export async function fetchCourseSlots(
  courseId: string,
): Promise<SlotsResponse> {
  const { data } = await apiClient.get<SlotsResponse>("/schedule", {
    params: { course_id: courseId },
  });
  return data;
}

export async function createSlot(
  body: SlotCreate,
  force = false,
): Promise<ScheduleSlot> {
  const { data } = await apiClient.post<ScheduleSlot>("/schedule", body, {
    params: force ? { force: true } : {},
  });
  return data;
}

export async function updateSlot(
  slotId: string,
  body: SlotUpdate,
  force = false,
): Promise<ScheduleSlot> {
  const { data } = await apiClient.put<ScheduleSlot>(
    `/schedule/${slotId}`,
    body,
    { params: force ? { force: true } : {} },
  );
  return data;
}

export async function deleteSlot(slotId: string): Promise<void> {
  await apiClient.delete(`/schedule/${slotId}`);
}

// ── Query hooks ────────────────────────────────────────────────────────

export function useScheduleWeek() {
  return useQuery({
    queryKey: ["schedule", "week"],
    queryFn: fetchWeek,
  });
}

export function useMySchedule() {
  return useQuery({
    queryKey: ["schedule", "my"],
    queryFn: fetchMySchedule,
  });
}

export function useCourseSlots(courseId: string) {
  return useQuery({
    queryKey: ["schedule", "course", courseId],
    queryFn: () => fetchCourseSlots(courseId),
    enabled: !!courseId,
  });
}

function useInvalidateSchedule() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["schedule"] });
  };
}

export function useCreateSlot() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: ({ body, force }: { body: SlotCreate; force?: boolean }) =>
      createSlot(body, force),
    onSuccess: invalidate,
  });
}

export function useUpdateSlot() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: ({
      slotId,
      body,
      force,
    }: {
      slotId: string;
      body: SlotUpdate;
      force?: boolean;
    }) => updateSlot(slotId, body, force),
    onSuccess: invalidate,
  });
}

export function useDeleteSlot() {
  const invalidate = useInvalidateSchedule();
  return useMutation({
    mutationFn: (slotId: string) => deleteSlot(slotId),
    onSuccess: invalidate,
  });
}
