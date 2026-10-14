const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const { NotFoundError } = require('../../../platform/errors');
const repo = require('../repo');

module.exports = defineAction({
  name: 'summary.save',
  title: 'Save a job\'s summary',
  description: 'Replace the rolling summary of a job with the updated text and note how many messages it now covers.',
  actors: ['SYSTEM'],
  input: z.object({ jobId: z.guid(), text: z.string().min(1).max(4000), lastMessageId: z.guid(), newCount: z.number().int().min(0) }),
  load: async ({ input, actor, tx }) => {
    if (!(await lockRow(tx, 'jobs', input.jobId, actor.organizationId))) throw new NotFoundError('Job not found');
    return { jobId: input.jobId, subject: { type: 'JOB', id: input.jobId } };
  },
  handler: async ({ input, tx }) => {
    await repo.saveSummary(tx, input.jobId, input.text, input.lastMessageId, input.newCount);
    return { result: { ok: true }, events: [], subject: { type: 'JOB', id: input.jobId } };
  },
});
