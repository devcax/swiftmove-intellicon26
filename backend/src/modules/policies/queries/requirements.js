const { z } = require('zod');
const registry = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { matchApplies } = require('../../../platform/policy/engine');
const { getGatewayPolicies } = require('../../../platform/policy/store');

// The action name, plus any number of match values (?milestone=LOADED) that narrow which policies apply.
const inputSchema = z.object({ name: z.string().min(1).max(80) }).catchall(z.string().max(80));

/** Leaves a person has to satisfy: those under all/single nodes. Alternatives (any) are reported as one notice. */
function collectLeaves(node, found = { leaves: [], anyGroups: [] }) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node.all)) node.all.forEach((child) => collectLeaves(child, found));
  else if (Array.isArray(node.any)) found.anyGroups.push(node.any.map((child) => child?.requirement).filter(Boolean));
  else if (node.requirement) found.leaves.push(node);
  return found;
}

/**
 * What an action needs from the person before it can succeed, for forms and chats to ask up front:
 * `fields` are things they can provide (an upload, a confirmation, a note, a location), `notices` are things they cannot
 * (a manager's approval). Built from the published, enabled, blocking policies for the action. It is a convenience:
 * the policy check at action time stays the guard.
 */
function createRequirementsQuery({ getPolicies = getGatewayPolicies } = {}) {
  return registry.defineQuery({
    name: 'policy.requirements',
    description: 'List what a driver or manager must provide before an action can go ahead, according to the published policies. Give the action\'s exact name (policy.listAll shows which action each policy guards), not a policy name.',
    roles: ['ADMIN', 'MANAGER'],
    input: inputSchema,
    handler: async ({ input, actor }) => {
      const { name, ...match } = input;
      if (!registry.getAction(name)) throw new NotFoundError('That action does not exist.');
      const context = { source: match.source ?? 'API', actor: match.actor ?? 'MANAGER', params: match };
      const fields = [];
      const notices = [];
      const policies = await getPolicies(actor.organizationId, name);
      for (const policy of policies) {
        if (policy.enabled === false || policy.enforcement === 'SETTING' || (policy.onBlock?.mode ?? 'BLOCK') === 'WARN') continue;
        if (!matchApplies(policy.match, context)) continue;
        const { leaves, anyGroups } = collectLeaves(policy.rule);
        for (const leaf of leaves) {
          const check = registry.getCheck(leaf.requirement);
          if (!check || check.available === false) continue;
          const required = check.requirement?.(leaf.params ?? {});
          if (required) {
            if (!fields.some((f) => f.name === required.name && f.type === required.type)) fields.push({ ...required, policyKey: policy.key });
          } else if (check.notice) {
            notices.push({ message: check.notice(leaf.params ?? {}), policyKey: policy.key });
          }
        }
        for (const group of anyGroups) {
          const labels = group.map((requirement) => registry.getCheck(requirement)?.label).filter(Boolean);
          if (labels.length > 0) notices.push({ message: `One of these is needed: ${labels.join(', ')}.`, policyKey: policy.key });
        }
      }
      return { fields, notices };
    },
  });
}

module.exports = { createRequirementsQuery, collectLeaves, requirements: createRequirementsQuery() };
