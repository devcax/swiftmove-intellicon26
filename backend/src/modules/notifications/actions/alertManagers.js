const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const records = require('../../../platform/jobRecords');
const repo = require('../repo');

const schema = z.object({
  type: z.string().min(2).max(50), title: z.string().min(1).max(180), body: z.string().min(1).max(4000),
  severity: z.enum(['INFO', 'WARNING', 'HIGH', 'CRITICAL']).default('INFO'), jobId: z.guid().nullish(), incidentId: z.guid().nullish(),
  // The event this notice is for. A second delivery of the same event raises nothing new.
  eventId: z.guid().nullish(),
});

module.exports = defineAction({
  name: 'notification.alertManagers',
  title: 'Alert the managers',
  description: 'Put a notice on every active manager\'s and admin\'s dashboard (a suspicious message, a safety check finished, offers sent to drivers).',
  actors: ['DRIVER', 'SYSTEM'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    if (input.jobId && !(await records.findJob(tx, actor.organizationId, input.jobId))) throw new NotFoundError('Job not found');
    return input.jobId ? { jobId: input.jobId, subject: { type: 'JOB', id: input.jobId } } : {};
  },
  handler: async ({ input, actor, tx }) => {
    if (input.eventId) {
      const since = await repo.findEventTime(tx, actor.organizationId, input.eventId);
      if (since && await repo.noticeRaisedSince(tx, { ...input, organizationId: actor.organizationId }, since)) return { result: { ok: true, duplicate: true }, events: [] };
    }
    await records.notifyManagers(tx, {
      organizationId: actor.organizationId, jobId: input.jobId ?? null, incidentId: input.incidentId ?? null, type: input.type, title: input.title, body: input.body, severity: input.severity,
    });
    return { result: { ok: true }, events: [] };
  },
});
