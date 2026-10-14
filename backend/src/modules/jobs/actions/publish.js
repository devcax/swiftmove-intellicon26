const { defineAction } = require('../../../platform/registry');
const { ConflictError } = require('../../../platform/errors');
const { idSchema } = require('../schemas');
const { lockJob, changed } = require('../load');
const changes = require('../changes');
const repo = require('../repo');

module.exports = defineAction({
  name: 'job.publish',
  title: 'Reopen a cancelled job',
  description: 'Publish a cancelled job again so drivers can request it.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  load: lockJob,
  handler: async ({ input, actor, tx }) => {
    const job = await changes.findJob(tx, actor.organizationId, input.id);
    if (job.currentStatus !== 'CANCELLED') {
      throw new ConflictError(`Only cancelled jobs can be reactivated (${job.jobNumber} is ${job.currentStatus.toLowerCase()}).`);
    }
    await repo.republish(tx, job);
    return {
      result: { ok: true, id: job.id, status: 'PUBLISHED' },
      events: [changed(job, 'published', 'PUBLISHED'), { type: 'job.published', payload: { jobId: job.id, jobNumber: job.jobNumber } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
