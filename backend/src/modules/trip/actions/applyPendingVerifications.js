const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const sm = require('../../../platform/jobStateMachine');
const { lockJobById, lockActingDriver } = require('../load');
const { executeTransition, milestoneEvent, rankOf } = require('../transition');
const { stageDelay } = require('../delay');
const { STAGES, stageColumns, delayReasonStages } = require('../documentStage');
const repo = require('../repo');

const schema = z.object({ jobId: z.guid(), messageId: z.guid().nullish() });

/**
 * After a driver confirms the start or gives a delay reason, move the job forward for any stage whose document was already verified
 * (Loaded after the pickup, Delivered after the delivery), stopping at the first thing still outstanding.
 */
module.exports = defineAction({
  name: 'trip.applyPendingVerifications',
  title: 'Advance the job for verified documents',
  description: 'Move a job to Loaded or Delivered when its pickup or delivery document was verified earlier but the move was waiting on the start or a delay reason.',
  actors: ['DRIVER', 'SYSTEM'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    if (actor.type === 'DRIVER') await lockActingDriver({ actor, tx });
    await lockJobById({ tx, actor }, input.jobId);
    return { jobId: input.jobId, subject: { type: 'JOB', id: input.jobId } };
  },
  handler: async ({ input, actor, tx, enforce }) => {
    const organizationId = actor.organizationId;
    const job = await records.findJob(tx, organizationId, input.jobId);
    const assignment = await repo.findJobAssignment(tx, job.id, ['ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW']);
    const stages = await delayReasonStages(organizationId);

    const advances = [];
    const events = [];
    let needsStartConfirmation = false;
    let needsDelayReason = null;
    for (const stage of STAGES) {
      const cols = stageColumns(stage);
      if (!job[cols.verified]) continue;
      if ((await rankOf(tx, job)) >= sm.MILESTONE_RANK[cols.target]) continue;
      if (!assignment || assignment.status !== 'ACTIVE') { needsStartConfirmation = true; break; }
      const delay = stageDelay(job, stage);
      if (stages.includes(stage) && delay.late && !delay.reasonRecorded) { needsDelayReason = { stage, ...delay }; break; }

      const method = await repo.findVerificationMethod(tx, job.id, stage);
      await enforce('trip.milestone', { actorType: 'SYSTEM', source: 'DOCUMENT', jobId: job.id, driverId: assignment.driverId, params: { milestone: cols.target } });
      const result = await executeTransition(tx, {
        job, assignment, eventType: cols.target, source: 'DOCUMENT', messageId: input.messageId, confidence: 1,
        verification: { stage, method: method ?? 'CODE_MATCH' }, actor: { type: 'SYSTEM' },
      });
      advances.push({ stage, ...result });
      events.push(...milestoneEvent(job, result));
      job.currentStatus = result.newStatus;
      if (result.noop) break;
    }
    return {
      result: { jobId: job.id, assignmentId: assignment?.id ?? null, advances, needsStartConfirmation, needsDelayReason }, events, subject: { type: 'JOB', id: job.id },
    };
  },
});
