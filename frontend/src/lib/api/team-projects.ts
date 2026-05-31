/**
 * Typed wrappers around /api/v1/team-projects/* endpoints.
 *
 * Response shapes mirror backend Pydantic schemas in
 * app/team_projects/router.py.
 */
import apiClient from "@/lib/api-client";

export interface TeamProject {
  id: string;
  org_id: string;
  course_id: string | null;
  title: string;
  description: string;
  deadline: string | null;
  max_team_size: number;
  member_count: number;
  is_member: boolean;
}

export interface TeamMember {
  user_id: string;
  user_name: string;
  role: string;
}

export interface TeamSubmission {
  id: string;
  project_id: string;
  content: Record<string, string>;
  submitted_by: string | null;
  submitter_name: string | null;
  created_at: string;
}

export interface CreateProjectPayload {
  title: string;
  description?: string;
  course_id?: string | null;
  deadline?: string | null;
  max_team_size: number;
}

export async function listProjects(): Promise<TeamProject[]> {
  const { data } = await apiClient.get<TeamProject[]>("/team-projects");
  return data;
}

export async function createProject(
  body: CreateProjectPayload,
): Promise<TeamProject> {
  const { data } = await apiClient.post<TeamProject>("/team-projects", body);
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/team-projects/${projectId}`);
}

export async function listMembers(projectId: string): Promise<TeamMember[]> {
  const { data } = await apiClient.get<TeamMember[]>(
    `/team-projects/${projectId}/members`,
  );
  return data;
}

export async function listSubmissions(
  projectId: string,
): Promise<TeamSubmission[]> {
  const { data } = await apiClient.get<TeamSubmission[]>(
    `/team-projects/${projectId}/submissions`,
  );
  return data;
}

export async function joinProject(projectId: string): Promise<void> {
  await apiClient.post(`/team-projects/${projectId}/join`);
}

export async function leaveProject(projectId: string): Promise<void> {
  await apiClient.post(`/team-projects/${projectId}/leave`);
}

export async function removeMember(
  projectId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/team-projects/${projectId}/members/${userId}`);
}

export async function submitWork(
  projectId: string,
  content: Record<string, string>,
): Promise<TeamSubmission> {
  const { data } = await apiClient.post<TeamSubmission>(
    `/team-projects/${projectId}/submit`,
    { content },
  );
  return data;
}
