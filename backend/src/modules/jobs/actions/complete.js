const { defineAction } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { lockJob, stateError, changed, tellDriverAfterCommit } = require('../load');
const changes = require('../changes');
const repo = require('../repo');

const COMPLETABLE = ['DELIVERED', 'DELIVERED_WITH_EXCEPTION', 'DRIVER_SUBMITTED_COMPLETION', 'MANAGER_REVIEW', 'REQUIRES_CORRECTION'];

module.exports = defineAction({
  name: 'job.complete',
  title: 'Complete a job',
  description: 'Close a reviewed job as done. The driver becomes available again and is thanked. Completing a job that is already complete changes nothing.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  load: lockJob,
  handler: async ({ input, actor, tx }) => {
    const job = await changes.findJob(tx, actor.organizationId, input.id);
    if (!COMPLETABLE.includes(job.currentStatus)) {
      // A double-click on Confirm Closure (or a repeat call) lands here: the job is already done, so say so and write nothing twice.
      if (job.currentStatus === 'COMPLETED') {
        return { result: { ok: true, status: 'COMPLETED', alreadyCompleted: true }, events: [], subject: { type: 'JOB', id: job.id } };
      }
      throw stateError(`Job is ${job.currentStatus} — only jobs submitted for completion can be marked done`);
    }
    const assignment = await changes.findLiveAssignment(tx, job.id, ['ACTIVE', 'ASSIGNED']);

    await changes.setStatus(tx, job, 'COMPLETED', actor.userId);
    await changes.recordEvent(tx, { jobId: job.id, assignmentId: assignment?.id ?? null, eventType: 'JOB_COMPLETED', data: { approved_by: actor.userId } });
    await repo.markCompleted(tx, job.id, actor.userId);
    if (assignment) {
      await repo.completeAssignment(tx, assignment.id);
      await changes.clearActiveJob(tx, assignment.driverId);
    }
    await changes.audit(tx, { organizationId: job.organizationId, actorUserId: actor.userId, action: 'JOB_COMPLETED', entityId: job.id });

    const driver = assignment ? await changes.findDriverContact(tx, assignment.driverId) : null;
    return {
      result: { ok: true, status: 'COMPLETED', alreadyCompleted: false },
      events: [changed(job, 'completed', 'COMPLETED')],
      subject: { type: 'JOB', id: job.id },
      afterCommit: [tellDriverAfterCommit('sendJobCompleted', { job: changes.toBotJob(job, 'COMPLETED'), driver })],
    };
  },
});
