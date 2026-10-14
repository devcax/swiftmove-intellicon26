// ---------------------------------------------------------------------------
// Plain-English renderers for the policy DSL. The dashboard never shows raw
// JSON by default — these helpers turn actions, match blocks, rule trees and
// onBlock outcomes into business language. The raw DSL stays available in an
// "advanced" view.
// ---------------------------------------------------------------------------

import { ATTACHMENT_ONLY_CAPABILITIES } from "@/features/policies/constants";
import type {
  ApiCapability,
  ApiCapabilityParam,
  ApiPolicy,
  ApiPolicyEvidence,
  ApiPolicyOnBlock,
  ApiPolicyRuleNode,
} from "@/features/policies/types";

/** "PICKUP_BEFORE_DELIVERY" / "job.start-confirm" → "Pickup before delivery". */
export function labelize(code: string): string {
  const words = String(code ?? "")
    .replace(/[._-]+/g, " ")
    .toLowerCase()
    .trim();
  return words.replace(/^\w/, (c) => c.toUpperCase());
}

/** Every requirement leaf inside a rule tree (depth-first, stable order). */
export function collectLeaves(rule: ApiPolicyRuleNode | null | undefined): ApiPolicyRuleNode[] {
  if (!rule || typeof rule !== "object") return [];
  if (typeof rule.requirement === "string") return [rule];
  const out: ApiPolicyRuleNode[] = [];
  for (const key of ["all", "any"] as const) {
    const children = rule[key];
    if (Array.isArray(children)) {
      for (const child of children) out.push(...collectLeaves(child));
    }
  }
  if (rule.not) out.push(...collectLeaves(rule.not));
  return out;
}

/** Does the rule rely on an attachment-only check (the honest POD distinction)? */
export function usesAttachmentOnlyCheck(rule: ApiPolicyRuleNode | null | undefined): boolean {
  return collectLeaves(rule).some(
    (leaf) => leaf.requirement && ATTACHMENT_ONLY_CAPABILITIES.includes(leaf.requirement)
  );
}

// ---------------------------------------------------------------------------
// "What must be true" — requirement rendering
// ---------------------------------------------------------------------------

function fmtParamValue(param: ApiCapabilityParam, value: unknown): string {
  switch (param.kind) {
    case "enum":
      return labelize(String(value)).toLowerCase();
    case "enumList":
      return Array.isArray(value)
        ? value.map((v) => labelize(String(v)).toLowerCase()).join(", ")
        : String(value);
    case "number":
      return `${String(value)} ${param.label}`;
    case "boolean":
      return value ? "yes" : "no";
    case "gateMap": {
      const entries = Object.entries((value as Record<string, string>) ?? {}).map(
        ([milestone, stage]) =>
          `${labelize(milestone).toLowerCase()} needs the ${String(stage).toLowerCase()} document`
      );
      return entries.join("; ");
    }
    default:
      return String(value);
  }
}

function leafText(leaf: ApiPolicyRuleNode, capByName: Map<string, ApiCapability>): string {
  const cap = leaf.requirement ? capByName.get(leaf.requirement) : undefined;
  if (!cap) return `Unknown requirement "${leaf.requirement ?? "?"}" (cannot be enforced)`;
  if (cap.available === false) {
    return `${cap.label} — NOT SUPPORTED YET (${cap.unavailableReason ?? "no evaluator"})`;
  }
  const params = (cap.params ?? [])
    .filter((p) => leaf.params?.[p.name] !== undefined)
    .map((p) => fmtParamValue(p, leaf.params?.[p.name]));
  return params.length > 0 ? `${cap.label} — ${params.join("; ")}` : cap.label;
}

/**
 * Readable requirement lines. `joiner` tells the UI how siblings combine:
 * "all" (every line must hold), "any" (one of them), "not" (must not hold).
 */
export interface RequirementLine {
  text: string;
  joiner: "all" | "any" | "not" | null;
  depth: number;
  unsupported: boolean;
}

export function requirementLines(
  rule: ApiPolicyRuleNode | null | undefined,
  capByName: Map<string, ApiCapability>,
  depth = 0,
  joiner: RequirementLine["joiner"] = null
): RequirementLine[] {
  if (!rule || typeof rule !== "object") return [];
  if (typeof rule.requirement === "string") {
    const cap = capByName.get(rule.requirement);
    return [
      {
        text: leafText(rule, capByName),
        joiner,
        depth,
        unsupported: !cap || cap.available === false,
      },
    ];
  }
  if (Array.isArray(rule.all)) {
    return rule.all.flatMap((child, i) =>
      requirementLines(child, capByName, depth, i === 0 && depth === 0 ? null : "all")
    );
  }
  if (Array.isArray(rule.any)) {
    return rule.any.flatMap((child, i) =>
      requirementLines(child, capByName, depth + 1, i === 0 ? "any" : "any")
    );
  }
  if (rule.not) return requirementLines(rule.not, capByName, depth + 1, "not");
  return [];
}

// ---------------------------------------------------------------------------
// "When does this rule apply" — match rendering
// ---------------------------------------------------------------------------

const SOURCE_TEXT: Record<string, string> = {
  CHAT: "a chat message",
  DOCUMENT: "an uploaded document",
  MANAGER: "a manager action",
  API: "the dashboard",
  TIMER: "the automatic timer",
};

const ACTOR_TEXT: Record<string, string> = {
  DRIVER: "the driver",
  MANAGER: "a manager",
  SYSTEM: "the system",
};

function fmtMatchScalar(value: unknown): string {
  return labelize(String(value)).toLowerCase();
}

function fmtMatchValue(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const op = value as Record<string, unknown>;
    if (Array.isArray(op.in)) return `one of ${op.in.map(fmtMatchScalar).join(", ")}`;
    if (op.not !== undefined) return `anything but ${fmtMatchScalar(op.not)}`;
    if (op.rankGt !== undefined) return `past ${fmtMatchScalar(op.rankGt)}`;
  }
  return fmtMatchScalar(value);
}

export function matchLines(match: Record<string, unknown> | null | undefined): string[] {
  const lines: string[] = [];
  for (const [field, value] of Object.entries(match ?? {})) {
    switch (field) {
      case "source":
        lines.push(`Comes from ${fmtMatchValueWithMap(value, SOURCE_TEXT)}`);
        break;
      case "actor":
        lines.push(`Triggered by ${fmtMatchValueWithMap(value, ACTOR_TEXT)}`);
        break;
      case "milestone":
        lines.push(`The reported milestone is ${fmtMatchValue(value)}`);
        break;
      case "stage":
        lines.push(`The document is the ${fmtMatchValue(value)} document`);
        break;
      case "incidentType":
        lines.push(`The incident type is ${fmtMatchValue(value)}`);
        break;
      default:
        lines.push(`${labelize(field)} is ${fmtMatchValue(value)}`);
    }
  }
  return lines;
}

function fmtMatchValueWithMap(value: unknown, map: Record<string, string>): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const op = value as Record<string, unknown>;
    if (Array.isArray(op.in)) {
      return `one of: ${op.in.map((v) => map[String(v)] ?? fmtMatchScalar(v)).join(", ")}`;
    }
    if (op.not !== undefined) return `anything but ${map[String(op.not)] ?? fmtMatchScalar(op.not)}`;
  }
  return map[String(value)] ?? fmtMatchScalar(value);
}

// ---------------------------------------------------------------------------
// "What happens if it is missing" — onBlock + evidence rendering
// ---------------------------------------------------------------------------

export function onBlockSummary(onBlock: ApiPolicyOnBlock | null | undefined): string {
  switch (onBlock?.mode ?? "BLOCK") {
    case "WARN":
      return "The action is allowed, but the driver sees a warning and it is recorded.";
    case "ESCALATE":
      return "The action is stopped and the manager team is alerted right away.";
    default:
      return "The action is stopped until the requirement is met.";
  }
}

/** What the driver will be asked for when the rule blocks (the standard helper). */
export function evidenceDriverText(evidence: ApiPolicyEvidence | null | undefined): string | null {
  if (!evidence) return null;
  switch (evidence.kind) {
    case "DOCUMENT":
      if (evidence.stage) {
        return `The bot asks for a photo of the ${String(evidence.stage).toLowerCase()} document, verifies it, and retries.`;
      }
      if (evidence.documentType) {
        return `The bot asks for a photo of the ${evidence.documentType} document.`;
      }
      return "The bot asks for the missing document photo.";
    case "START_CONFIRMATION":
      return "The bot asks the driver to confirm the trip start, then retries.";
    case "SAFETY_FOLLOWUP":
      return "The bot runs the short safety check (location, backup needs) before continuing.";
    case "MANAGER_REVIEW":
      return "The driver is not asked for anything — the conversation waits for a manager.";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// SETTING policies + grouping
// ---------------------------------------------------------------------------

/** Readable lines for a SETTING policy payload (rule.setting). */
export function settingLines(setting: Record<string, unknown> | null | undefined): string[] {
  return Object.entries(setting ?? {}).map(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const inner = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${labelize(k)} → ${labelize(String(v))}`)
        .join(", ");
      return `${labelize(key)}: ${inner}`;
    }
    if (Array.isArray(value)) {
      return `${labelize(key)}: ${value.map((v) => labelize(String(v)).toLowerCase()).join(", ")}`;
    }
    return `${labelize(key)}: ${String(value)}`;
  });
}

export interface PolicyGroup {
  key: string;
  /** All versions, newest first. */
  versions: ApiPolicy[];
  /** The row the card represents: the published version, else the newest. */
  head: ApiPolicy;
}

/** Group a flat policy list (ORDER BY key, version DESC) into per-key groups. */
export function groupPolicyVersions(policies: ApiPolicy[]): PolicyGroup[] {
  const byKey = new Map<string, ApiPolicy[]>();
  for (const policy of policies) {
    const list = byKey.get(policy.key) ?? [];
    list.push(policy);
    byKey.set(policy.key, list);
  }
  return [...byKey.entries()].map(([key, versions]) => {
    const sorted = [...versions].sort((a, b) => b.version - a.version);
    const head = sorted.find((v) => v.status === "PUBLISHED") ?? sorted[0];
    return { key, versions: sorted, head };
  });
}

// ---------------------------------------------------------------------------
// Manual builder helpers
// ---------------------------------------------------------------------------

const DEFAULT_PARAM_VALUES: Record<string, unknown> = {
  hours: 24,
  days: 2,
  minutes: 2,
  threshold: 0.97,
  phase: "both",
};

/** Sensible defaults for a capability's params when it is added in the builder. */
export function defaultParamsFor(capability: ApiCapability): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const p of capability.params ?? []) {
    if (DEFAULT_PARAM_VALUES[p.name] !== undefined) {
      params[p.name] = DEFAULT_PARAM_VALUES[p.name];
      continue;
    }
    switch (p.kind) {
      case "enum":
        params[p.name] = p.values?.[0];
        break;
      case "enumList":
        params[p.name] = [...(p.values ?? [])];
        break;
      case "number":
        params[p.name] = p.min ?? 1;
        break;
      case "boolean":
        params[p.name] = true;
        break;
      case "gateMap":
        params[p.name] = { LOADED: "PICKUP", DELIVERED: "DELIVERY" };
        break;
      default:
        params[p.name] = "";
    }
  }
  return params;
}
