import apiClient from "@/lib/api-client";

/**
 * Lesson recordings.
 *
 * These calls used to sit inline in the pages that made them. They are here
 * now because two surfaces need them — the lesson list and the post-lesson
 * review — and because the convention puts server calls in lib/api/*.
 */

export interface Recording {
  id: string;
  user_id: string;
  org_id: string;
  type: string;
  /** Null until there are bytes to serve. The watch button waits for it. */
  download_url: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  status: string;
  created_at: string | null;
  /** Null for anything recorded outside a lesson. */
  live_lesson_id: string | null;
  shared_with_group: boolean;
}

/**
 * The server decides what you may see: staff get the school's recordings, a
 * pupil gets their own plus whatever a teacher shared with the group. The
 * client does not filter this a second time.
 */
export async function fetchRecordings(): Promise<Recording[]> {
  const { data } = await apiClient.get<Recording[]>("/recordings");
  return data;
}

export async function setRecordingShared(id: string, shared: boolean): Promise<void> {
  await apiClient.patch(`/recordings/${id}`, { shared_with_group: shared });
}

/** Refused by the server for anyone below admin; the button is only chrome. */
export async function deleteRecording(id: string): Promise<void> {
  await apiClient.delete(`/recordings/${id}`);
}
