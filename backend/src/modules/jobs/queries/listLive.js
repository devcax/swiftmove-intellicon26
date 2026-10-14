const { defineQuery } = require('../../../platform/registry');
const { emptySchema } = require('../schemas');
const { toLiveJob } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'job.listLive',
  description: 'Jobs that are in progress, most recently active first, with the last event and the number of open incidents.',
  roles: ['ADMIN', 'MANAGER'],
  input: emptySchema,
  handler: async ({ actor, db }) => (await repo.listLiveJobs(db, actor.organizationId)).map(toLiveJob),
});
