import apiClient from "@/lib/api-client";

export type ExerciseType =
  | "quiz"
  | "code_challenge"
  | "matching"
  | "ordering"
  | "fill_blanks"
  | "true_false"
  | "categorize"
  | "file_upload"
  | "robot_2d"
  | "math_interactive"
  | "world_3d"
  | "translation"
  | "sentence_builder"
  | "dialogue"
  | "conjugation"
  | "reading";

export interface Exercise {
  id: string;
  lesson_id: string;
  org_id: string;
  display_id: string;
  exercise_type: ExerciseType;
  title: string;
  config: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
  questions?: ExerciseQuestion[];
  test_cases?: ExerciseTestCase[];
}

export interface ExerciseQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: Array<{ id?: number; text: string; is_correct?: boolean }> | null;
  correct_answer: string | null;
  points: number;
  sort_order: number;
}

export interface ExerciseTestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  sort_order: number;
}

export interface ExerciseSubmission {
  id: string;
  exercise_id: string;
  student_id: string;
  answers: Record<string, unknown> | null;
  score: number | null;
  passed: boolean | null;
  status: string;
  source_code: string | null;
  language: string | null;
  execution_time_ms: number | null;
  total_passed: number | null;
  total_tests: number | null;
  results: Record<string, unknown> | null;
  original_filename: string | null;
  file_size: number | null;
  mime_type: string | null;
  submitted_at: string;
  graded_at: string | null;
  created_at: string;
  student_name?: string;
}

export interface ExerciseListResponse {
  items: Exercise[];
  total: number;
  page: number;
  per_page: number;
}

export interface SubmissionListResponse {
  items: ExerciseSubmission[];
  total: number;
  page: number;
  per_page: number;
}

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  quiz: "Quiz",
  code_challenge: "Code Challenge",
  matching: "Matching",
  ordering: "Ordering",
  fill_blanks: "Fill Blanks",
  true_false: "True/False",
  categorize: "Categorize",
  file_upload: "File Upload",
  robot_2d: "2D Robot",
  math_interactive: "Math Interactive",
  world_3d: "3D World",
  translation: "Translation",
  sentence_builder: "Sentence Builder",
  dialogue: "Dialogue",
  conjugation: "Conjugation",
  reading: "Reading",
};

export const EXERCISE_TYPE_COLORS: Record<ExerciseType, string> = {
  quiz: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  code_challenge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  matching: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ordering: "bg-sun-100 text-sun-700 dark:bg-sun-700/30 dark:text-sun-300",
  fill_blanks: "bg-coral-50 text-coral-700 dark:bg-coral-700/30 dark:text-coral-300",
  true_false: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  categorize: "bg-sun-100 text-sun-700 dark:bg-sun-700/30 dark:text-sun-300",
  file_upload: "bg-ink-100 text-ink-700 dark:bg-ink-700/30 dark:text-ink-300",
  robot_2d: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  math_interactive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  world_3d: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  translation: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  sentence_builder: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  dialogue: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
  conjugation: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  reading: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export const exercisesApi = {
  list: (params?: {
    exercise_type?: ExerciseType;
    lesson_id?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get<ExerciseListResponse>("/exercises", { params }),

  get: (id: string) => apiClient.get<Exercise>(`/exercises/${id}`),

  getByLesson: (lessonId: string) =>
    apiClient.get<Exercise[]>(`/exercises/by-lesson/${lessonId}`),

  create: (data: {
    lesson_id: string;
    exercise_type: ExerciseType;
    title: string;
    config?: Record<string, unknown>;
    sort_order?: number;
  }) => apiClient.post<Exercise>("/exercises", data),

  update: (id: string, data: { title?: string; config?: Record<string, unknown>; sort_order?: number }) =>
    apiClient.put<Exercise>(`/exercises/${id}`, data),

  delete: (id: string) => apiClient.delete(`/exercises/${id}`),

  // Submissions
  submit: (id: string, data: Record<string, unknown>) =>
    apiClient.post<ExerciseSubmission>(`/exercises/${id}/submit`, data),

  uploadFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<ExerciseSubmission>(`/exercises/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  listSubmissions: (id: string, params?: { page?: number; per_page?: number }) =>
    apiClient.get<SubmissionListResponse>(`/exercises/${id}/submissions`, { params }),

  // Questions (quiz exercises)
  addQuestion: (exerciseId: string, data: Record<string, unknown>) =>
    apiClient.post<ExerciseQuestion>(`/exercises/${exerciseId}/questions`, data),

  updateQuestion: (exerciseId: string, questionId: string, data: Record<string, unknown>) =>
    apiClient.put<ExerciseQuestion>(`/exercises/${exerciseId}/questions/${questionId}`, data),

  deleteQuestion: (exerciseId: string, questionId: string) =>
    apiClient.delete(`/exercises/${exerciseId}/questions/${questionId}`),

  // Test cases (code challenge exercises)
  addTestCase: (exerciseId: string, data: Record<string, unknown>) =>
    apiClient.post<ExerciseTestCase>(`/exercises/${exerciseId}/test-cases`, data),

  deleteTestCase: (exerciseId: string, testCaseId: string) =>
    apiClient.delete(`/exercises/${exerciseId}/test-cases/${testCaseId}`),
};
