const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { driverStepSchema } = require('../schemas');
const { lockActingDriver, stateError } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'request.withdraw',
  title: 'Withdraw a job request',
  description: 'A driver takes back their pending request before a manager decides on it.',
  actors: ['DRIVER'],
  input: driverStepSchema,
  load: lockActingDriver,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const cancelled = await repo.cancelPendingRequest(tx, actor.driverId);
    if (!cancelled) throw stateError('No pending request to cancel', 'NO_PENDING_REQUEST');

    const job = await records.findJob(tx, organizationId, cancelled.job_id);
    const by = { type: 'DRIVER', driverId: actor.driverId };
    const others = await records.hasPendingRequests(tx, job.id);
    if (!others && job.currentStatus === 'DRIVER_REQUESTED') await records.setStatus(tx, job, 'PUBLISHED', by);
    await records.recordEvent(tx, { jobId: job.id, messageId: input.messageId, eventType: 'CANCEL_JOB_REQUEST', confidence: input.confidence });
    await records.audit(tx, { organizationId, actor: by, action: 'JOB_REQUEST_CANCELLED', entityId: job.id });

    return {
      result: { jobId: job.id },
      events: [{ type: 'request.withdrawn', payload: { requestId: cancelled.id, jobId: job.id, driverId: actor.driverId } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
