import type { APIRequestContext } from "@playwright/test";

const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";

/**
 * Course-editor surface POM.
 *
 * Phase 3 implements API-only helpers: the lifecycle.spec creates 24
 * exercises per run via the same POST /api/v1/exercises that the UI
 * editor calls, then a separate UI test (roles/teacher.spec.ts) covers
 * the editor screen. Splitting like this avoids depending on per-type
 * data-testid attributes that don't all exist yet.
 */
export class CourseEditorPage {
  static async createExerciseViaApi(
    request: APIRequestContext,
    accessToken: string,
    body: {
      lesson_id: string;
      exercise_type: string;
      title: string;
      config: Record<string, unknown>;
    },
  ): Promise<{ id: string; exercise_type: string }> {
    const res = await request.post(`${API_URL}/api/v1/exercises`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: body,
    });
    if (!res.ok()) {
      throw new Error(
        `createExerciseViaApi: ${res.status()} ${await res.text()}`,
      );
    }
    return (await res.json()) as { id: string; exercise_type: string };
  }

  static async addQuestionViaApi(
    request: APIRequestContext,
    accessToken: string,
    exerciseId: string,
    body: {
      question_text: string;
      question_type: "multiple_choice" | "text_answer";
      options?: Array<{ text: string; is_correct?: boolean }>;
      correct_answer?: string | null;
      points?: number;
    },
  ): Promise<{ id: string }> {
    const res = await request.post(
      `${API_URL}/api/v1/exercises/${exerciseId}/questions`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: body,
      },
    );
    if (!res.ok()) {
      throw new Error(
        `addQuestionViaApi: ${res.status()} ${await res.text()}`,
      );
    }
    return (await res.json()) as { id: string };
  }

  static async addTestCaseViaApi(
    request: APIRequestContext,
    accessToken: string,
    exerciseId: string,
    body: { input?: string; expected_output: string; is_hidden?: boolean },
  ): Promise<{ id: string }> {
    const res = await request.post(
      `${API_URL}/api/v1/exercises/${exerciseId}/test-cases`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: body,
      },
    );
    if (!res.ok()) {
      throw new Error(
        `addTestCaseViaApi: ${res.status()} ${await res.text()}`,
      );
    }
    return (await res.json()) as { id: string };
  }
}
