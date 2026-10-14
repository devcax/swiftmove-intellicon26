const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'request.offerCandidates',
  description: 'For offering a job to drivers: the job (with where it loads and unloads), its cargo, and the drivers who could be invited. Used by the driverMatching plugin.',
  actors: ['SYSTEM'], roles: ['ADMIN', 'MANAGER'],
  input: z.object({ jobId: z.guid() }),
  handler: async ({ input, actor, db }) => {
    const job = await repo.findJobForOffers(db, actor.organizationId, input.jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (job.current_status !== 'PUBLISHED') return { job, items: [], candidates: [] };
    return { job, items: await repo.listJobItems(db, input.jobId), candidates: await repo.listOfferCandidates(db, job.organization_id, input.jobId) };
  },
});
