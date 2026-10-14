const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { stateError, lockJobById } = require('../load');
const repo = require('../repo');

const schema = z.object({ id: z.string().min(1).max(64), reason: z.unknown().optional() });

module.exports = defineAction({
  name: 'trip.releaseDriver',
  title: 'Release the driver from a job',
  description: 'Take the driver off the job. The job is published again (or stays requested while another driver asked). The driver is told and the job is offered to others.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    await lockJobById({ tx, actor }, input.id);
    return { jobId: input.id, subject: { type: 'JOB', id: input.id } };
  },
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const job = await records.findJob(tx, organizationId, input.id);
    const assignment = await records.findLiveAssignment(tx, job.id);
    if (!assignment) throw stateError('Job has no live driver assignment');
    const reason = typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim().slice(0, 500) : null;

    await repo.cancelAssignment(tx, assignment.id, reason ?? 'Released by manager');
    await records.clearActiveJob(tx, assignment.driverId);
    const others = await records.hasPendingRequests(tx, job.id);
    const by = { type: 'MANAGER', userId: actor.userId };
    const status = others ? 'DRIVER_REQUESTED' : 'PUBLISHED';
    await records.setStatus(tx, job, status, by);
    await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment.id, eventType: 'DRIVER_RELEASED', data: { reason: reason ?? 'Released by manager', driverId: assignment.driverId } });
    await records.audit(tx, { organizationId, actor: by, action: 'DRIVER_RELEASED', entityId: job.id });

    const driver = await records.findDriverContact(tx, assignment.driverId);
    const { notifyAfterCommit } = require('../after');
    const body = driver?.phone_e164
      ? `You've been released from *${job.jobNumber}* by the manager${reason ? ` (${reason})` : ''}. You're available for other jobs again — say "jobs" and I'll show you what's open.`
      : null;
    return {
      result: { ok: true, status },
      events: [
        { type: 'trip.driverReleased', payload: { jobId: job.id, driverId: assignment.driverId } },
        ...(status === 'PUBLISHED' ? [{ type: 'job.published', payload: { jobId: job.id, jobNumber: job.jobNumber } }] : []),
      ],
      subject: { type: 'JOB', id: job.id },
      afterCommit: body ? [notifyAfterCommit({ job: records.toBotJob(job, status), driver, body })] : [],
    };
  },
});
