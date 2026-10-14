const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { currentMilestoneRank } = require('../../../platform/policy/context');
const { stateError, lockJobById, tellAfterCommit } = require('../load');
const sm = require('../../../platform/jobStateMachine');
const repo = require('../repo');

const schema = z.object({ id: z.string().min(1).max(64), action: z.unknown().optional() });

module.exports = defineAction({
  name: 'trip.resolveCancellation',
  title: 'Decide on a cancellation request',
  description: 'A manager answers a driver\'s request to cancel: release the driver (the job is published again), cancel the job, or reject the request (the driver carries on).',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    await lockJobById({ tx, actor }, input.id);
    return { jobId: input.id, subject: { type: 'JOB', id: input.id } };
  },
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const job = await records.findJob(tx, organizationId, input.id);
    if (job.currentStatus !== 'CANCELLATION_REVIEW') throw stateError('Job is not in cancellation review');
    const assignment = await repo.findAssignmentUnderReview(tx, job.id);
    if (!assignment) throw stateError('No assignment under review');

    const by = { type: 'MANAGER', userId: actor.userId };
    const decision = input.action;
    let freed = false;
    if (decision === 'release' || decision === 'cancel') {
      await repo.cancelAssignment(tx, assignment.id, null);
      await records.setStatus(tx, job, decision === 'release' ? 'PUBLISHED' : 'CANCELLED', by);
      freed = true;
    } else if (decision === 'reject') {
      const backTo = assignment.startedAt ? 'ACTIVE' : 'ASSIGNED';
      await repo.restoreAssignment(tx, assignment.id, backTo);
      const rank = await currentMilestoneRank(tx, { id: job.id, current_status: job.currentStatus });
      const status = Object.keys(sm.MILESTONE_RANK).find((k) => sm.MILESTONE_RANK[k] === rank) ?? (backTo === 'ACTIVE' ? 'IN_PROGRESS' : 'ASSIGNED');
      await records.setStatus(tx, job, status, by);
    } else {
      throw stateError(`Unknown cancellation action: ${decision}`, 'BAD_ACTION');
    }
    if (freed) await records.clearActiveJob(tx, assignment.driverId);
    await records.audit(tx, { organizationId, actor: by, action: `CANCELLATION_${decision.toUpperCase()}`, entityId: job.id });

    const fresh = await records.findJob(tx, organizationId, job.id);
    const driver = await records.findDriverContact(tx, assignment.driverId);
    return {
      result: { ok: true, status: fresh.currentStatus, action: decision },
      events: [{ type: 'trip.cancellationResolved', payload: { jobId: job.id, decision } }],
      subject: { type: 'JOB', id: job.id },
      afterCommit: [tellAfterCommit('sendCancellationDecision', { job: records.toBotJob(fresh), driver, action: decision })],
    };
  },
});
