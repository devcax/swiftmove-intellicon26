const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { lockJob, stateError, changed, tellDriverAfterCommit } = require('../load');
const changes = require('../changes');

const schema = z.object({ id: z.string().min(1).max(64), note: z.unknown().optional() });

module.exports = defineAction({
  name: 'job.requestCorrection',
  title: 'Ask the driver for a correction',
  description: 'During completion review, send the job back to the driver to fix something. The driver is told.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: schema,
  load: lockJob,
  handler: async ({ input, actor, tx }) => {
    const job = await changes.findJob(tx, actor.organizationId, input.id);
    if (!['DRIVER_SUBMITTED_COMPLETION', 'MANAGER_REVIEW'].includes(job.currentStatus)) throw stateError('Corrections can only be requested during completion review');
    const note = typeof input.note === 'string' ? input.note : null;
    await changes.setStatus(tx, job, 'REQUIRES_CORRECTION', actor.userId);
    await changes.audit(tx, { organizationId: job.organizationId, actorUserId: actor.userId, action: 'CORRECTION_REQUESTED', entityId: job.id, after: { note } });
    const assignment = await changes.findLiveAssignment(tx, job.id, ['ACTIVE']);
    const driver = assignment ? await changes.findDriverContact(tx, assignment.driverId) : null;
    return {
      result: { ok: true, status: 'REQUIRES_CORRECTION' }, events: [changed(job, 'correction_requested', 'REQUIRES_CORRECTION')], subject: { type: 'JOB', id: job.id },
      afterCommit: [tellDriverAfterCommit('sendCorrectionRequest', { job: changes.toBotJob(job, 'REQUIRES_CORRECTION'), driver, note })],
    };
  },
});
