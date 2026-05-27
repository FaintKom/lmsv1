import apiClient from "@/lib/api-client";

export type Recurrence = "one_time" | "monthly";
export type DonationStatus = "pending" | "confirmed" | "failed";

export interface DonationInitiateRequest {
  amount_cents: number;
  recurrence: Recurrence;
  donor_name?: string | null;
  donor_email?: string | null;
  message?: string | null;
  anonymous: boolean;
}

export interface DonationInitiateResponse {
  donation_id: string;
  oc_checkout_url: string;
}

export interface DonationStatusResponse {
  id: string;
  status: DonationStatus;
  amount_cents: number;
  currency: string;
  recurrence: Recurrence;
  donor_name: string | null;
  anonymous: boolean;
  confirmed_at: string | null;
}

export interface DonationStatsResponse {
  total_confirmed_usd: number;
  donor_count: number;
}

export async function initiateDonation(
  body: DonationInitiateRequest,
): Promise<DonationInitiateResponse> {
  const { data } = await apiClient.post<DonationInitiateResponse>(
    "/donations/initiate",
    body,
  );
  return data;
}

export async function getDonationStatus(id: string): Promise<DonationStatusResponse> {
  const { data } = await apiClient.get<DonationStatusResponse>(`/donations/${id}`);
  return data;
}

export async function getDonationStats(): Promise<DonationStatsResponse> {
  const { data } = await apiClient.get<DonationStatsResponse>("/donations/stats");
  return data;
}
