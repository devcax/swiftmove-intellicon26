const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const { NotFoundError } = require('../../../platform/errors');
const repo = require('../repo');

module.exports = defineAction({
  name: 'summary.ensure',
  title: 'Start a job\'s summary',
  description: 'Make sure the job has a summary row for the driver on it. Doing it twice changes nothing.',
  actors: ['SYSTEM'],
  input: z.object({ jobId: z.guid(), driverId: z.guid() }),
  load: async ({ input, actor, tx }) => {
    if (!(await lockRow(tx, 'jobs', input.jobId, actor.organizationId))) throw new NotFoundError('Job not found');
    return { jobId: input.jobId, subject: { type: 'JOB', id: input.jobId } };
  },
  handler: async ({ input, tx }) => {
    await repo.ensureSummary(tx, input.jobId, input.driverId);
    return { result: { ok: true }, events: [], subject: { type: 'JOB', id: input.jobId } };
  },
});
