/**
 * Typed wrappers + TanStack Query hooks around /api/v1/sites/*.
 *
 * Sites are org-level branches/campuses (name + timezone). Any staff role may
 * read the list (for the room site-picker); only methodist / admin /
 * super_admin may create / update / delete. Response shapes mirror the backend
 * handlers in app/sites/router.py + app/sites/service.py.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";

export interface Site {
  id: string;
  org_id: string;
  name: string;
  timezone: string;
  is_active: boolean;
}

export interface SitesResponse {
  sites: Site[];
}

export interface SiteCreate {
  name: string;
  timezone?: string;
}

export interface SiteUpdate {
  name?: string;
  timezone?: string;
  is_active?: boolean;
}

// ── Raw API functions ──────────────────────────────────────────────────

export async function fetchSites(): Promise<SitesResponse> {
  const { data } = await apiClient.get<SitesResponse>("/sites");
  return data;
}

export async function createSite(body: SiteCreate): Promise<Site> {
  const { data } = await apiClient.post<Site>("/sites", body);
  return data;
}

export async function updateSite(
  siteId: string,
  body: SiteUpdate,
): Promise<Site> {
  const { data } = await apiClient.put<Site>(`/sites/${siteId}`, body);
  return data;
}

export async function deleteSite(siteId: string): Promise<void> {
  await apiClient.delete(`/sites/${siteId}`);
}

// ── Query hooks ────────────────────────────────────────────────────────

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
  });
}

function useInvalidateSites() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["sites"] });
    // Rooms reference sites, so a site change can affect the room list view.
    qc.invalidateQueries({ queryKey: ["rooms"] });
  };
}

export function useCreateSite() {
  const invalidate = useInvalidateSites();
  return useMutation({
    mutationFn: (body: SiteCreate) => createSite(body),
    onSuccess: invalidate,
  });
}

export function useUpdateSite() {
  const invalidate = useInvalidateSites();
  return useMutation({
    mutationFn: ({ siteId, body }: { siteId: string; body: SiteUpdate }) =>
      updateSite(siteId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteSite() {
  const invalidate = useInvalidateSites();
  return useMutation({
    mutationFn: (siteId: string) => deleteSite(siteId),
    onSuccess: invalidate,
  });
}
