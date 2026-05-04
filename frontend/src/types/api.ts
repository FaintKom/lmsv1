export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student" | "super_admin" | "parent";
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

export interface LessonBlock {
  id: string;
  type: "text" | "html" | "video" | "exercise";
  sort_order: number;
  page: number;
  body?: string | Record<string, unknown>;
  format?: string;
  url?: string;
  exercise_id?: string;
}

export interface Lesson {
  id: string;
  title: string;
  content_type: "text" | "video" | "quiz" | "code_challenge" | "file_upload" | "interactive";
  content: Record<string, unknown> & { version?: number; blocks?: LessonBlock[] };
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

export interface Assignment {
  id: string;
  course_id: string;
  group_id: string | null;
  created_by: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  allow_late: boolean;
  created_at: string;
  updated_at: string;
  submission_count?: number;
  course_title?: string;
}

export interface AssignmentListItem {
  id: string;
  course_id: string;
  title: string;
  due_date: string;
  max_score: number;
  allow_late: boolean;
  created_at: string;
  course_title: string | null;
  status: string | null;
  score: number | null;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name?: string;
  content: string | null;
  file_path: string | null;
  original_filename: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  status: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: "deadline" | "lesson" | "meeting" | "custom";
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  course_id: string | null;
  group_id: string | null;
  created_by: string;
  recurrence: string | null;
  source?: "event" | "assignment";
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  room_url: string;
  course_id: string | null;
  created_by: string;
  scheduled_at: string | null;
  duration_minutes: number;
  is_active: boolean;
  ended_at: string | null;
  recording_url: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
