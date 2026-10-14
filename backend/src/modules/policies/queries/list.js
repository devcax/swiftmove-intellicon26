const { defineQuery } = require('../../../platform/registry');
const { getPolicyStore } = require('../../../platform/policy/store');
const { emptySchema } = require('../schemas');
const { catalog } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'policy.list',
  description: 'List every policy with its version history, plus the building blocks and actions the policy builder offers.',
  roles: ['ADMIN', 'MANAGER'],
  input: emptySchema,
  handler: async ({ actor, db }) => {
    const [policies, store] = await Promise.all([repo.listPolicies(db, actor.organizationId), getPolicyStore(actor.organizationId)]);
    return { policies, store: { version: store.version, source: store.source }, ...catalog() };
  },
});
