const { defineAction } = require('../../../platform/registry');
const { ConflictError } = require('../../../platform/errors');
const { idSchema } = require('../schemas');
const { lockJob, changed } = require('../load');
const changes = require('../changes');
const repo = require('../repo');

module.exports = defineAction({
  name: 'job.deactivate',
  title: 'Deactivate a job',
  description: 'Cancel a job quietly: open requests expire, assignments are cancelled and the driver is freed, without messaging anyone. Use Cancel to tell the driver.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  destructive: true,
  input: idSchema,
  load: lockJob,
  handler: async ({ input, actor, tx }) => {
    const job = await changes.findJob(tx, actor.organizationId, input.id);
    if (['COMPLETED', 'CANCELLED'].includes(job.currentStatus)) throw new ConflictError(`Job ${job.jobNumber} is already ${job.currentStatus.toLowerCase()}.`);
    await repo.markCancelled(tx, job.id);
    await repo.expireOpenRequests(tx, job.id);
    await repo.cancelLiveAssignments(tx, job.id, changes.LIVE_ASSIGNMENT);
    await repo.clearActiveJobOfDrivers(tx, job.id);
    return { result: { ok: true, id: job.id, status: 'CANCELLED' }, events: [changed(job, 'deactivated', 'CANCELLED')], subject: { type: 'JOB', id: job.id } };
  },
});
