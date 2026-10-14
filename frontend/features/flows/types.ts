export type ApiFlowStepType = "SAY" | "ASK_CHOICE" | "ASK_TEXT" | "ASK_LOCATION" | "ASK_PHOTO" | "ACTION" | "IF" | "END";
export type ApiFlowTriggerType = "INTENT" | "BUTTON" | "EVENT";
export type ApiFlowStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ApiFlowOption {
  id: string;
  label: string;
  next?: string;
  param?: string;
  description?: string;
}

export interface ApiFlowStep {
  id: string;
  type: ApiFlowStepType;
  text?: string;
  next?: string;
  options?: ApiFlowOption[];
  saveAs?: string;
  reprompt?: string;
  cancelPattern?: string;
  cancelText?: string;
  sendText?: boolean;
  promptFrom?: string;
  promptParams?: Record<string, unknown>;
  name?: string;
  params?: Record<string, unknown>;
  /** IF steps: what to look at, and where to go when it is true or not. */
  check?: string;
  then?: string;
  else?: string;
  onText?: { saveAs?: string; next?: string; intentMap?: Record<string, string>; elseNext?: string };
  classify?: { categories: { id: string; description: string; next: string }[]; fallback: string };
}

export interface ApiFlowDefinition {
  steps: ApiFlowStep[];
}

export interface ApiFlowTriggerConfig {
  intent?: string;
  topic?: string;
  buttonId?: string;
  buttonPrefix?: string;
  buttons?: string[];
  event?: string;
}

export interface ApiFlowSummary {
  key: string;
  name: string;
  description: string | null;
  triggerType: ApiFlowTriggerType;
  triggerConfig: ApiFlowTriggerConfig;
  /** What starts it, in words: "Driver asks to cancel the trip". */
  startsWhen: string;
  isSystem: boolean;
  enabled: boolean;
  publishedVersion: number | null;
  draftVersion: number | null;
  versions: number;
  updatedAt: string;
}

export interface ApiFlowVersion {
  id: string;
  version: number;
  status: ApiFlowStatus;
  enabled: boolean;
  definition: ApiFlowDefinition;
  updatedAt: string;
}

export interface ApiFlowDetail extends Omit<ApiFlowSummary, "versions"> {
  versions: ApiFlowVersion[];
}

export interface ApiFlowMeta {
  stepTypes: ApiFlowStepType[];
  actions: { name: string; label: string }[];
  promptProviders: { name: string; label: string }[];
  /** Raw intent names, for the advanced "route the answer by intent" setting. */
  intents: string[];
  conditions: { name: string; label: string }[];
  /** What a driver can say to start a conversation, and who already owns it. */
  starters: ApiFlowStarter[];
}

export interface ApiFlowStarter {
  id: string;
  label: string;
  hint: string;
  /** One conversation per starter, except general questions (one per topic). */
  exclusive: boolean;
  owners: { key: string; name: string; topic: string | null }[];
}

export interface ApiFlowListPayload {
  flows: ApiFlowSummary[];
  meta: ApiFlowMeta;
}

export interface ApiFlowValidationIssue {
  step: string | null;
  message: string;
}

export type ApiFlowSimInputType = "text" | "button" | "location" | "photo";

export interface ApiFlowSimInput {
  type?: ApiFlowSimInputType;
  value?: string;
  candidate?: { intent: string; [k: string]: unknown };
}

export interface ApiFlowTranscriptEntry {
  from: "bot" | "driver" | "system";
  text?: string | null;
  type?: string;
  buttons?: { id: string; title: string }[];
  listRows?: { id: string; title: string }[];
  action?: string;
  params?: Record<string, unknown>;
}

export interface ApiFlowSimResult {
  key: string;
  version: number;
  transcript: ApiFlowTranscriptEntry[];
  waitingAt: string | null;
}

// {/*AI draft*/}

export interface ApiFlowDraftResult {
  ok: true;
  name: string | null;
  description: string | null;
  definition: ApiFlowDefinition;
  attempts: number;
}
