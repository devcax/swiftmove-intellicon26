const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { idSchema } = require('../schemas');
const { lockRequest, stateError, tellAfterCommit } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'request.approve',
  title: 'Approve a job request',
  description: 'Approve a driver\'s request. The driver is offered the job and can accept or decline it on WhatsApp.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  load: lockRequest,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const request = await repo.findRequest(tx, input.id);
    if (request.status !== 'REQUESTED') throw stateError(`Request is ${request.status}, cannot approve`);

    await repo.approveRequest(tx, request.id, actor.userId);

    // The offer awaits the driver's answer. A driver can hold only one accepted job, which the database enforces on acceptance.
    let assignment;
    try {
      assignment = await repo.createOffer(tx, { jobId: request.jobId, driverId: request.driverId, assignedByUserId: actor.userId });
    } catch (err) {
      if (err.code === 'P2002') throw stateError('Driver already has a live assignment', 'DRIVER_BUSY');
      throw err;
    }

    const job = await records.findJob(tx, organizationId, request.jobId);
    const by = { type: 'MANAGER', userId: actor.userId };
    await records.setStatus(tx, job, 'MANAGER_APPROVED', by);
    await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment.id, eventType: 'REQUEST_APPROVED', data: { driver_id: request.driverId } });
    await records.audit(tx, { organizationId, actor: by, action: 'JOB_REQUEST_APPROVED', entityId: job.id, after: { request_id: request.id, assignment_id: assignment.id } });

    const driver = await records.findDriverContact(tx, request.driverId);
    return {
      result: { ok: true, jobNumber: job.jobNumber, driver: driver.name },
      events: [{ type: 'request.approved', payload: { requestId: request.id, jobId: job.id, driverId: request.driverId } }],
      subject: { type: 'JOB', id: job.id },
      afterCommit: [tellAfterCommit('sendJobOffer', { job: records.toBotJob(job, 'MANAGER_APPROVED'), driver })],
    };
  },
});
