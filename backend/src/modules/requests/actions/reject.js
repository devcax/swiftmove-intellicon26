const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { rejectSchema } = require('../schemas');
const { lockRequest, stateError, tellAfterCommit } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'request.reject',
  title: 'Reject a job request',
  description: 'Reject a driver\'s request, with an optional reason. The job goes back to the open pool when nobody else asked.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: rejectSchema,
  load: lockRequest,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const request = await repo.findRequest(tx, input.id);
    if (request.status !== 'REQUESTED') throw stateError(`Request is ${request.status}, cannot reject`);
    const reason = typeof input.reason === 'string' ? input.reason : null;

    await repo.rejectRequest(tx, request.id, actor.userId, reason);

    const job = await records.findJob(tx, organizationId, request.jobId);
    const by = { type: 'MANAGER', userId: actor.userId };
    const others = await records.hasPendingRequests(tx, job.id);
    if (!others && job.currentStatus === 'DRIVER_REQUESTED') await records.setStatus(tx, job, 'PUBLISHED', by);
    await records.audit(tx, { organizationId, actor: by, action: 'JOB_REQUEST_REJECTED', entityId: job.id });

    const driver = await records.findDriverContact(tx, request.driverId);
    return {
      result: { ok: true, jobNumber: job.jobNumber, driver: driver.name },
      events: [{ type: 'request.rejected', payload: { requestId: request.id, jobId: job.id, driverId: request.driverId } }],
      subject: { type: 'JOB', id: job.id },
      afterCommit: [tellAfterCommit('sendRequestRejected', { job: records.toBotJob(job), driver })],
    };
  },
});
