const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const records = require('../../../platform/jobRecords');
const { driverStepSchema } = require('../schemas');
const { lockActingDriver, stateError } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'offer.decline',
  title: 'Decline a job offer',
  description: 'A driver declines the offered job. It goes back to the open pool and the managers are told.',
  actors: ['DRIVER'],
  input: driverStepSchema,
  load: async ({ actor, tx }) => {
    await lockActingDriver({ actor, tx });
    const assignment = await records.findDriverLiveAssignment(tx, actor.organizationId, actor.driverId);
    if (!assignment || assignment.status !== 'PENDING_DRIVER_ACCEPTANCE') throw stateError('No approved job offer is waiting for you', 'NO_OFFER');
    await lockRow(tx, 'jobs', assignment.jobId, actor.organizationId);
    return { driverId: actor.driverId, jobId: assignment.jobId, offer: assignment, subject: { type: 'JOB', id: assignment.jobId } };
  },
  handler: async ({ input, actor, tx, subject }) => {
    const organizationId = actor.organizationId;
    const assignment = subject.offer;
    await repo.declineOffer(tx, assignment.id);

    const job = await records.findJob(tx, organizationId, assignment.jobId);
    const others = await records.hasPendingRequests(tx, job.id);
    const by = { type: 'DRIVER', driverId: actor.driverId };
    await records.setStatus(tx, job, others ? 'DRIVER_REQUESTED' : 'PUBLISHED', by);
    await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment.id, messageId: input.messageId, eventType: 'DECLINE_JOB', confidence: input.confidence });
    const driverName = await records.findDriverName(tx, actor.driverId);
    const notice = {
      type: 'OFFER_DECLINED', title: `${driverName} declined ${job.jobNumber}`,
      body: 'The approved driver declined the offer. The job is back in the published pool.', severity: 'WARNING',
    };
    return {
      result: { jobId: job.id },
      events: [{ type: 'offer.declined', payload: { jobId: job.id, driverId: actor.driverId, assignmentId: assignment.id, notice } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
