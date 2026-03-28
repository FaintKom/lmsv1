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
  | "world_3d";

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
};

export const EXERCISE_TYPE_COLORS: Record<ExerciseType, string> = {
  quiz: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  code_challenge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  matching: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  ordering: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  fill_blanks: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  true_false: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  categorize: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  file_upload: "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300",
  robot_2d: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  math_interactive: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  world_3d: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
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
