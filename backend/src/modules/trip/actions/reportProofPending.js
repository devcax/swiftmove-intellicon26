const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const sm = require('../../../platform/jobStateMachine');
const { loadDriverTrip, stateError } = require('../load');

module.exports = defineAction({
  name: 'trip.reportProofPending',
  title: 'Record reported loading or delivery',
  description: 'Save a driver’s reported milestone as awaiting document proof. This never confirms a milestone or changes the job status.',
  actors: ['DRIVER'],
  input: z.object({ milestone: z.enum(['LOADED', 'DELIVERED']), messageId: z.guid().nullish(), confidence: z.number().min(0).max(1).nullish() }),
  load: async args => {
    const subject = await loadDriverTrip(args, { statuses: ['ASSIGNED', 'ACTIVE'], message: 'You do not have an active job for this update.' });
    const job = await records.findJob(args.tx, args.actor.organizationId, subject.jobId);
    if (job.currentStatus === 'CANCELLATION_REVIEW') throw stateError('This job is waiting for cancellation review.', 'JOB_FROZEN');
    return { ...subject, job };
  },
  handler: async ({ tx, input, subject }) => {
    const { job, assignment } = subject;
    const stage = input.milestone === 'LOADED' ? 'PICKUP' : 'DELIVERY';
    const verified = stage === 'PICKUP' ? job.pickupVerifiedAt : job.deliveryVerifiedAt;
    if (verified || sm.rankOf(job.currentStatus) >= sm.STAGE_RANK[input.milestone]) {
      return { result: { jobId: job.id, waiting: false, stage }, events: [] };
    }
    const duplicate = input.messageId && await tx.workflowEvent.findFirst({
      where: { jobId: job.id, assignmentId: assignment.id, sourceMessageId: input.messageId, eventType: 'MILESTONE_REPORTED', eventData: { path: ['milestone'], equals: input.milestone } }, select: { id: true },
    });
    if (!duplicate) await records.recordEvent(tx, {
      jobId: job.id, assignmentId: assignment.id, messageId: input.messageId, confidence: input.confidence,
      eventType: 'MILESTONE_REPORTED', status: 'REVIEW_REQUIRED',
      data: { milestone: input.milestone, proofStage: stage, assignmentId: assignment.id },
    });
    return { result: { jobId: job.id, waiting: true, stage }, events: [], subject: { type: 'JOB', id: job.id } };
  },
});
