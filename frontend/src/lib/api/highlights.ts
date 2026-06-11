/**
 * Typed wrappers + TanStack Query hooks for the theory text-annotation API
 * (backend: app/progress/router.py, lesson_highlights table).
 *
 * A highlight anchors into the plain textContent of the rendered lesson body
 * (`.lms-lesson-content` wrapper) as [start_offset, end_offset). The stored
 * snippet is compared on re-anchor: if the lesson text changed and no longer
 * matches, the mark is silently dropped instead of marking the wrong words.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";

export type HighlightKind = "highlight" | "underline";

export interface LessonHighlight {
  id: string;
  lesson_id: string;
  /** Scopes the anchor to one rendered text block ("block-0", "legacy"). */
  block_key: string;
  start_offset: number;
  end_offset: number;
  kind: HighlightKind;
  text_snippet: string | null;
  created_at: string;
}

export async function fetchHighlights(lessonId: string): Promise<LessonHighlight[]> {
  const { data } = await apiClient.get<LessonHighlight[]>(
    `/progress/lessons/${lessonId}/highlights`
  );
  return data;
}

export function useHighlights(lessonId: string | null | undefined) {
  return useQuery({
    queryKey: ["lesson-highlights", lessonId],
    queryFn: () => fetchHighlights(lessonId as string),
    enabled: !!lessonId,
    staleTime: 60_000,
  });
}

export interface CreateHighlightInput {
  lessonId: string;
  blockKey: string;
  startOffset: number;
  endOffset: number;
  kind: HighlightKind;
  textSnippet?: string;
}

export function useCreateHighlight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateHighlightInput) => {
      const { data } = await apiClient.post<LessonHighlight>(
        `/progress/lessons/${input.lessonId}/highlights`,
        {
          block_key: input.blockKey,
          start_offset: input.startOffset,
          end_offset: input.endOffset,
          kind: input.kind,
          text_snippet: input.textSnippet ?? null,
        }
      );
      return data;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ["lesson-highlights", input.lessonId],
      });
    },
  });
}

export function useDeleteHighlight(lessonId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (highlightId: string) => {
      await apiClient.delete(`/progress/highlights/${highlightId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["lesson-highlights", lessonId],
      });
    },
  });
}
