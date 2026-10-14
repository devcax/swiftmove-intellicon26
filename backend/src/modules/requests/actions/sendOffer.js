const { defineAction } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const { lockRow } = require('../../../platform/db');
const records = require('../../../platform/jobRecords');
const { sendOfferSchema } = require('../schemas');
const { stateError } = require('../load');
const repo = require('../repo');

/**
 * The system offers a job to a driver. The job stays published: every matched driver can hold the same offer and the first
 * acceptance wins. A driver holds one pending offer at a time (an older one is superseded), and offering twice changes nothing.
 */
module.exports = defineAction({
  name: 'offer.send',
  title: 'Offer a job to a driver',
  description: 'Offer a published job to a driver. The first driver to accept gets it; the others\' offers close.',
  actors: ['SYSTEM'],
  input: sendOfferSchema,
  load: async ({ input, actor, tx }) => {
    if (!(await lockRow(tx, 'jobs', input.jobId, actor.organizationId))) throw new NotFoundError('Job not found');
    return { jobId: input.jobId, driverId: input.driverId, subject: { type: 'JOB', id: input.jobId } };
  },
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const job = await records.findJob(tx, organizationId, input.jobId);
    if (!['PUBLISHED', 'DRIVER_REQUESTED'].includes(job.currentStatus)) throw stateError(`${job.jobNumber} is no longer open for offers`, 'JOB_NOT_OPEN');
    const driver = await records.findDriverBrief(tx, organizationId, input.driverId);
    if (!driver) throw new NotFoundError('Driver not found');

    const existing = await repo.findPendingOffer(tx, job.id, driver.id);
    if (existing) {
      return { result: { jobId: job.id, assignmentId: existing.id, alreadyOffered: true }, events: [], subject: { type: 'JOB', id: job.id } };
    }

    await repo.supersedePendingOffers(tx, driver.id);
    // The offer is made on the system's behalf; the assignment still records a user, the organization's oldest manager.
    const assignment = await repo.createOffer(tx, { jobId: job.id, driverId: driver.id, assignedByUserId: await records.oldestUserId(tx, organizationId) });

    const data = { driver_id: driver.id, driver: driver.name, match_fit: input.matchFit ?? null, match_reason: input.matchReason ?? null };
    await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment.id, eventType: 'JOB_OFFERED', data });
    await records.audit(tx, {
      organizationId, actor: { type: 'SYSTEM' }, action: 'JOB_OFFERED', entityId: job.id,
      after: { driver_id: driver.id, match_fit: data.match_fit, match_reason: data.match_reason },
    });
    return {
      result: { jobId: job.id, assignmentId: assignment.id, alreadyOffered: false },
      events: [{ type: 'offer.sent', payload: { jobId: job.id, driverId: driver.id, assignmentId: assignment.id } }],
      subject: { type: 'JOB', id: job.id },
    };
  },
});
