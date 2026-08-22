import apiClient from "@/lib/api-client";

/**
 * A school and its settings.
 *
 * Who may read or write which organisation is the server's decision, and it
 * already makes it: a super admin reaches any of them, anyone else only their
 * own, and somebody else's answers 404 rather than 403 so its existence stays
 * hidden. The client does not re-derive that rule — it asks, and shows the
 * answer it gets.
 */

export interface OrgSettings {
  display_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  /**
   * Whether the school chose the second colour rather than accepting ours.
   *
   * Stored rather than inferred: a school may deliberately pick the exact
   * colour we suggested, and comparing values could not tell that apart from
   * never having touched the field — so their choice would silently move the
   * next time they changed the main colour.
   */
  secondary_is_custom?: boolean;
  favicon_url?: string;
  /** Where 'Support' should send pupils. Empty means our own page. */
  support_email?: string;
  support_url?: string;
  menu_visibility?: Record<string, boolean>;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  settings: OrgSettings;
  created_at: string | null;
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>("/admin/organizations");
  return data;
}

export async function getOrganization(orgId: string): Promise<Organization> {
  const { data } = await apiClient.get<Organization>(`/admin/organizations/${orgId}`);
  return data;
}

/**
 * Partial by design: the server merges `settings` into what it already holds
 * rather than replacing the block, so sending only what changed leaves the
 * rest — including settings this screen knows nothing about — untouched.
 */
export async function updateOrganization(
  orgId: string,
  patch: { name?: string; is_active?: boolean; settings?: OrgSettings },
): Promise<Organization> {
  const { data } = await apiClient.put<Organization>(`/admin/organizations/${orgId}`, patch);
  return data;
}
