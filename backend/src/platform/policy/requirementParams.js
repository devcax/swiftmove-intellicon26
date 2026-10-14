/** The params of the first leaf asking for `requirement` inside a policy rule tree, or null. */
function findRequirementParams(node, requirement) {
  if (!node || typeof node !== 'object') return null;
  if (node.requirement === requirement) return node.params ?? {};
  for (const key of ['all', 'any']) {
    if (Array.isArray(node[key])) {
      for (const child of node[key]) {
        const found = findRequirementParams(child, requirement);
        if (found) return found;
      }
    }
  }
  if (node.not) return findRequirementParams(node.not, requirement);
  return null;
}

/** Like findRequirementParams, over a store: the leaf of the published GATEWAY policy `policyKey`, or `fallback`. */
function paramsFromPolicies(policies, policyKey, requirement, fallback) {
  const policy = policies.find((p) => p.key === policyKey && p.enforcement !== 'SETTING' && p.enabled !== false);
  if (!policy) return fallback;
  return findRequirementParams(policy.rule, requirement) ?? fallback;
}

module.exports = { findRequirementParams, paramsFromPolicies };
