const { defineQuery } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { keySchema } = require('../schemas');
const { mapFlowSummary, mapVersion } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'flow.get',
  description: 'One flow with every version of it.',
  roles: ['ADMIN', 'MANAGER'],
  input: keySchema,
  handler: async ({ input, actor, db }) => {
    const rows = await repo.loadRows(db, actor.organizationId, input.key);
    if (rows.length === 0) throw new NotFoundError('Flow not found.');
    return { ...mapFlowSummary(rows), versions: rows.map(mapVersion) };
  },
});
