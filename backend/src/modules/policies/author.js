/**
 * AI policy author — turns a manager's plain-words operational rule into a
 * DRAFT policy in the constrained DSL.
 *
 * Same contract as the flow author: the LLM is only an authoring assistant.
 * Its output is validated with the exact same validatePolicy() rules the
 * manual editor and the publish path use, one automatic retry feeds the
 * validator's complaints back to the model, and the result always lands as a
 * DRAFT — nothing is ever activated without an explicit publish.
 *
 * Capabilities the registry declares unavailable (e.g. GPS radius checks) are
 * listed in the prompt as forbidden; the model must report uncovered needs in
 * "unsupported" instead of faking a check. The backend independently scans
 * the returned rule so an unsupported leaf can never slip through silently.
 *
 * The prompt is an AI instruction (policy.author) so it can be tuned from the
 * dashboard like the other prompts.
 */
const { chatJson } = require('../../platform/llm');
const { getInstruction } = require('../../platform/instructions');
const { validatePolicy } = require('../../platform/policy/dsl');
const { listCapabilities, getCapability, listPolicyActions, checksUsableOn } = require('../../platform/policy/catalog');
const registry = require('../../platform/registry');

const AUTHOR_PROMPT = `You draft operational policies for a WhatsApp logistics operation.
A manager describes a business rule in plain words; you convert it into a constrained policy definition (JSON) that a deterministic policy engine evaluates before an action is allowed.

Policy shape:
{
  "name": "short business name",
  "description": "one sentence a non-technical manager understands",
  "action": "ONE action from the provided list",
  "match": { optional constraints on WHEN the policy applies },
  "rule": { condition tree that must be TRUE for the action to be allowed },
  "onBlock": { "mode": "BLOCK", "message": "what the driver sees when blocked", "flowKey": optional }
}

Rule tree:
- leaf: {"requirement": "capability_name", "params": { ... }}
- combine: {"all": [ ... ]}, {"any": [ ... ]}, {"not": { ... }} — at most 4 levels deep and 12 leaves total.

Match block:
- only the action's listed match fields, plus "source" and "actor".
- values: a scalar, {"in": [...]}, {"not": value}, or {"rankGt": "STATUS"}.
- actor is DRIVER, MANAGER or SYSTEM; source is CHAT (WhatsApp), DOCUMENT (document pipeline), MANAGER (dashboard), API or TIMER.

onBlock.mode:
- BLOCK (default): refuse the action and explain why.
- WARN: allow the action but record a warning (e.g. merge a duplicate report).
- ESCALATE: refuse and flag a manager for review.

Hard rules:
1. Use ONLY the actions and capabilities in the provided catalogs — never invent requirement names, params, or actions.
2. The rule expresses what must hold for the action to PROCEED. Example: "a driver who already has a job must not request another" → {"requirement": "driver_available"}.
3. If the manager's rule needs something no capability covers (GPS radius checks, signature capture, payments, ...), draft the closest supported part and list every uncovered need in "unsupported". NEVER fake a check the system cannot run.
4. onBlock.message is short, friendly WhatsApp English addressed to the driver (or to the manager for MANAGER actions). No internal codes.
5. Keep it minimal: prefer one or two leaves over deep trees.

Respond with JSON only:
{"name","description","action","match","rule","onBlock","unsupported":["needs the system cannot check"]}
Use {} for match when the policy always applies; omit "unsupported" when empty.`;

/** Render the action/capability catalogs injected into the prompt. */
function renderCatalogs() {
  // For each action, only the checks that can be used on it, so the model is not offered a rule the validator would refuse.
  const actions = listPolicyActions().map(
    (a) => `- ${a.name} — ${a.description} Match fields: ${[...(a.matchFields ?? []), 'source', 'actor'].join(', ')}. Usable requirements: ${checksUsableOn(a.name).join(', ')}.`
  ).join('\n');

  const capabilities = listCapabilities().map((c) => {
    if (c.available === false) {
      return `- ${c.name} — NOT AVAILABLE: ${c.unavailableReason} Never use it; list it under "unsupported" instead.`;
    }
    const params = (c.params ?? [])
      .map((p) => {
        let doc = `${p.name} (${p.kind}`;
        if (p.values) doc += `: ${p.values.join(' | ')}`;
        if (p.min != null) doc += `, ${p.min}-${p.max}`;
        doc += p.required ? ', required' : ', optional';
        return `${doc})`;
      })
      .join('; ');
    const onlyFor = registry.getCheck(c.name)?.actions;
    const restriction = Array.isArray(onlyFor) ? ` Only for: ${onlyFor.join(', ')}.` : '';
    return `- ${c.name} — ${c.description}${params ? ` Params: ${params}.` : ''}${restriction}`;
  }).join('\n');

  return { actions, capabilities };
}

function collectLeaves(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node.all)) node.all.forEach((child) => collectLeaves(child, out));
  else if (Array.isArray(node.any)) node.any.forEach((child) => collectLeaves(child, out));
  else if (Object.prototype.hasOwnProperty.call(node, 'not')) collectLeaves(node.not, out);
  else if (typeof node.requirement === 'string') out.push(node);
  return out;
}

/**
 * Merge the model's self-reported unsupported needs with an independent scan
 * of the returned rule, resolving honest reasons from the registry.
 */
function normalizeUnsupported(list, rule) {
  const seen = new Map();
  const add = (name, reason) => {
    const key = String(name ?? '').trim();
    if (key && !seen.has(key)) seen.set(key, { name: key, reason });
  };
  for (const item of Array.isArray(list) ? list : []) {
    const name = String(item?.name ?? item ?? '').trim();
    if (!name) continue;
    const cap = getCapability(name);
    add(name, cap ? (cap.available === false ? cap.unavailableReason : 'Covered by the draft.') : 'No such capability exists in the registry.');
  }
  for (const leaf of collectLeaves(rule)) {
    const cap = getCapability(leaf.requirement);
    if (!cap) add(leaf.requirement, 'No such capability exists in the registry.');
    else if (cap.available === false) add(leaf.requirement, cap.unavailableReason);
  }
  return [...seen.values()];
}

/** Derive a URL-style policy key from a name. */
function slugify(text) {
  const slug = String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.')
    .slice(0, 60);
  return slug || null;
}

/** One LLM attempt; separated so the retry can append validator feedback. */
function buildUserMessage({ instruction, base, catalogs, issues }) {
  const parts = [];
  parts.push(`Actions you may gate (name — what it does):\n${catalogs.actions}`);
  parts.push(`Capabilities you may require (name — what it checks):\n${catalogs.capabilities}`);
  if (base) {
    parts.push(`Current policy to modify:\n${JSON.stringify(base)}`);
    parts.push(`The manager wants this change: """${instruction}"""\nReturn the complete updated policy.`);
  } else {
    parts.push(`The manager wants a NEW policy: """${instruction}"""`);
  }
  if (issues?.length) {
    parts.push(
      `Your previous draft was rejected by the validator. Fix exactly these problems and return the corrected policy:\n- ${issues.join('\n- ')}`
    );
  }
  return parts.join('\n\n');
}

function formatIssues(errors) {
  return (errors ?? []).map((e) => `${e.field ? `${e.field}: ` : ''}${e.message}`);
}

/**
 * Draft a policy from a plain-words instruction.
 *
 * @param {object} args
 * @param {string} args.instruction  What the manager wants (or the change, when base is given).
 * @param {object} [args.base]       Existing policy content to modify ({action, match, rule, onBlock, name, description}).
 * @param {string|null} [args.organizationId]  For the policy.author instruction override.
 * @param {object} [args.catalogs]   { actions, capabilities } — pre-rendered bullet lists.
 * @param {Function} [args.validate] validatePolicy-compatible fn (injectable for tests).
 * @param {Function} [args.chat]     chatJson-compatible fn (injectable for tests).
 * @param {Function} [args.resolveInstruction]  getInstruction-compatible fn (injectable for tests).
 * @returns {Promise<{ ok: boolean, draft?: object, suggestedKey?: string|null,
 *                     unsupported: Array, issues?: string[], attempts: number }>}
 */
async function draftPolicy({
  instruction,
  base = null,
  organizationId = null,
  catalogs = renderCatalogs(),
  validate = validatePolicy,
  chat = chatJson,
  resolveInstruction = getInstruction,
}) {
  const system = (await resolveInstruction(organizationId, 'policy.author')) ?? AUTHOR_PROMPT;

  let issues = null;
  let lastResult = null;
  let lastDraft = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const user = buildUserMessage({ instruction, base, catalogs, issues });
    const result = await chat({
      system,
      user,
      maxTokens: 2500,
      temperature: attempt === 1 ? 0.2 : 0,
    });
    lastResult = result;

    const draft = {
      name: String(result?.name ?? '').trim().slice(0, 160),
      description: String(result?.description ?? '').trim().slice(0, 1000) || null,
      action: result?.action,
      match: result?.match ?? {},
      rule: result?.rule,
      onBlock: result?.onBlock ?? { mode: 'BLOCK' },
    };
    lastDraft = draft;

    const check = validate(draft);
    if (check.ok) {
      return {
        ok: true,
        draft,
        suggestedKey: slugify(draft.name),
        unsupported: normalizeUnsupported(result?.unsupported, draft.rule),
        attempts: attempt,
      };
    }
    issues = formatIssues(check.errors);
  }

  return {
    ok: false,
    issues,
    unsupported: normalizeUnsupported(lastResult?.unsupported, lastDraft?.rule),
    attempts: 2,
  };
}

module.exports = { AUTHOR_PROMPT, draftPolicy, renderCatalogs, slugify };
