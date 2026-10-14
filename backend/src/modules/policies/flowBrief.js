/**
 * What the AI flow author is told when it writes the conversation that satisfies a policy: what the policy blocks, and for each thing it
 * asks for, how to collect it. Pure: reads the policy and the registered checks, touches nothing.
 */
const registry = require('../../platform/registry');

// What a driver can give in WhatsApp, and the step that collects it.
const COLLECT = {
  DOCUMENT: { step: 'ASK_PHOTO', how: 'ASK_PHOTO with saveAs "{var}", then ACTION recordEvidence with params {"name":"{name}","type":"DOCUMENT","photo":"${var}"}' },
  LOCATION: { step: 'ASK_LOCATION', how: 'ASK_LOCATION with saveAs "{var}", then ACTION recordEvidence with params {"name":"{name}","type":"LOCATION","location":"${var}"}' },
  TEXT: { step: 'ASK_TEXT', how: 'ASK_TEXT with saveAs "{var}" and next, then ACTION recordEvidence with params {"name":"{name}","type":"TEXT","text":"${var}"}' },
  CONFIRMATION: { step: 'ASK_CHOICE', how: 'ASK_CHOICE with one option "Yes, done" (and optionally "Not yet" leading to an END that says to come back when it is done), then on Yes ACTION recordEvidence with params {"name":"{name}","type":"CONFIRMATION"}' },
};

/** Every leaf (requirement + params) in a rule tree. */
function leavesOf(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (node.requirement) found.push(node);
  for (const key of ['all', 'any']) if (Array.isArray(node[key])) node[key].forEach((child) => leavesOf(child, found));
  if (node.not) leavesOf(node.not, found);
  return found;
}

/** What the policy asks for: [{ name, type, label, collectable }] for the driver, and the notices for what only a manager can give. */
function requirementsOf(policy) {
  const collect = [];
  const waitFor = [];
  for (const leaf of leavesOf(policy.rule)) {
    const check = registry.getCheck(leaf.requirement);
    if (!check) continue;
    const wanted = check.requirement?.(leaf.params ?? {}) ?? null;
    if (wanted && COLLECT[wanted.type]) {
      if (!collect.some((item) => item.name === wanted.name)) collect.push({ ...wanted, via: COLLECT[wanted.type] });
    } else {
      waitFor.push(check.notice?.(leaf.params ?? {}) ?? check.label ?? leaf.requirement);
    }
  }
  return { collect, waitFor };
}

const variableOf = (name) => String(name).replace(/[^a-zA-Z0-9]/g, '_').replace(/^(\d)/, 'v$1');

/** The description handed to the flow author. */
function buildBrief(policy) {
  const { collect, waitFor } = requirementsOf(policy);
  const lines = [
    `A policy named "${policy.name}" blocks the action "${policy.action}" until the driver has provided what it asks for.`,
    policy.onBlock?.message ? `The driver is told when blocked: "${policy.onBlock.message}"` : 'The driver is told the action is blocked.',
    'Write the short conversation that starts when the driver is blocked. It must:',
    '1. Start with a SAY step that explains, in friendly WhatsApp words, what is needed and why.',
  ];
  collect.forEach((item, index) => {
    lines.push(`${index + 2}. Collect the ${item.label} (evidence name "${item.name}", type ${item.type}) with ${item.via.how.replaceAll('{var}', variableOf(item.name)).replaceAll('{name}', item.name)}.`);
  });
  if (waitFor.length > 0) {
    lines.push(`${collect.length + 2}. These can only be given by a manager, so do NOT ask the driver for them; tell the driver to wait for the manager: ${waitFor.join(' ')}`);
  }
  lines.push(`Finish with an END step telling the driver the information is saved and to send their last request again so it can go ahead.`);
  if (collect.length === 0 && waitFor.length === 0) lines.push('(The policy asks for nothing the driver can provide; the conversation only explains the block.)');
  return { text: lines.join('\n'), collect, waitFor };
}

/** Complaints for the author's retry: every collectable item must be saved with recordEvidence under its own name and type. */
function coverageIssues(definition, collect) {
  const saved = (definition?.steps ?? []).filter((s) => s.type === 'ACTION' && s.name === 'recordEvidence').map((s) => s.params ?? {});
  return collect
    .filter((item) => !saved.some((p) => p.name === item.name && p.type === item.type))
    .map((item) => ({ step: null, message: `No ACTION recordEvidence step saves "${item.name}" with type ${item.type}.` }));
}

module.exports = { buildBrief, requirementsOf, coverageIssues, leavesOf };
