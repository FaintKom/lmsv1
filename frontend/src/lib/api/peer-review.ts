/**
 * Typed wrappers around /api/v1/peer-review/* endpoints.
 *
 * Response shapes mirror backend Pydantic schemas in
 * app/peer_review/router.py.
 */
import apiClient from "@/lib/api-client";

export type PeerReviewStatus = "pending" | "in_progress" | "completed";

export interface PeerReviewAssignment {
  id: string;
  org_id: string;
  course_id: string;
  title: string;
  min_reviews: number;
  deadline: string | null;
}

export interface PeerReviewAssignmentStats extends PeerReviewAssignment {
  total_reviews: number;
  completed_reviews: number;
  pending_reviews: number;
}

export interface PeerReviewDetailRow {
  id: string;
  assignment_id: string;
  reviewer_id: string;
  reviewee_id: string;
  status: PeerReviewStatus;
  rating: number | null;
  comment: string | null;
  reviewer_name: string;
  reviewee_name: string;
}

export interface PeerReviewAssignmentDetail extends PeerReviewAssignmentStats {
  reviews: PeerReviewDetailRow[];
}

export interface MyPeerReview {
  id: string;
  assignment_id: string;
  reviewer_id: string;
  reviewee_id: string;
  status: PeerReviewStatus;
  rating: number | null;
  comment: string | null;
  assignment_title: string;
  reviewee_name: string;
  deadline: string | null;
}

export interface CreateAssignmentPayload {
  course_id: string;
  title: string;
  min_reviews: number;
  deadline?: string | null;
}

export interface DistributeResult {
  created: number;
  total_students: number;
}

export interface SubmitReviewPayload {
  rating?: number | null;
  comment?: string | null;
}

// ── Teacher / admin ────────────────────────────────────────────────────

export async function listAssignments(
  courseId: string,
): Promise<PeerReviewAssignmentStats[]> {
  const { data } = await apiClient.get<PeerReviewAssignmentStats[]>(
    "/peer-review/assignments",
    { params: { course_id: courseId } },
  );
  return data;
}

export async function getAssignment(
  assignmentId: string,
): Promise<PeerReviewAssignmentDetail> {
  const { data } = await apiClient.get<PeerReviewAssignmentDetail>(
    `/peer-review/assignments/${assignmentId}`,
  );
  return data;
}

export async function createAssignment(
  body: CreateAssignmentPayload,
): Promise<PeerReviewAssignment> {
  const { data } = await apiClient.post<PeerReviewAssignment>(
    "/peer-review/assignments",
    body,
  );
  return data;
}

export async function distributeAssignment(
  assignmentId: string,
): Promise<DistributeResult> {
  const { data } = await apiClient.post<DistributeResult>(
    `/peer-review/assignments/${assignmentId}/distribute`,
  );
  return data;
}

// ── Student ────────────────────────────────────────────────────────────

export async function listMyReviews(): Promise<MyPeerReview[]> {
  const { data } = await apiClient.get<MyPeerReview[]>("/peer-review/my-reviews");
  return data;
}

export async function submitReview(
  reviewId: string,
  body: SubmitReviewPayload,
): Promise<MyPeerReview> {
  const { data } = await apiClient.post<MyPeerReview>(
    `/peer-review/${reviewId}/submit`,
    body,
  );
  return data;
}
