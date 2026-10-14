const { defineQuery } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { toTimelineEvent } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'job.timeline',
  description: 'The workflow events of a job, oldest first (at most 300).',
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  handler: async ({ input, actor, db }) => {
    await repo.requireJob(db, actor.organizationId, input.id);
    return (await repo.listTimeline(db, input.id)).map(toTimelineEvent);
  },
});
