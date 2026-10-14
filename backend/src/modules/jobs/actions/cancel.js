const { defineAction } = require('../../../platform/registry');
const { cancelSchema } = require('../schemas');
const { lockJob, stateError, changed, tellDriverAfterCommit } = require('../load');
const changes = require('../changes');
const repo = require('../repo');

module.exports = defineAction({
  name: 'job.cancel',
  title: 'Cancel a job',
  description: 'Cancel a job that is not finished. Open driver requests expire, the assigned driver is released and told.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: cancelSchema,
  load: lockJob,
  handler: async ({ input, actor, tx }) => {
    const job = await changes.findJob(tx, actor.organizationId, input.id);
    if (['COMPLETED', 'CANCELLED'].includes(job.currentStatus)) throw stateError(`Job is already ${job.currentStatus}`);
    const reason = typeof input.reason === 'string' ? input.reason : null;

    // Open driver requests no longer make sense.
    await repo.expireOpenRequests(tx, job.id);

    // Cancel the live assignment (if any) and free the driver.
    const assignment = await changes.findLiveAssignment(tx, job.id);
    if (assignment) {
      await repo.cancelAssignment(tx, assignment.id, reason ?? 'Cancelled by manager');
      await changes.clearActiveJob(tx, assignment.driverId);
    }

    await changes.setStatus(tx, job, 'CANCELLED', actor.userId);
    await changes.recordEvent(tx, { jobId: job.id, assignmentId: assignment?.id ?? null, eventType: 'JOB_CANCELLED_BY_MANAGER', data: { reason } });
    await changes.audit(tx, { organizationId: job.organizationId, actorUserId: actor.userId, action: 'JOB_CANCELLED', entityId: job.id, after: { reason } });

    const driver = assignment ? await changes.findDriverContact(tx, assignment.driverId) : null;
    return {
      result: { ok: true, status: 'CANCELLED' },
      events: [changed(job, 'cancelled', 'CANCELLED')],
      subject: { type: 'JOB', id: job.id },
      afterCommit: [tellDriverAfterCommit('sendJobCancelled', { job: changes.toBotJob(job, 'CANCELLED'), driver })],
    };
  },
});
