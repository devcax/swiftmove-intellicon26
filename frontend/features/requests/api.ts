import { request } from "@/shared/api/client";
import type { ApiJobRequest, ApiRequestHistoryEntry } from "./types";

export function fetchJobRequests(status = "REQUESTED"): Promise<ApiJobRequest[]> {
  return request<ApiJobRequest[]>(`/api/job-requests?status=${encodeURIComponent(status)}`);
}

export function approveJobRequest(id: string): Promise<{ ok: boolean; jobNumber: string; driver: string }> {
  return request(`/api/job-requests/${id}/approve`, { method: "POST", body: JSON.stringify({}) });
}

export function rejectJobRequest(id: string, reason?: string): Promise<{ ok: boolean; jobNumber: string; driver: string }> {
  return request(`/api/job-requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: reason ?? null }) });
}

export function fetchRequestHistory(): Promise<ApiRequestHistoryEntry[]> {
  return request<ApiRequestHistoryEntry[]>(`/api/job-requests/history`);
}
