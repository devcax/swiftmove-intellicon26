import { request } from "@/shared/api/client";
import type { ApiIncidentDetail, ApiIncidentSummary } from "./types";

export function fetchIncidents(params?: { status?: string; severity?: string }): Promise<ApiIncidentSummary[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.severity) qs.set("severity", params.severity);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiIncidentSummary[]>(`/api/incidents${suffix}`);
}

export function fetchIncident(id: string): Promise<ApiIncidentDetail> {
  return request<ApiIncidentDetail>(`/api/incidents/${id}`);
}

export function updateIncidentNotes(id: string, managerNotes: string): Promise<{ ok: boolean }> {
  return request(`/api/incidents/${id}`, { method: "PATCH", body: JSON.stringify({ managerNotes }) });
}

export function incidentAction(
  id: string,
  action: "resolve" | "under-review" | "keep-open",
  managerNotes?: string
): Promise<{ ok: boolean; jobNumber: string }> {
  return request(`/api/incidents/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify({ managerNotes: managerNotes ?? null }),
  });
}
