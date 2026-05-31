/**
 * Typed wrapper around GET /api/v1/admin/students/{studentId}/profile.
 *
 * Response shape mirrors the backend aggregation in
 * app/admin/student_profile_service.py::get_student_profile.
 */
import apiClient from "@/lib/api-client";

export interface StudentProfileIdentity {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string | null;
  last_active_at: string | null;
}

export interface StudentProfileEnrollment {
  course_id: string;
  course_title: string;
  progress_percent: number;
  enrolled_at: string | null;
  completed_at: string | null;
}

export interface SubmissionSummary {
  total: number;
  graded: number;
  avg_score: number | null;
  pass_rate: number | null;
  avg_attempts: number | null;
  avg_time_spent_seconds: number | null;
}

export interface RecentSubmission {
  submission_id: string;
  task_id: string;
  task_type: "exercise" | "quiz" | "assignment";
  exercise_type: string;
  title: string;
  score: number | null;
  passed: boolean | null;
  status?: string;
  attempt_number: number | null;
  time_spent_seconds: number | null;
  submitted_at: string | null;
  quiz_id: string | null;
}

export interface ProfileBadge {
  badge_id: string;
  name: string;
  icon: string;
  earned_at: string | null;
}

export interface ProfileGamification {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  badges: ProfileBadge[];
}

export interface ProfileCertificate {
  course_id: string;
  course_title: string;
  certificate_number: string;
  issued_at: string | null;
}

export interface StudentProfile {
  student: StudentProfileIdentity;
  enrollments: StudentProfileEnrollment[];
  completed_courses: number;
  submissions: {
    exercises: SubmissionSummary;
    quizzes: SubmissionSummary;
    assignments: SubmissionSummary;
  };
  total_submissions: number;
  recent_submissions: RecentSubmission[];
  gamification: ProfileGamification;
  certificates: ProfileCertificate[];
}

export async function getStudentProfile(studentId: string): Promise<StudentProfile> {
  const { data } = await apiClient.get<StudentProfile>(
    `/admin/students/${studentId}/profile`,
  );
  return data;
}
