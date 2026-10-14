const { defineQuery } = require('../../../platform/registry');
const { listAllSchema } = require('../schemas');
const { summarizePolicies } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'policy.listAll',
  description: 'List all policies (rules) in short: name, which action each one guards, and whether it is active (published and switched on). Use this to answer which policies exist or whether one is active.',
  roles: ['ADMIN', 'MANAGER'],
  input: listAllSchema,
  handler: async ({ input, actor, db }) => {
    const wanted = String(input.search ?? '').trim().toLowerCase();
    const policies = summarizePolicies(await repo.listPolicies(db, actor.organizationId))
      .filter((policy) => !input.activeOnly || policy.active)
      .filter((policy) => !wanted || `${policy.key} ${policy.name} ${policy.description ?? ''} ${policy.action}`.toLowerCase().includes(wanted));
    return { total: policies.length, active: policies.filter((policy) => policy.active).length, policies };
  },
});
