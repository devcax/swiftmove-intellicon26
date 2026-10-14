// ---------------------------------------------------------------------------
// Shared model helpers for the flow builder: step metadata, factories,
// outgoing-edge extraction (graph) and a client-side mirror of the server's
// flowValidate rules so most mistakes are caught before saving.
// ---------------------------------------------------------------------------

import type { ApiFlowDefinition, ApiFlowDetail, ApiFlowOption, ApiFlowStep, ApiFlowStepType, ApiFlowSummary, ApiFlowValidationIssue, ApiFlowVersion } from "@/features/flows/types";

export const STEP_TYPE_META: Record<ApiFlowStepType, { label: string; hint: string; tone: string }> = {
  SAY: { label: "Send Message", hint: "Send a WhatsApp message to the driver.", tone: "#475569" },
  ASK_CHOICE: { label: "Ask With Buttons", hint: "Let the driver choose an answer button.", tone: "#1d4ed8" },
  ASK_TEXT: { label: "Ask For Text", hint: "Collect and save a typed answer.", tone: "#0f766e" },
  ASK_LOCATION: { label: "Ask For Location", hint: "Collect a shared WhatsApp location.", tone: "#b45309" },
  ASK_PHOTO: { label: "Ask For Photo", hint: "Collect a photo from the driver.", tone: "#be185d" },
  ACTION: { label: "System Action", hint: "Run an available logistics action.", tone: "#7c3aed" },
  IF: { label: "Condition", hint: "Split the conversation into Yes and No paths.", tone: "#c2410c" },
  END: { label: "End", hint: "Finish the flow (optional goodbye).", tone: "#15803d" },
};

export const STEP_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
export const MAX_OPTIONS = 10;
export const MAX_OPTION_LABEL = 24;
export const MAX_STEPS = 100;

let counter = 0;

/** Unique-ish step id for new steps (user can rename). */
export function freshStepId(type: ApiFlowStepType, existing: Set<string>): string {
  const base = type.toLowerCase().replace("ask_", "");
  for (;;) {
    counter += 1;
    const id = `${base}_${counter}`;
    if (!existing.has(id)) return id;
  }
}

export function makeStep(type: ApiFlowStepType, id: string): ApiFlowStep {
  switch (type) {
    case "SAY":
      return { id, type, text: "" };
    case "ASK_CHOICE":
      return { id, type, text: "", options: [{ id: "OPTION_1", label: "" }] };
    case "ASK_TEXT":
      return { id, type, text: "", saveAs: "answer" };
    case "ASK_LOCATION":
      return { id, type, text: "", saveAs: "location" };
    case "ASK_PHOTO":
      return { id, type, text: "", saveAs: "photo" };
    case "ACTION":
      return { id, type, name: "" };
    case "IF":
      return { id, type, check: "" };
    case "END":
      return { id, type, text: "" };
    default:
      return { id, type };
  }
}

/** Every step id a step points at (for graph edges and validation). */
export function stepTargets(step: ApiFlowStep): { target: string; label: string | null }[] {
  const out: { target: string; label: string | null }[] = [];
  if (typeof step.next === "string" && step.next) out.push({ target: step.next, label: null });
  if (step.type === "IF") {
    if (step.then) out.push({ target: step.then, label: "yes" });
    if (step.else) out.push({ target: step.else, label: "no" });
  }
  for (const option of step.options ?? []) {
    if (typeof option?.next === "string" && option.next) out.push({ target: option.next, label: option.label || option.id });
  }
  if (step.onText) {
    if (step.onText.next) out.push({ target: step.onText.next, label: "text" });
    for (const [intent, target] of Object.entries(step.onText.intentMap ?? {})) {
      if (target) out.push({ target, label: intent });
    }
    if (step.onText.elseNext) out.push({ target: step.onText.elseNext, label: "else" });
  }
  for (const category of step.classify?.categories ?? []) {
    if (category?.next) out.push({ target: category.next, label: category.id });
  }
  if (step.classify?.fallback) out.push({ target: step.classify.fallback, label: "fallback" });
  return out;
}

// ---------------------------------------------------------------------------
// Client-side validation — mirrors backend/src/services/flowValidate.js
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function checkText(issues: ApiFlowValidationIssue[], step: ApiFlowStep, field: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ step: step.id, message: `${field} must be a non-empty string.` });
    return;
  }
  if (value.length > 2000) {
    issues.push({ step: step.id, message: `${field} is too long (max 2000 characters).` });
  }
  let depth = 0;
  for (const ch of value) {
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth < 0 || depth > 1) {
      issues.push({ step: step.id, message: `${field} has unbalanced template braces.` });
      return;
    }
  }
  if (depth !== 0) issues.push({ step: step.id, message: `${field} has unbalanced template braces.` });
}

function checkCancel(issues: ApiFlowValidationIssue[], step: ApiFlowStep) {
  if (step.cancelPattern == null) return;
  try {
    new RegExp(step.cancelPattern, "i");
  } catch {
    issues.push({ step: step.id, message: "cancelPattern is not a valid regular expression." });
  }
  if (step.cancelText != null) checkText(issues, step, "cancelText", step.cancelText);
}

function checkOptions(
  issues: ApiFlowValidationIssue[],
  step: ApiFlowStep,
  options: ApiFlowOption[] | undefined,
  { required }: { required: boolean }
) {
  if (options == null) {
    if (required && !step.promptFrom) {
      issues.push({ step: step.id, message: "options are required unless promptFrom supplies them dynamically." });
    }
    return;
  }
  if (options.length === 0) {
    issues.push({ step: step.id, message: "options must be a non-empty array." });
    return;
  }
  if (options.length > MAX_OPTIONS) {
    issues.push({ step: step.id, message: `a choice step can have at most ${MAX_OPTIONS} options (WhatsApp list limit).` });
  }
  const seen = new Set<string>();
  options.forEach((option, index) => {
    const where = `${step.id} option ${index + 1}`;
    if (!option.id || option.id.length > 128) {
      issues.push({ step: step.id, message: `${where} needs an id (1-128 chars).` });
    } else if (seen.has(option.id)) {
      issues.push({ step: step.id, message: `${where} duplicates option id "${option.id}".` });
    }
    seen.add(option.id);
    if (!option.label?.trim()) {
      issues.push({ step: step.id, message: `${where} needs a label.` });
    } else if (option.label.length > MAX_OPTION_LABEL) {
      issues.push({ step: step.id, message: `${where} label is too long (max ${MAX_OPTION_LABEL} characters, WhatsApp limit).` });
    }
    if (!option.next) {
      issues.push({ step: step.id, message: `${where} needs a next step id.` });
    }
  });
}

function checkOnText(issues: ApiFlowValidationIssue[], step: ApiFlowStep) {
  if (step.onText == null) return;
  if (!isRecord(step.onText)) {
    issues.push({ step: step.id, message: "onText must be an object." });
    return;
  }
  const intentMap = step.onText.intentMap;
  if (intentMap != null) {
    const entries = Object.entries(intentMap);
    if (entries.length === 0) {
      issues.push({ step: step.id, message: "onText.intentMap must map intent names to step ids." });
    }
    for (const [intent, target] of entries) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(intent)) {
        issues.push({ step: step.id, message: `onText.intentMap key "${intent}" is not an intent name (UPPER_SNAKE).` });
      }
      if (!target) {
        issues.push({ step: step.id, message: `onText.intentMap["${intent}"] must be a step id.` });
      }
    }
  }
  if (step.onText.next == null && step.onText.elseNext == null && intentMap == null) {
    issues.push({ step: step.id, message: "onText needs at least one of next, elseNext or intentMap." });
  }
}

function checkClassify(issues: ApiFlowValidationIssue[], step: ApiFlowStep) {
  if (step.classify == null) return;
  const categories = step.classify.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    issues.push({ step: step.id, message: "classify.categories must be a non-empty array." });
    return;
  }
  if (categories.length > MAX_OPTIONS) {
    issues.push({ step: step.id, message: `classify supports at most ${MAX_OPTIONS} categories.` });
  }
  const seen = new Set<string>();
  for (const category of categories) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(category.id ?? "")) {
      issues.push({ step: step.id, message: "each classify category needs an UPPER_SNAKE id." });
      continue;
    }
    if (seen.has(category.id)) {
      issues.push({ step: step.id, message: `duplicate classify category "${category.id}".` });
    }
    seen.add(category.id);
    if (!category.description?.trim()) {
      issues.push({ step: step.id, message: `classify category "${category.id}" needs a description the AI can match on.` });
    }
    if (!category.next) {
      issues.push({ step: step.id, message: `classify category "${category.id}" needs a next step id.` });
    }
  }
  if (typeof step.classify.fallback !== "string" || !step.classify.fallback) {
    issues.push({ step: step.id, message: "classify.fallback (step id) is required for answers the AI cannot place." });
  }
}

export function validateDefinition(
  definition: ApiFlowDefinition,
  known: { actions: string[]; promptProviders: string[]; conditions: string[] }
): ApiFlowValidationIssue[] {
  const issues: ApiFlowValidationIssue[] = [];
  const actions = new Set(known.actions);
  const promptProviders = new Set(known.promptProviders);
  const conditions = new Set(known.conditions);

  const steps = definition?.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    return [{ step: null, message: "A flow needs at least one step." }];
  }
  if (steps.length > MAX_STEPS) {
    issues.push({ step: null, message: `A flow can have at most ${MAX_STEPS} steps.` });
  }

  const byId = new Map<string, ApiFlowStep>();
  for (const step of steps) {
    if (!step?.id || !STEP_ID_PATTERN.test(step.id)) {
      issues.push({ step: null, message: `Every step needs an id matching ${STEP_ID_PATTERN}.` });
      continue;
    }
    if (byId.has(step.id)) {
      issues.push({ step: step.id, message: `Duplicate step id "${step.id}".` });
      continue;
    }
    byId.set(step.id, step);

    if (!STEP_TYPE_META[step.type]) {
      issues.push({ step: step.id, message: `Unknown step type "${step.type}".` });
      continue;
    }

    switch (step.type) {
      case "SAY":
        checkText(issues, step, "text", step.text);
        if (!step.next) issues.push({ step: step.id, message: "SAY steps need a next step id (use an END step to finish)." });
        break;
      case "ASK_CHOICE":
        if (step.text != null) checkText(issues, step, "text", step.text);
        if (step.text == null && step.promptFrom == null) {
          issues.push({ step: step.id, message: "ASK_CHOICE needs text or promptFrom." });
        }
        checkOptions(issues, step, step.options, { required: true });
        checkOnText(issues, step);
        checkCancel(issues, step);
        break;
      case "ASK_TEXT":
        if (step.text != null) checkText(issues, step, "text", step.text);
        if (step.text == null && step.promptFrom == null && step.sendText !== false) {
          issues.push({ step: step.id, message: "ASK_TEXT needs text or promptFrom (or sendText:false when the prompt was already sent)." });
        }
        if (step.saveAs != null && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(step.saveAs)) {
          issues.push({ step: step.id, message: "saveAs must be a plain variable name." });
        }
        checkOnText(issues, step);
        checkClassify(issues, step);
        checkCancel(issues, step);
        if (step.next == null && !step.onText && !step.classify) {
          issues.push({ step: step.id, message: "ASK_TEXT needs next, onText or classify to route the answer." });
        }
        break;
      case "ASK_LOCATION":
      case "ASK_PHOTO":
        if (step.text != null) checkText(issues, step, "text", step.text);
        if (step.text == null && step.promptFrom == null) {
          issues.push({ step: step.id, message: `${step.type} needs text or promptFrom.` });
        }
        checkOptions(issues, step, step.options, { required: false });
        if (step.reprompt != null) checkText(issues, step, "reprompt", step.reprompt);
        if (!step.next) issues.push({ step: step.id, message: `${step.type} needs a next step id for a successful answer.` });
        break;
      case "ACTION":
        if (!step.name) {
          issues.push({ step: step.id, message: "ACTION steps need a name." });
        } else if (actions.size > 0 && !actions.has(step.name)) {
          issues.push({ step: step.id, message: `Unknown action "${step.name}". Pick one from the dropdown.` });
        }
        if (step.params != null && !isRecord(step.params)) {
          issues.push({ step: step.id, message: "ACTION params must be an object." });
        }
        break;
      case "IF":
        if (!step.check || !conditions.has(step.check)) issues.push({ step: step.id, message: "Pick what to check." });
        if (!step.then) issues.push({ step: step.id, message: "Say where to go when it is true." });
        if (!step.else) issues.push({ step: step.id, message: "Say where to go when it is not." });
        break;
      case "END":
        if (step.text != null && step.text !== "") checkText(issues, step, "text", step.text);
        break;
      default:
        break;
    }

    if (step.promptFrom != null && promptProviders.size > 0 && !promptProviders.has(step.promptFrom)) {
      issues.push({ step: step.id, message: `Unknown prompt provider "${step.promptFrom}".` });
    }
  }

  for (const step of steps) {
    if (!step?.id) continue;
    for (const { target } of stepTargets(step)) {
      if (!byId.has(target)) {
        issues.push({ step: step.id, message: `Points at unknown step "${target}".` });
      }
    }
  }

  const entry = steps[0]?.id;
  if (entry && byId.has(entry)) {
    const reachable = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (reachable.has(id) || !byId.has(id)) continue;
      reachable.add(id);
      queue.push(...stepTargets(byId.get(id) as ApiFlowStep).map((t) => t.target));
    }
    for (const step of steps) {
      if (step?.id && !reachable.has(step.id)) {
        issues.push({ step: step.id, message: "Unreachable step — no branch leads here." });
      }
    }

    const color = new Map<string, number>([...reachable].map((id) => [id, 0]));
    const visit = (id: string) => {
      color.set(id, 1);
      for (const { target } of stepTargets(byId.get(id) as ApiFlowStep)) {
        if (!color.has(target)) continue;
        if (color.get(target) === 1) {
          issues.push({ step: target, message: `Cycle detected involving step "${target}" — flows cannot loop.` });
          return;
        }
        if (color.get(target) === 0) visit(target);
      }
      color.set(id, 2);
    };
    for (const id of reachable) {
      if (color.get(id) === 0) visit(id);
    }
  }

  return issues;
}

/** Steps available as "goes to" targets (everything except the step itself). */
export function targetOptions(definition: ApiFlowDefinition, excludeId?: string): string[] {
  return definition.steps.map((s) => s.id).filter((id) => id !== excludeId);
}

/** Rewrite every branch that points at oldId so renaming a step keeps the graph intact. */
export function renameReferences(definition: ApiFlowDefinition, oldId: string, newId: string): ApiFlowDefinition {
  if (oldId === newId) return definition;
  const fix = (target: string | undefined) => (target === oldId ? newId : target);
  return {
    steps: definition.steps.map((step) => ({
      ...step,
      next: fix(step.next),
      then: fix(step.then),
      else: fix(step.else),
      options: step.options?.map((o) => ({ ...o, next: o.next === oldId ? newId : o.next })),
      onText: step.onText
        ? {
            ...step.onText,
            next: fix(step.onText.next),
            elseNext: fix(step.onText.elseNext),
            intentMap: step.onText.intentMap
              ? Object.fromEntries(Object.entries(step.onText.intentMap).map(([k, v]) => [k, v === oldId ? newId : v]))
              : undefined,
          }
        : undefined,
      classify: step.classify
        ? {
            ...step.classify,
            fallback: step.classify.fallback === oldId ? newId : step.classify.fallback,
            categories: step.classify.categories.map((c) => ({ ...c, next: c.next === oldId ? newId : c.next })),
          }
        : undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// Display and editor-working-state helpers for the flow builder page.
// ---------------------------------------------------------------------------

/** What starts a flow, in words (the server writes it). */
export const triggerSummary = (flow: ApiFlowSummary): string => flow.startsWhen;

/** A topic written in plain words ("Working hours") as the lowercase slug the server stores ("working-hours"). */
export const slugify = (text: string, max = 40): string =>
  text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/, "");

export const TOPIC_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** A topic slug is optional, but when present must match the pattern. */
export const topicIsValid = (value: string): boolean =>
  value.trim() === "" || TOPIC_PATTERN.test(value.trim());

/** The mutable editor state seeded from a saved flow (optionally a specific version). */
export function workingFrom(detail: ApiFlowDetail, version?: ApiFlowVersion) {
  const v = version ?? detail.versions.find((x) => x.status === "DRAFT") ?? detail.versions.find((x) => x.status === "PUBLISHED") ?? detail.versions[0];
  const cfg = detail.triggerConfig ?? {};
  return {
    name: detail.name,
    description: detail.description ?? "",
    triggerType: detail.triggerType,
    intent: cfg.intent ?? "",
    topic: cfg.topic ?? "",
    definition: JSON.parse(JSON.stringify(v.definition)) as ApiFlowDefinition,
    baseVersion: v.version,
    baseStatus: v.status,
  };
}

export type Working = ReturnType<typeof workingFrom>;

/** Trigger edits are only offered for custom INTENT flows; anything else saves without a trigger payload. */
export function savePayloadFor(working: Working, isSystem: boolean) {
  const triggerConfig =
    working.triggerType === "INTENT" && !isSystem
      ? {
          intent: working.intent,
          ...(working.intent === "GENERAL_QUESTION" && slugify(working.topic) ? { topic: slugify(working.topic) } : {}),
        }
      : undefined;
  return {
    name: working.name,
    description: working.description,
    definition: working.definition,
    ...(triggerConfig ? { triggerConfig } : {}),
  };
}

/** Stable snapshot of the editable fields, used to detect unsaved changes. */
export const snapOf = (w: Working): string =>
  JSON.stringify({
    name: w.name,
    description: w.description,
    triggerType: w.triggerType,
    intent: w.intent,
    topic: w.topic,
    definition: w.definition,
  });
