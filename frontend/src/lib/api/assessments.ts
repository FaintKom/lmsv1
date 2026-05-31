import apiClient from "@/lib/api-client";

export interface QuizOption {
 id?: number | string;
 text: string;
 is_correct?: boolean;
}

export interface QuestionBreakdown {
 question_id: string;
 question_text: string;
 question_type: "multiple_choice" | "text_answer";
 options: QuizOption[] | null;
 student_answer: string | null;
 correct_answer: string | null;
 is_correct: boolean;
 points: number;
 points_earned: number;
}

export interface SubmissionBreakdown {
 submission_id: string;
 quiz_id: string;
 quiz_title: string;
 passing_score: number;
 student_id: string;
 student_name: string | null;
 student_email: string | null;
 score: number | null;
 passed: boolean | null;
 submitted_at: string;
 total_points: number;
 earned_points: number;
 questions: QuestionBreakdown[];
}

/** Teacher-facing per-question breakdown of a specific submission. */
export async function getSubmissionBreakdown(
 submissionId: string,
): Promise<SubmissionBreakdown> {
 const { data } = await apiClient.get(
  `/assessments/submissions/${submissionId}/breakdown`,
 );
 return data;
}

/** Breakdown of a student's most-recent submission for a quiz (gradebook entry). */
export async function getLatestSubmissionBreakdown(
 quizId: string,
 studentId: string,
): Promise<SubmissionBreakdown> {
 const { data } = await apiClient.get(
  `/assessments/quizzes/${quizId}/students/${studentId}/breakdown`,
 );
 return data;
}
