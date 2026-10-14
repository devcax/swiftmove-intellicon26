const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');
const { notice } = require('../../platform/notice');

const job = { jobId: z.guid() };

module.exports = [
  defineEvent({ name: 'trip.started', description: 'A driver confirmed they started the trip.', payload: z.object({ ...job, driverId: z.guid(), assignmentId: z.guid() }) }),
  defineEvent({
    name: 'trip.milestoneReached', description: 'The trip moved to a new milestone (arrived, loaded, departed, delivered, ...).',
    payload: z.object({ ...job, milestone: z.string(), newStatus: z.string() }),
  }),
  defineEvent({
    name: 'document.verified', description: 'A pickup or delivery document was verified, by its security code or by a manager.',
    payload: z.object({ ...job, stage: z.enum(['PICKUP', 'DELIVERY']), method: z.string(), notice: notice.optional() }),
  }),
  defineEvent({
    name: 'document.rejected', description: 'A photo of a pickup or delivery paper did not match the security code.',
    payload: z.object({ ...job, stage: z.enum(['PICKUP', 'DELIVERY']), reason: z.string(), notice: notice.optional() }),
  }),
  defineEvent({ name: 'document.received', description: 'A driver sent documents for a job.', payload: z.object({ ...job, documentType: z.string() }) }),
  defineEvent({ name: 'trip.delayReported', description: 'A delay was reported or its reason recorded.', payload: z.object({ ...job, stage: z.string().nullable(), notice: notice.optional() }) }),
  defineEvent({
    name: 'trip.cancellationRequested', description: 'A driver asked to cancel the job.', payload: z.object({ ...job, driverId: z.guid(), notice: notice.optional() }),
  }),
  defineEvent({
    name: 'trip.cancellationResolved', description: 'A manager decided on a cancellation request (release, cancel or reject).',
    payload: z.object({ ...job, decision: z.string() }),
  }),
  defineEvent({ name: 'trip.driverReleased', description: 'A manager released the driver from the job.', payload: z.object({ ...job, driverId: z.guid() }) }),
];
