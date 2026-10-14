const { listCapabilities, listPolicyActions } = require('../../platform/policy/catalog');

/** The public capability view: no evaluator functions leave the backend. */
const publicCapabilities = () => listCapabilities().map((c) => ({
  name: c.name,
  label: c.label,
  description: c.description,
  params: c.params ?? [],
  dataDependencies: c.dataDependencies ?? [],
  evidence: c.evidence ?? null,
  available: c.available !== false,
  unavailableReason: c.unavailableReason ?? null,
}));

/** What the builder needs to offer: the building blocks and the actions they can gate. */
const catalog = () => ({ capabilities: publicCapabilities(), actions: listPolicyActions() });

const clip = (text, length) => (text && text.length > length ? `${text.slice(0, length - 1)}…` : text ?? null);

/**
 * One short line per policy, from every version of every policy (`rows`, newest version first within a key): the version that is live
 * if there is one, otherwise the newest. "active" means published and switched on, which is when it can block anything.
 */
function summarizePolicies(rows) {
  const byKey = new Map();
  for (const row of rows) {
    if (!byKey.has(row.key)) byKey.set(row.key, []);
    byKey.get(row.key).push(row);
  }
  return [...byKey.values()].map((versions) => {
    const live = versions.find((row) => row.status === 'PUBLISHED');
    const shown = live ?? versions[0];
    const draft = versions.find((row) => row.status === 'DRAFT' && row.version > (live?.version ?? 0));
    return {
      key: shown.key, name: shown.name, description: clip(shown.description, 200), action: shown.action, version: shown.version,
      status: shown.status, enabled: shown.enabled, active: shown.status === 'PUBLISHED' && shown.enabled,
      whenRuleFails: shown.onBlock?.mode ?? 'BLOCK', builtIn: shown.isSystem, newerDraftVersion: draft?.version ?? null,
      writtenAs: clip(shown.sourceInstruction, 200),
    };
  });
}

module.exports = { publicCapabilities, catalog, summarizePolicies };
