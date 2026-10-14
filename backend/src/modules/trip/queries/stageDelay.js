const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const records = require('../../../platform/jobRecords');
const { stageDelay } = require('../delay');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'trip.stageDelay',
  description: 'Whether the pickup or the delivery of a job was late and whether the driver has said why, with the driver on the job so they can be asked.',
  actors: ['SYSTEM'], roles: ['ADMIN', 'MANAGER'],
  input: z.object({ jobId: z.guid(), stage: z.enum(['PICKUP', 'DELIVERY']) }),
  handler: async ({ input, actor, db }) => {
    const job = await records.findJob(db, actor.organizationId, input.jobId);
    if (!job) throw new NotFoundError('Job not found');
    const assignment = await repo.findJobAssignment(db, job.id, ['ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW']);
    const driver = assignment ? await records.findDriverContact(db, assignment.driverId) : null;
    return { ...stageDelay(job, input.stage), stage: input.stage, job: records.toBotJob(job), driver };
  },
});
