import { ApiError, request } from "@/shared/api/client";
import type {
  ApiFlowDefinition, ApiFlowDetail, ApiFlowDraftResult, ApiFlowListPayload, ApiFlowSimInput, ApiFlowSimResult, ApiFlowTriggerConfig, ApiFlowTriggerType,
  ApiFlowValidationIssue, ApiFlowVersion,
} from "./types";


/** Server-side validation failures carry field-level issues. */
export class FlowApiError extends Error {
  issues: ApiFlowValidationIssue[];
  constructor(message: string, issues: ApiFlowValidationIssue[] = []) {
    super(message);
    this.issues = issues;
  }
}

/** A write that can be refused with a list of problems in the flow; the problems come from the body of the refusal. */
async function flowWrite<T>(path: string, init: RequestInit): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError) throw new FlowApiError(err.message, Array.isArray(err.body.errors) ? (err.body.errors as ApiFlowValidationIssue[]) : []);
    throw err;
  }
}

export function fetchFlows(): Promise<ApiFlowListPayload> {
  return request<ApiFlowListPayload>("/api/flows");
}

export function fetchFlow(key: string): Promise<ApiFlowDetail> {
  return request<ApiFlowDetail>(`/api/flows/${encodeURIComponent(key)}`);
}

export function createFlow(payload: {
  key: string;
  name: string;
  description?: string;
  triggerType: ApiFlowTriggerType;
  triggerConfig: ApiFlowTriggerConfig;
  definition: ApiFlowDefinition;
}): Promise<{ key: string; version: ApiFlowVersion }> {
  return flowWrite(`/api/flows`, { method: "POST", body: JSON.stringify(payload) });
}

export function saveFlow(
  key: string,
  payload: {
    name?: string;
    description?: string;
    triggerConfig?: ApiFlowTriggerConfig;
    definition?: ApiFlowDefinition;
  }
): Promise<{ key: string; version: ApiFlowVersion }> {
  return flowWrite(`/api/flows/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function publishFlow(key: string, version?: number): Promise<{ key: string; version: ApiFlowVersion }> {
  return flowWrite(`/api/flows/${encodeURIComponent(key)}/publish`, {
    method: "POST",
    body: JSON.stringify(version != null ? { version } : {}),
  });
}

export function rollbackFlow(key: string, version: number): Promise<{ key: string; version: ApiFlowVersion }> {
  return flowWrite(`/api/flows/${encodeURIComponent(key)}/rollback`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

export function setFlowEnabled(key: string, enabled: boolean): Promise<{ key: string; enabled: boolean }> {
  return request(`/api/flows/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export function deleteFlow(key: string): Promise<{ ok: boolean; key: string }> {
  return request(`/api/flows/${encodeURIComponent(key)}`, { method: "DELETE" });
}

export function simulateFlow(
  key: string,
  payload: { version?: number; inputs: ApiFlowSimInput[]; startData?: Record<string, unknown> }
): Promise<ApiFlowSimResult> {
  return flowWrite(`/api/flows/${encodeURIComponent(key)}/simulate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

{/*AI draft*/}

export function generateFlowDraft(input: {
  description: string;
  base?: ApiFlowDefinition;
}): Promise<ApiFlowDraftResult> {
  return flowWrite<ApiFlowDraftResult>(`/api/flows/generate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
