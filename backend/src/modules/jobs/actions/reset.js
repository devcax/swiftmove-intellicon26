const { defineAction } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { generateSecurityCode } = require('../identifiers');
const { toJobSummary } = require('../present');
const { lockJob, stateError, changed } = require('../load');
const changes = require('../changes');
const repo = require('../repo');

module.exports = defineAction({
  name: 'job.reset',
  title: 'Reset a job',
  description: 'Wipe a job\'s trip history, requests, assignments and incidents, issue new security codes and publish it again.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  destructive: true,
  input: idSchema,
  load: lockJob,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const job = await changes.findJob(tx, organizationId, input.id);
    if (job.currentStatus === 'DRAFT') throw stateError('A draft job has nothing to reset');
    if (job.currentStatus === 'COMPLETED') throw stateError('A completed job is closed and cannot be reset.', 'JOB_FROZEN');

    await repo.resetJob(tx, job.id, { pickupCode: generateSecurityCode('PU'), deliveryCode: generateSecurityCode('DL') });
    await changes.audit(tx, {
      organizationId, actorUserId: actor.userId, action: 'JOB_RESET', entityId: job.id, before: { status: job.currentStatus }, after: { status: 'PUBLISHED' },
    });

    return {
      result: toJobSummary(await repo.findJobSummary(tx, organizationId, job.id)),
      events: [changed(job, 'reset', 'PUBLISHED'), { type: 'job.published', payload: { jobId: job.id, jobNumber: job.jobNumber } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
