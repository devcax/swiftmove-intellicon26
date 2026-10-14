const { defineQuery } = require('../../../platform/registry');
const { listSchema } = require('../schemas');
const { presentEvidence } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'evidence.list',
  description: 'List the evidence recorded for a driver or a job, newest first.',
  roles: ['ADMIN', 'MANAGER'],
  input: listSchema,
  handler: async ({ input, actor, db }) => (
    await repo.listEvidence(db, actor.organizationId, { ...input, includeRevoked: input.includeRevoked === 'true' })
  ).map(presentEvidence),
});
