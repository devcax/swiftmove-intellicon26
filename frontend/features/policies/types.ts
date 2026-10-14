import type { ApiFlowVersion } from "@/features/flows/types";

export type ApiPolicyStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ApiPolicyEnforcement = "GATEWAY" | "SETTING";
export type ApiPolicyBlockMode = "BLOCK" | "WARN" | "ESCALATE";

/** One node of the constrained policy DSL (all/any/not over capability leaves). */
export interface ApiPolicyRuleNode {
  requirement?: string;
  params?: Record<string, unknown>;
  all?: ApiPolicyRuleNode[];
  any?: ApiPolicyRuleNode[];
  not?: ApiPolicyRuleNode;
  /** SETTING policies carry their tunable payload here instead of a rule tree. */
  setting?: Record<string, unknown>;
}

export interface ApiPolicyOnBlock {
  mode?: ApiPolicyBlockMode;
  message?: string | null;
  /** Key of the custom conversation flow that runs when the rule blocks. */
  flowKey?: string | null;
}

export interface ApiPolicy {
  id: string;
  key: string;
  name: string;
  description: string | null;
  action: string;
  enforcement: ApiPolicyEnforcement;
  match: Record<string, unknown>;
  rule: ApiPolicyRuleNode;
  onBlock: ApiPolicyOnBlock;
  position: number;
  version: number;
  status: ApiPolicyStatus;
  enabled: boolean;
  isSystem: boolean;
  sourceInstruction: string | null;
  createdByUserId: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiCapabilityParam {
  name: string;
  label: string;
  kind: "enum" | "enumList" | "number" | "string" | "boolean" | "gateMap";
  values?: string[];
  min?: number;
  max?: number;
  required?: boolean;
  description?: string;
}

export interface ApiCapability {
  name: string;
  label: string;
  description: string;
  params: ApiCapabilityParam[];
  dataDependencies: string[];
  evidence: { kind: string } | null;
  available: boolean;
  unavailableReason: string | null;
}

export interface ApiPolicyAction {
  name: string;
  label: string;
  actor: string;
  description: string;
  matchFields: string[];
}

export interface ApiPolicyListPayload {
  policies: ApiPolicy[];
  store: { version: number; source: "db" | "fallback" };
  capabilities: ApiCapability[];
  actions: ApiPolicyAction[];
}

export interface ApiPolicyUnsupported {
  name: string;
  reason: string;
}

export interface ApiPolicyDraftResult {
  policy: ApiPolicy;
  unsupported: ApiPolicyUnsupported[];
  attempts: number;
}

export interface ApiPolicyEvidence {
  kind: string;
  stage?: string;
  documentType?: string;
  incidentId?: string;
}

export interface ApiPolicyFailure {
  policyId: string | null;
  policyKey: string | null;
  policyName: string | null;
  blockMode: ApiPolicyBlockMode;
  onBlock: ApiPolicyOnBlock | null;
  requirement: string | null;
  params: Record<string, unknown> | null;
  code: string;
  message: string;
  reason: string | null;
  evidence: ApiPolicyEvidence | null;
  details: Record<string, unknown> | null;
}

export interface ApiPolicyNextStep {
  policyKey: string | null;
  policyName: string | null;
  blockMode: ApiPolicyBlockMode;
  flowKey: string | null;
  evidence: ApiPolicyEvidence | null;
  message: string;
  reason: string | null;
}

export interface ApiPolicyTestResult {
  allowed: boolean;
  failures: ApiPolicyFailure[];
  warnings: ApiPolicyFailure[];
  evaluated: { policyId: string | null; policyKey: string | null; pass: boolean }[];
  nextStep: ApiPolicyNextStep | null;
  conversation: {
    kind: "none" | "flow" | "standard-helper";
    flowKey?: string | null;
    message: string | null;
    evidence?: ApiPolicyEvidence | null;
    waitsForManager?: boolean;
  };
  note: string;
}

/** The sample situation the policy simulator evaluates the real engine against. */
export interface ApiPolicyTestSample {
  job?: {
    job_number?: string;
    current_status?: string;
    pickup_at?: string | null;
    delivery_at?: string | null;
    pickup_verified_at?: string | null;
    delivery_verified_at?: string | null;
  } | null;
  driver?: { name?: string; status?: string } | null;
  assignment?: { job_number?: string; started_at?: string | null } | null;
  releasedFromJob?: boolean;
  openIncidents?: {
    id?: string;
    incident_type?: string;
    severity?: string;
    safety_followup_at?: string | null;
  }[];
  currentRank?: number;
  params?: Record<string, unknown>;
}

export interface ApiPolicyTestInput {
  action?: string;
  policyId?: string;
  draft?: Partial<ApiPolicy>;
  actor?: "DRIVER" | "MANAGER" | "SYSTEM";
  source?: "CHAT" | "DOCUMENT" | "MANAGER" | "API" | "TIMER";
  sample?: ApiPolicyTestSample;
}

export interface ApiGeneratedConversation {
  policy: ApiPolicy;
  flow: { key: string; version: ApiFlowVersion };
  collects: string[];
  waitsFor: string[];
  attempts: number;
}
