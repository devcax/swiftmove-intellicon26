import { request } from "@/shared/api/client";
import type { GeoPoint } from "@/shared/types/location";
import type {
  ApiJobActivityMessage, ApiJobDetail, ApiJobIdentifiers, ApiJobSummary, ApiLiveJob, ApiTimelineEvent,
} from "./types";

export function fetchJobs(params?: { status?: string; search?: string }): Promise<ApiJobSummary[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiJobSummary[]>(`/api/jobs${suffix}`);
}

export function fetchJobIdentifiers(): Promise<ApiJobIdentifiers> {
  return request<ApiJobIdentifiers>("/api/jobs/next-identifiers");
}

export function createJob(payload: {
  jobNumber?: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupCoordinates?: GeoPoint;
  deliveryCoordinates?: GeoPoint;
  pickupAt?: string;
  deliveryAt?: string;
  cargo: string;
  quantity?: string;
  unit?: string;
  instructions?: string;
  pickupCode?: string;
  deliveryCode?: string;
  status: "PUBLISHED" | "DRAFT";
  /** The reference under which evidence was collected before the job existed. */
  evidenceRef?: string;
}): Promise<ApiJobSummary> {
  return request<ApiJobSummary>("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchJob(id: string): Promise<ApiJobDetail> {
  return request<ApiJobDetail>(`/api/jobs/${id}`);
}

export function fetchJobTimeline(id: string): Promise<ApiTimelineEvent[]> {
  return request<ApiTimelineEvent[]>(`/api/jobs/${id}/timeline`);
}

export function fetchLiveJobs(): Promise<ApiLiveJob[]> {
  return request<ApiLiveJob[]>("/api/jobs/live");
}

export function fetchJobActivity(id: string): Promise<{ messages: ApiJobActivityMessage[] }> {
  return request<{ messages: ApiJobActivityMessage[] }>(`/api/jobs/${id}/activity`);
}

export function cancelJob(id: string, reason?: string): Promise<{ ok: boolean; status: string }> {
  return request(`/api/jobs/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason: reason ?? null }) });
}

export function updateJob(
  id: string,
  payload: {
    pickupLocation: string;
    deliveryLocation: string;
    pickupCoordinates?: GeoPoint;
    deliveryCoordinates?: GeoPoint;
    pickupAt?: string;
    deliveryAt?: string;
    cargo: string;
    quantity?: string;
    unit?: string;
    instructions?: string;
  }
): Promise<ApiJobSummary> {
  return request<ApiJobSummary>(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deactivateJob(id: string): Promise<{ ok: boolean; id: string; status: string }> {
  return request(`/api/jobs/${id}/deactivate`, { method: "POST", body: JSON.stringify({}) });
}

export function activateJob(id: string): Promise<{ ok: boolean; id: string; status: string }> {
  return request(`/api/jobs/${id}/activate`, { method: "POST", body: JSON.stringify({}) });
}

export function deleteJob(id: string): Promise<{ ok: boolean; id: string; jobNumber: string }> {
  return request(`/api/jobs/${id}`, { method: "DELETE" });
}

export function cancellationDecision(id: string, action: "release" | "reject" | "cancel"): Promise<{ ok: boolean; status: string; action: string }> {
  return request(`/api/jobs/${id}/cancellation-decision`, { method: "POST", body: JSON.stringify({ action }) });
}

export function releaseDriver(id: string, reason?: string): Promise<{ ok: boolean; status: string }> {
  return request(`/api/jobs/${id}/release-driver`, { method: "POST", body: JSON.stringify({ reason: reason ?? null }) });
}

export function resetJob(id: string): Promise<ApiJobDetail> {
  return request(`/api/jobs/${id}/reset`, { method: "POST" });
}

export function requestJobCorrection(id: string, note?: string): Promise<{ ok: boolean; status: string }> {
  return request(`/api/jobs/${id}/request-correction`, { method: "POST", body: JSON.stringify({ note: note ?? null }) });
}

export function submitJobCompletion(id: string): Promise<{ ok: boolean; status: string }> {
  return request(`/api/jobs/${id}/submit-completion`, { method: "POST", body: JSON.stringify({}) });
}

export function completeJob(id: string): Promise<{ ok: boolean; status: string }> {
  return request(`/api/jobs/${id}/complete`, { method: "POST", body: JSON.stringify({}) });
}

export function markJobVerified(
  id: string,
  stage: "PICKUP" | "DELIVERY"
): Promise<{
  ok: boolean;
  stage: string;
  verifiedAt: string;
  status: string;
  alreadyVerified: boolean;
}> {
  return request(`/api/jobs/${id}/verify`, { method: "POST", body: JSON.stringify({ stage }) });
}
