import { ApiError, request } from "@/shared/api/client";
import type {
  ApiGeneratedConversation, ApiPolicy, ApiPolicyDraftResult, ApiPolicyListPayload, ApiPolicyRuleNode, ApiPolicyTestInput, ApiPolicyTestResult,
  ApiPolicyUnsupported,
} from "./types";

/** Validation failures from the policy endpoints carry field issues and the
 *  unsupported-capability report the AI author produced. */
export class PolicyApiError extends Error {
  issues: string[];
  unsupported: ApiPolicyUnsupported[];
  constructor(message: string, issues: string[] = [], unsupported: ApiPolicyUnsupported[] = []) {
    super(message);
    this.issues = issues;
    this.unsupported = unsupported;
  }
}

/** A write the server can refuse with a list of problems; the problems come from the body of the refusal. */
async function policyWrite<T>(path: string, init: RequestInit): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    const body = err.body;
    const issues: string[] = Array.isArray(body.issues)
      ? body.issues.map(String)
      : Array.isArray(body.errors)
        ? (body.errors as { field?: string; message?: string }[]).map((e) => `${e.field ? `${e.field}: ` : ""}${e.message ?? "invalid"}`)
        : [];
    const unsupported = Array.isArray(body.unsupported) ? (body.unsupported as ApiPolicyUnsupported[]) : [];
    throw new PolicyApiError(err.message, issues, unsupported);
  }
}

export function fetchPolicies(): Promise<ApiPolicyListPayload> {
  return request<ApiPolicyListPayload>("/api/policies");
}

export function createPolicy(payload: {
  name: string;
  description?: string | null;
  action: string;
  enforcement?: string;
  match?: Record<string, unknown>;
  rule: ApiPolicyRuleNode;
  onBlock?: { mode?: string; message?: string | null; flowKey?: string | null };
  sourceInstruction?: string | null;
}): Promise<ApiPolicy> {
  return policyWrite<ApiPolicy>("/api/policies", { method: "POST", body: JSON.stringify(payload) });
}

export function draftPolicy(input: {
  instruction: string;
  base?: { id: string } | (Partial<ApiPolicy> & { rule: ApiPolicyRuleNode });
}): Promise<ApiPolicyDraftResult> {
  return policyWrite<ApiPolicyDraftResult>("/api/policies/draft", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** The AI writes the conversation for a rule. The conversation and a draft of the rule are saved; nothing is published. */
export function generatePolicyFlow(id: string): Promise<ApiGeneratedConversation> {
  return policyWrite<ApiGeneratedConversation>(`/api/policies/${id}/generate-flow`, { method: "POST", body: JSON.stringify({}) });
}

export function publishPolicy(id: string): Promise<ApiPolicy> {
  return policyWrite<ApiPolicy>(`/api/policies/${id}/publish`, { method: "POST", body: JSON.stringify({}) });
}

export function disablePolicy(id: string): Promise<ApiPolicy> {
  return policyWrite<ApiPolicy>(`/api/policies/${id}/disable`, { method: "POST", body: JSON.stringify({}) });
}

export function enablePolicy(id: string): Promise<ApiPolicy> {
  return policyWrite<ApiPolicy>(`/api/policies/${id}/enable`, { method: "POST", body: JSON.stringify({}) });
}

export function revisePolicy(
  id: string,
  changes: {
    name?: string;
    description?: string | null;
    match?: Record<string, unknown>;
    rule?: ApiPolicyRuleNode;
    onBlock?: { mode?: string; message?: string | null; flowKey?: string | null };
    sourceInstruction?: string | null;
  }
): Promise<ApiPolicy> {
  return policyWrite<ApiPolicy>(`/api/policies/${id}/revise`, {
    method: "POST",
    body: JSON.stringify({ changes }),
  });
}

export function archivePolicy(id: string): Promise<ApiPolicy> {
  return policyWrite<ApiPolicy>(`/api/policies/${id}/archive`, { method: "POST", body: JSON.stringify({}) });
}

export function deletePolicy(id: string): Promise<{ ok: boolean; id: string }> {
  return policyWrite<{ ok: boolean; id: string }>(`/api/policies/${id}`, { method: "DELETE" });
}

export function testPolicy(input: ApiPolicyTestInput): Promise<ApiPolicyTestResult> {
  return policyWrite<ApiPolicyTestResult>("/api/policies/test", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
