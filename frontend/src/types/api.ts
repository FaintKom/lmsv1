export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student" | "super_admin";
  org_id: string;
  avatar_url: string | null;
  is_active: boolean;
  is_methodist: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  status: "draft" | "published" | "archived";
  category: string | null;
  teacher_id: string;
  is_template: boolean;
  source_course_id: string | null;
  template_version: number;
  created_at: string;
  updated_at: string;
  modules?: Module[];
}

export interface Module {
  id: string;
  title: string;
  sort_order: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  content_type: "text" | "video" | "quiz" | "code_challenge" | "file_upload" | "interactive";
  content: Record<string, unknown>;
  sort_order: number;
  duration_minutes: number | null;
}

export interface CodeChallenge {
  id: string;
  title: string;
  description: string;
  language: string;
  starter_code: string | null;
  time_limit_seconds: number;
  memory_limit_mb: number;
  test_cases: TestCase[];
}

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface CodeSubmission {
  id: string;
  source_code: string;
  language: string;
  status: "pending" | "running" | "passed" | "failed" | "error" | "timeout";
  results: TestResult[] | null;
  total_passed: number;
  total_tests: number;
  execution_time_ms: number | null;
  submitted_at: string;
}

export interface TestResult {
  test_case_id: string;
  passed: boolean;
  actual_output: string;
  time_ms: number;
}

export interface Enrollment {
  id: string;
  course_id: string;
  progress_percent: number;
  enrolled_at: string;
  completed_at: string | null;
  course?: Course;
}

export interface FileSubmission {
  id: string;
  lesson_id: string;
  student_id: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface InteractiveSubmission {
  id: string;
  lesson_id: string;
  exercise_type: string;
  score: number | null;
  passed: boolean | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
