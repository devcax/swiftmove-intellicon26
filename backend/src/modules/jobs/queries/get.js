const { defineQuery } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { idSchema } = require('../schemas');
const { toJobDetail } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'job.get',
  description: 'One job with its stops, items and the driver it is assigned to.',
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  handler: async ({ input, actor, db }) => {
    await repo.requireJob(db, actor.organizationId, input.id);
    const detail = await repo.findJobDetail(db, actor.organizationId, input.id);
    if (!detail) throw new NotFoundError('Job not found');
    return toJobDetail(detail);
  },
});
