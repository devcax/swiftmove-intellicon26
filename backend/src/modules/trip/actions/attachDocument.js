const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { lockRow } = require('../../../platform/db');
const records = require('../../../platform/jobRecords');
const { stateError, lockActingDriver, findDriverAssignment, lockJobById } = require('../load');
const repo = require('../repo');

const schema = z.object({
  attachmentIds: z.array(z.guid()).min(1).max(20), documentType: z.enum(['POD', 'OTHER']).default('OTHER'), caption: z.string().max(2000).nullish(),
  jobId: z.guid().nullish(), messageId: z.guid().nullish(), confidence: z.number().nullish(),
});

module.exports = defineAction({
  name: 'trip.attachDocument',
  title: 'Attach documents to a job',
  description: 'Link photos or files a driver sent to a job as received documents (a proof of delivery or another paper). The message they came in is the audit trail.',
  actors: ['DRIVER'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    await lockActingDriver({ actor, tx });
    const assignment = await findDriverAssignment(tx, actor);
    let jobId;
    if (input.jobId) {
      await lockJobById({ tx, actor }, input.jobId);
      jobId = input.jobId;
      if (assignment?.jobId !== jobId) {
        // A document for an earlier job of theirs is fine; for someone else's job it is not.
        if (!(await repo.driverHadJob(tx, jobId, actor.driverId))) throw stateError('That job is not assigned to you', 'NOT_YOUR_JOB');
      }
    } else {
      if (!assignment) throw stateError('You have no active job to attach documents to', 'NO_ACTIVE_JOB');
      jobId = assignment.jobId;
      await lockRow(tx, 'jobs', jobId, actor.organizationId);
    }
    return { driverId: actor.driverId, jobId, assignment, subject: { type: 'JOB', id: jobId } };
  },
  handler: async ({ input, actor, tx, subject }) => {
    const job = await records.findJob(tx, actor.organizationId, subject.jobId);
    if (!job) throw new NotFoundError('Job not found');
    const own = subject.assignment?.jobId === job.id ? subject.assignment : null;
    await records.recordEvent(tx, {
      jobId: job.id, assignmentId: own?.id ?? null, messageId: input.messageId, eventType: 'DOCUMENT_RECEIVED', confidence: input.confidence,
      data: { attachment_ids: input.attachmentIds, document_type: input.documentType, caption: input.caption ?? null },
    });
    return {
      result: { jobId: job.id }, events: [{ type: 'document.received', payload: { jobId: job.id, documentType: input.documentType } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
