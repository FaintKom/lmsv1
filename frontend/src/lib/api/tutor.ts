import apiClient from "@/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";

// ---------- types (mirror backend app/tutor/router.py schemas) ----------

export interface AskRequest {
  question: string;
}

export interface AskResponse {
  answer: string;
}

/** Which message the widget should show. The backend distinguishes these on
 *  purpose: "not configured" is an admin problem, "unavailable" is a provider
 *  hiccup worth retrying, and "limit" is the user's own quota. */
export type AskFailure =
  | "unconfigured" // 503 — no API key set for this deployment
  | "unavailable" // 502 — provider unreachable or returned nonsense
  | "limit" // 429 — daily question limit spent
  | "noText" // 422 — lesson carries nothing to ask about
  | "generic";

export function askFailureFrom(error: unknown): AskFailure {
  const status = (error as AxiosError)?.response?.status;
  if (status === 503) return "unconfigured";
  if (status === 502) return "unavailable";
  if (status === 429) return "limit";
  if (status === 422) return "noText";
  return "generic";
}

export async function askAboutLesson(
  lessonId: string,
  question: string,
): Promise<AskResponse> {
  const { data } = await apiClient.post<AskResponse>(
    `/tutor/lessons/${lessonId}/ask`,
    { question } satisfies AskRequest,
    // 503 (not configured), 502 (provider down) and 429 (daily limit) are
    // final answers here, not cold-start symptoms. Without this the shared
    // interceptor retries them five times over ~60s and spends the quota.
    { skipWakeRetry: true } as never,
  );
  return data;
}

/** No global error toast here: the widget renders failures inline, next to the
 *  question that caused them. */
export function useAskLesson(lessonId: string) {
  return useMutation({
    mutationFn: (question: string) => askAboutLesson(lessonId, question),
  });
}
