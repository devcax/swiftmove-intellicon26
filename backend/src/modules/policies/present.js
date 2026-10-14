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

module.exports = { publicCapabilities, catalog };
