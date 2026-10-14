const { defineQuery } = require('../../../platform/registry');
const { emptySchema } = require('../schemas');
const { toHistoryLine } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'request.history',
  description: 'Every decision a manager made on a driver\'s ask: taking a job, cancelling one, closing one out. Newest first.',
  roles: ['ADMIN', 'MANAGER'],
  input: emptySchema,
  handler: async ({ actor, db }) => (await repo.listHistory(db, actor.organizationId)).map(toHistoryLine),
});
