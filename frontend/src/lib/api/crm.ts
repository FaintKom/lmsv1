/**
 * Typed wrapper around /api/v1/crm — the school's own funnel.
 *
 * Shapes mirror app/crm/router.py. Stages and sources come from the server
 * (`GET /crm/meta`) rather than being duplicated here, so adding a stage stays
 * a backend change and the board picks it up.
 */
import apiClient from "@/lib/api-client";

export interface Lead {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  student_name: string | null;
  interest_course_id: string | null;
  interest_note: string | null;
  stage: string;
  source: string | null;
  owner_id: string | null;
  lost_reason: string | null;
  converted_student_id: string | null;
  converted_at: string | null;
  created_at: string | null;
}

export interface LeadEvent {
  id: string;
  kind: string;
  body: string | null;
  author_id: string | null;
  created_at: string | null;
}

export interface LeadTask {
  id: string;
  lead_id: string;
  title: string;
  due_at: string;
  done_at: string | null;
  assignee_id: string | null;
}

export interface CrmMeta {
  stages: string[];
  sources: string[];
  event_kinds: string[];
  /** Where this school's own public enquiry page lives, e.g. /s/qa-org/enquire. */
  enquiry_path: string;
}

export interface ConvertResult {
  lead_id: string;
  student_id: string;
  student_email: string;
  parent_id: string | null;
  enrolled: boolean;
  /** How many people were actually emailed an invitation. Zero means the
   *  school's mail is not configured — the office needs to hear that rather
   *  than assume a family was contacted. */
  invitations_sent: number;
}

export async function fetchMeta(): Promise<CrmMeta> {
  const { data } = await apiClient.get<CrmMeta>("/crm/meta");
  return data;
}

export async function fetchLeads(params?: {
  stage?: string;
  search?: string;
  include_closed?: boolean;
}): Promise<Lead[]> {
  const { data } = await apiClient.get<{ items: Lead[] }>("/crm/leads", { params });
  return data.items;
}

export async function fetchSummary(): Promise<Record<string, number>> {
  const { data } = await apiClient.get<Record<string, number>>("/crm/summary");
  return data;
}

export interface FunnelReport {
  from: string;
  to: string;
  received: number;
  enrolled: number;
  lost: number;
  open: number;
  /** Among those that closed, not among everything — an enquiry still being
   *  worked is neither a win nor a loss. */
  conversion_rate: number;
  by_source: Record<string, number>;
  median_hours_to_first_contact: number | null;
  /** How many enquiries the median is based on. A median over an unstated
   *  subset is the kind of number that gets quoted in a decision. */
  contacted: number;
}

export async function fetchFunnelReport(days = 30): Promise<FunnelReport> {
  // The endpoint takes dates, not a span. Computing them here keeps the
  // window the office asked for out of the URL's shape.
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const { data } = await apiClient.get<FunnelReport>("/crm/report", {
    params: { from: iso(from), to: iso(to) },
  });
  return data;
}

export async function createLead(body: Partial<Lead>): Promise<Lead> {
  const { data } = await apiClient.post<Lead>("/crm/leads", body);
  return data;
}

export async function updateLead(id: string, body: Partial<Lead>): Promise<Lead> {
  const { data } = await apiClient.patch<Lead>(`/crm/leads/${id}`, body);
  return data;
}

export async function reopenLead(id: string): Promise<Lead> {
  const { data } = await apiClient.post<Lead>(`/crm/leads/${id}/reopen`);
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  await apiClient.delete(`/crm/leads/${id}`);
}

export async function fetchEvents(leadId: string): Promise<LeadEvent[]> {
  const { data } = await apiClient.get<{ items: LeadEvent[] }>(`/crm/leads/${leadId}/events`);
  return data.items;
}

export async function addEvent(
  leadId: string,
  body: { kind: string; body: string },
): Promise<LeadEvent> {
  const { data } = await apiClient.post<LeadEvent>(`/crm/leads/${leadId}/events`, body);
  return data;
}

export async function fetchTasks(leadId?: string): Promise<LeadTask[]> {
  const { data } = await apiClient.get<{ items: LeadTask[] }>("/crm/tasks", {
    params: leadId ? { lead_id: leadId } : undefined,
  });
  return data.items;
}

export async function createTask(
  leadId: string,
  body: { title: string; due_at: string },
): Promise<LeadTask> {
  const { data } = await apiClient.post<LeadTask>(`/crm/leads/${leadId}/tasks`, body);
  return data;
}

export async function completeTask(taskId: string): Promise<LeadTask> {
  const { data } = await apiClient.post<LeadTask>(`/crm/tasks/${taskId}/done`);
  return data;
}

export async function convertLead(
  leadId: string,
  body: { student_email: string; course_id?: string; create_parent_account: boolean },
): Promise<ConvertResult> {
  const { data } = await apiClient.post<ConvertResult>(`/crm/leads/${leadId}/convert`, body);
  return data;
}

/* ── The school's own website ───────────────────────────────────────────
 *
 * Signed out. These are the only calls in this file a stranger can make, and
 * the enquiry answers the same way every time by design — there is nothing in
 * the response to branch on, and nothing worth reading back.
 */

export interface PublicSchool {
  name: string;
  slug: string;
  courses: { id: string; title: string }[];
}

export interface PublicEnquiry {
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  student_name?: string;
  interest_course_id?: string;
  interest_note?: string;
}

export async function fetchPublicSchool(slug: string): Promise<PublicSchool> {
  const { data } = await apiClient.get<PublicSchool>(`/crm/public/${encodeURIComponent(slug)}`);
  return data;
}

export async function submitPublicEnquiry(slug: string, body: PublicEnquiry): Promise<void> {
  await apiClient.post(`/crm/public/${encodeURIComponent(slug)}/enquiries`, body);
}
