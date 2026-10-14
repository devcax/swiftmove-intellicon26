const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const records = require('../../../platform/jobRecords');
const { driverStepSchema } = require('../schemas');
const { lockActingDriver, stateError } = require('../load');
const repo = require('../repo');

const TAKEABLE = ['MANAGER_APPROVED', 'ASSIGNMENT_SENT', 'PUBLISHED', 'DRIVER_REQUESTED'];

module.exports = defineAction({
  name: 'offer.accept',
  title: 'Accept a job offer',
  description: 'A driver accepts the offered job. The first acceptance wins; every other offer for the job closes.',
  actors: ['DRIVER'],
  input: driverStepSchema,
  load: async ({ actor, tx }) => {
    await lockActingDriver({ actor, tx });
    const assignment = await records.findDriverLiveAssignment(tx, actor.organizationId, actor.driverId);
    if (!assignment || assignment.status !== 'PENDING_DRIVER_ACCEPTANCE') throw stateError('No approved job offer is waiting for you', 'NO_OFFER');
    await lockRow(tx, 'jobs', assignment.jobId, actor.organizationId);
    return { driverId: actor.driverId, jobId: assignment.jobId, offer: assignment, subject: { type: 'JOB', id: assignment.jobId } };
  },
  handler: async ({ input, actor, tx, subject }) => {
    const organizationId = actor.organizationId;
    const assignment = subject.offer;
    const job = await records.findJob(tx, organizationId, assignment.jobId);
    // A published job can be offered to several matched drivers at once: re-check under the job lock that it is still free.
    if (!TAKEABLE.includes(job.currentStatus)) throw stateError(`${job.jobNumber} has just been taken by another driver`, 'JOB_TAKEN');

    await repo.acceptOffer(tx, assignment.id);
    await repo.closeOtherOffers(tx, job.id, assignment.id);
    const by = { type: 'DRIVER', driverId: actor.driverId };
    await records.setStatus(tx, job, 'ASSIGNED', by);
    await records.setActiveJob(tx, actor.driverId, job.id);
    await records.attachOpenConversations(tx, actor.driverId, job.id);
    await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment.id, messageId: input.messageId, eventType: 'ACCEPT_JOB', confidence: input.confidence });
    await records.audit(tx, { organizationId, actor: by, action: 'JOB_ACCEPTED', entityId: job.id });

    return {
      result: { jobId: job.id, assignmentId: assignment.id },
      events: [{ type: 'offer.accepted', payload: { jobId: job.id, driverId: actor.driverId, assignmentId: assignment.id } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
