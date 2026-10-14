const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { lockActingDriver, lockJobById } = require('../load');

const schema = z.object({
  jobId: z.guid(), stage: z.enum(['PICKUP', 'DELIVERY']), failure: z.enum(['TECHNICAL', 'UNREADABLE', 'PICKUP_REQUIRED_FIRST']),
  attachmentId: z.guid().nullish(), notes: z.string().max(2000).nullish(), messageId: z.guid().nullish(),
});

module.exports = defineAction({
  name: 'trip.recordDocumentIssue',
  title: 'Record a document that could not be checked',
  description: 'Note that a photo of a pickup or delivery paper could not be verified (unreadable, a technical fault, or sent in the wrong order) so a manager can review it.',
  actors: ['DRIVER'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    await lockActingDriver({ actor, tx });
    await lockJobById({ tx, actor }, input.jobId);
    return { driverId: actor.driverId, jobId: input.jobId, subject: { type: 'JOB', id: input.jobId } };
  },
  handler: async ({ input, tx }) => {
    const data = { stage: input.stage, attachment_id: input.attachmentId ?? null, failure: input.failure, ...(input.notes ? { notes: input.notes } : {}) };
    await records.recordEvent(tx, { jobId: input.jobId, messageId: input.messageId, eventType: 'DOCUMENT_VERIFICATION_FAILED', status: 'REVIEW_REQUIRED', data });
    return { result: { ok: true }, events: [], subject: { type: 'JOB', id: input.jobId } };
  },
});
