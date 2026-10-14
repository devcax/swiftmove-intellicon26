const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { loadDriverTrip } = require('../load');
const repo = require('../repo');

const schema = z.object({ reason: z.string().max(2000).nullish(), messageId: z.guid().nullish(), confidence: z.number().nullish() });

/** A driver asks to cancel after an offer or an assignment: the job goes to review. It is never cancelled automatically. */
module.exports = defineAction({
  name: 'trip.requestCancellation',
  title: 'Ask to cancel the job',
  description: 'A driver asks a manager to cancel their job or release them from it. The job waits in cancellation review until a manager decides.',
  actors: ['DRIVER'],
  input: schema,
  load: (args) => loadDriverTrip(args, { statuses: ['PENDING_DRIVER_ACCEPTANCE', 'ASSIGNED', 'ACTIVE'], message: 'No assignment to cancel' }),
  handler: async ({ input, actor, tx, subject }) => {
    const { assignment } = subject;
    const reason = input.reason ?? null;
    const job = await records.findJob(tx, actor.organizationId, subject.jobId);
    await repo.putUnderReview(tx, assignment.id, reason);
    await records.setStatus(tx, job, 'CANCELLATION_REVIEW', { type: 'DRIVER', driverId: actor.driverId });
    await records.recordEvent(tx, {
      jobId: job.id, assignmentId: assignment.id, messageId: input.messageId, eventType: 'CANCELLATION_REQUESTED', status: 'REVIEW_REQUIRED',
      data: { reason, stage: assignment.status }, confidence: input.confidence,
    });
    const driverName = await records.findDriverName(tx, actor.driverId);
    const notice = {
      type: 'CANCELLATION_REQUEST', title: `${driverName} wants to cancel ${job.jobNumber}`,
      body: `Stage: ${assignment.status}. Reason: ${reason ?? 'not given'}. Review in the job detail page.`, severity: assignment.status === 'ACTIVE' ? 'CRITICAL' : 'HIGH',
    };
    return {
      result: { jobId: job.id, assignmentId: assignment.id }, events: [{ type: 'trip.cancellationRequested', payload: { jobId: job.id, driverId: actor.driverId, notice } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
