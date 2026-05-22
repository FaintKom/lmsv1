import type { APIRequestContext } from "@playwright/test";

const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";

/**
 * Submit-side POM. lifecycle.spec drives this for all 24 fixture types
 * via API; UI submission flow (which differs per type and depends on
 * data-testid coverage) is covered separately by role specs.
 *
 * SubmitExerciseRequest is a union of per-type field sets (see
 * backend/app/exercises/schemas.py). The helpers accept any subset.
 */
export interface SubmitResponse {
  id: string;
  exercise_id: string;
  score: number | null;
  passed: boolean | null;
  status: string;
}

export class ExerciseRendererPage {
  static async submitViaApi(
    request: APIRequestContext,
    accessToken: string,
    exerciseId: string,
    body: {
      answers?: Array<{ question_id: string; selected_option?: string; text?: string }>;
      source_code?: string;
      language?: string;
      interactive_answers?: Record<string, unknown>;
      game_result?: Record<string, unknown>;
      web_code?: { html?: string; css?: string; js?: string };
    },
  ): Promise<SubmitResponse> {
    const res = await request.post(
      `${API_URL}/api/v1/exercises/${exerciseId}/submit`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: body,
      },
    );
    if (!res.ok()) {
      throw new Error(`submitViaApi: ${res.status()} ${await res.text()}`);
    }
    return (await res.json()) as SubmitResponse;
  }
}
