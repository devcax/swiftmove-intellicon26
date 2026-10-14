const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'summary.state',
  description: 'Where the rolling summary of a driver\'s current job stands: the job, the summary so far, and the messages since it was written. Nothing when the driver has no live job.',
  actors: ['SYSTEM'], roles: ['ADMIN', 'MANAGER'],
  input: z.object({ driverId: z.guid(), conversationId: z.guid() }),
  handler: async ({ input, actor, db }) => {
    const assignment = await repo.findLiveAssignment(db, actor.organizationId, input.driverId);
    if (!assignment || ['COMPLETED', 'CANCELLED'].includes(assignment.current_status)) return null;

    const row = await repo.findSummary(db, assignment.job_id);
    const since = row?.updated_at ?? new Date(0);
    const lastMessageId = await repo.findLastMessageId(db, input.conversationId);
    if (!lastMessageId) return null;
    return {
      jobId: assignment.job_id, summaryText: row?.summary_text ?? '', updatedAt: row?.updated_at ?? null, hasRow: Boolean(row),
      lastMessageId, newCount: await repo.countMessagesSince(db, input.conversationId, since),
      eventApplied: await repo.messageChangedSomething(db, lastMessageId), messages: await repo.listMessagesSince(db, input.conversationId, since),
    };
  },
});
