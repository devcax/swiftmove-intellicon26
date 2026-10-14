const { defineAction } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { lockRow } = require('../../../platform/db');
const records = require('../../../platform/jobRecords');
const { submitSchema } = require('../schemas');
const { lockActingDriver, stateError } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'request.submit',
  title: 'Request a job',
  description: 'A driver asks for an open job. The managers are told and decide in the request queue.',
  actors: ['DRIVER'],
  input: submitSchema,
  load: async ({ input, actor, tx }) => {
    const { driverId } = await lockActingDriver({ actor, tx });
    if (!(await lockRow(tx, 'jobs', input.jobId, actor.organizationId))) throw new NotFoundError('Job not found');
    return { driverId, jobId: input.jobId, subject: { type: 'JOB', id: input.jobId } };
  },
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const job = await records.findJob(tx, organizationId, input.jobId);
    const driver = await records.findDriverBrief(tx, organizationId, actor.driverId);

    const requestId = await repo.insertRequest(tx, job.id, driver.id);
    if (!requestId) throw stateError(`Driver already requested ${job.jobNumber}`, 'DUPLICATE_REQUEST');

    const by = { type: 'DRIVER', driverId: driver.id };
    if (job.currentStatus === 'PUBLISHED') await records.setStatus(tx, job, 'DRIVER_REQUESTED', by);
    await records.recordEvent(tx, { jobId: job.id, messageId: input.messageId, eventType: 'REQUEST_JOB', data: { driver: driver.name }, confidence: input.confidence });
    const notice = {
      type: 'JOB_REQUEST', title: `${driver.name} requested ${job.jobNumber}`,
      body: `${driver.name} asked for ${job.jobNumber} (${job.cargoDescription}) via WhatsApp. Approve or reject in the request queue.`, severity: 'INFO',
    };
    await records.audit(tx, { organizationId, actor: by, action: 'JOB_REQUEST_CREATED', entityId: job.id, after: { request_id: requestId } });

    return {
      result: { jobId: job.id },
      events: [{ type: 'request.submitted', payload: { requestId, jobId: job.id, driverId: driver.id, notice } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
