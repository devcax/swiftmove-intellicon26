const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const records = require('../../../platform/jobRecords');
const { matchesExpectedCode } = require('../documentCodes');
const sm = require('../../../platform/jobStateMachine');
const { stateError, lockActingDriver, lockJobById, findDriverAssignment } = require('../load');
const { executeTransition, milestoneEvent } = require('../transition');
const { stageDelay } = require('../delay');
const { STAGES, stageColumns, delayReasonStages } = require('../documentStage');
const repo = require('../repo');

const schema = z.object({
  jobId: z.guid(), stage: z.string(), extraction: z.record(z.string(), z.unknown()), attachmentId: z.guid().nullish(), messageId: z.guid().nullish(), imageUrl: z.string().max(2000).nullish(),
});

/**
 * A driver's photo of a pickup or delivery paper: its code is matched against the job's security code. A match verifies the stage and,
 * when the trip is started and nothing is outstanding, moves the job to Loaded or Delivered in the same transaction; a mismatch is
 * recorded and the managers are alerted. Verifying and advancing are one action, never split across an event.
 */
module.exports = defineAction({
  name: 'trip.verifyDocument',
  title: 'Verify a stage document',
  description: 'A driver\'s photo of the pickup or delivery paper is checked against the job\'s security code. A match verifies the stage and can advance the job.',
  actors: ['DRIVER'],
  matchFields: ['stage'],
  input: schema,
  load: async ({ input, actor, tx }) => {
    await lockActingDriver({ actor, tx });
    await lockJobById({ tx, actor }, input.jobId);
    if (!STAGES.includes(input.stage)) throw stateError('Document stage must be pickup or delivery', 'BAD_DOCUMENT_STAGE');
    return { driverId: actor.driverId, jobId: input.jobId, params: { stage: input.stage }, policySource: 'DOCUMENT', subject: { type: 'JOB', id: input.jobId } };
  },
  handler: async ({ input, actor, tx, enforce }) => {
    const { stage, extraction, attachmentId, messageId, imageUrl } = input;
    const organizationId = actor.organizationId;
    let job = await records.findJob(tx, organizationId, input.jobId);
    const driverName = await records.findDriverName(tx, actor.driverId);
    const cols = stageColumns(stage);
    const base = { jobId: job.id };

    const { matched, reason } = matchesExpectedCode({ extraction, expectedCode: job[cols.code], jobNumber: job.jobNumber });
    if (!matched) {
      await records.recordEvent(tx, {
        jobId: job.id, messageId, eventType: 'DOCUMENT_VERIFIED', status: 'REJECTED',
        data: { stage, method: 'VISION', attachment_id: attachmentId ?? null, detected_job_number: extraction.jobNumber ?? null, reason },
      });
      const notice = {
        type: 'SECURITY_ALERT', title: `Unverified ${stage.toLowerCase()} paper on ${job.jobNumber}`,
        body: `${driverName} sent a photo whose code did NOT match the ${stage.toLowerCase()} security code (${reason}).${imageUrl ? ` Photo: ${imageUrl}` : ''}`, severity: 'WARNING',
      };
      return {
        result: { ...base, verified: false, reason, applied: [], inferred: [], newStatus: job.currentStatus, alreadyVerified: false },
        events: [{ type: 'document.rejected', payload: { jobId: job.id, stage, reason, notice } }], subject: { type: 'JOB', id: job.id },
      };
    }

    const alreadyVerified = Boolean(job[cols.verified]);
    if (!alreadyVerified) {
      await repo.updateJobColumns(tx, job.id, { [cols.verified]: new Date(), [cols.proof]: attachmentId ?? job[cols.proof] });
      await records.recordEvent(tx, { jobId: job.id, messageId, eventType: 'DOCUMENT_VERIFIED', data: { stage, method: 'CODE_MATCH', attachment_id: attachmentId ?? null } });
    }
    if (!job[cols.actual]) await repo.updateJobColumns(tx, job.id, { [cols.actual]: new Date() });
    job = await records.findJob(tx, organizationId, job.id);

    const assignment = await findDriverAssignment(tx, actor);
    let result = { applied: [], inferred: [], newStatus: job.currentStatus, noop: true };
    let needsStartConfirmation = false;
    let needsDelayReason = null;
    if (assignment && assignment.jobId === job.id) {
      if (assignment.status !== 'ACTIVE') {
        needsStartConfirmation = true;
      } else {
        const delay = stageDelay(job, stage);
        if ((await delayReasonStages(organizationId)).includes(stage) && delay.late && !delay.reasonRecorded) {
          needsDelayReason = { stage, ...delay };
        } else {
          // The advance is its own action's rules, asked for in this same transaction.
          await enforce('trip.milestone', { actorType: 'SYSTEM', source: 'DOCUMENT', jobId: job.id, driverId: actor.driverId, params: { milestone: cols.target } });
          result = await executeTransition(tx, {
            job, assignment, eventType: cols.target, source: 'DOCUMENT', messageId, confidence: 1,
            verification: { stage, method: 'CODE_MATCH', attachment_id: attachmentId ?? null }, actor: { type: 'SYSTEM' },
          });
        }
      }
    }

    let notice;
    if (!alreadyVerified) {
      const advanced = result.applied.length > 0 && !result.noop;
      const held = needsStartConfirmation
        ? ' The job has not been confirmed as started yet, so the advance is waiting on the driver.'
        : needsDelayReason ? ` The ${stage.toLowerCase()} was late, so the advance is waiting on the driver's delay reason.` : '';
      notice = {
        type: 'DOCUMENT_VERIFIED', title: `${stage} document verified on ${job.jobNumber}`,
        body: `${driverName} sent a ${stage.toLowerCase()} paper that matched the security code.${advanced ? ` The job advanced to ${sm.label(result.newStatus)} automatically.` : held}${imageUrl ? ` Photo: ${imageUrl}` : ''}`,
        severity: 'INFO',
      };
    }

    const events = [
      ...(alreadyVerified ? [] : [{ type: 'document.verified', payload: { jobId: job.id, stage, method: 'CODE_MATCH', notice } }]),
      ...milestoneEvent(job, result),
    ];
    return {
      result: { ...base, verified: true, reason: null, alreadyVerified, needsStartConfirmation, needsDelayReason, ...result }, events, subject: { type: 'JOB', id: job.id },
    };
  },
});
