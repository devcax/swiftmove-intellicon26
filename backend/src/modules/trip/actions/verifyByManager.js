const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const records = require('../../../platform/jobRecords');
const { stateError, lockJobById, tellAfterCommit } = require('../load');
const { executeTransition, milestoneEvent, rankOf } = require('../transition');
const { STAGES, stageColumns } = require('../documentStage');
const sm = require('../../../platform/jobStateMachine');
const repo = require('../repo');

const schema = z.object({ id: z.string().min(1).max(64), stage: z.unknown().optional() });

/** A manager marks a pickup or delivery document as verified by hand: the same document policies as the driver's path, one decision path. */
module.exports = defineAction({
  name: 'trip.verifyByManager',
  title: 'Verify a stage document as a manager',
  description: 'Mark the pickup or delivery document of a started job as verified without the driver\'s photo. The job advances to Loaded or Delivered.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  matchFields: ['stage'],
  // A manager verifying a document is held to the rules written for the driver's photo.
  policyName: 'trip.verifyDocument',
  input: schema,
  load: async ({ input, actor, tx }) => {
    const stage = String(input.stage ?? '').toUpperCase();
    if (!STAGES.includes(stage)) throw new ValidationError("stage must be 'PICKUP' or 'DELIVERY'.");
    await lockJobById({ tx, actor }, input.id);
    return { jobId: input.id, params: { stage }, policyActor: 'MANAGER', policySource: 'MANAGER', stage, subject: { type: 'JOB', id: input.id } };
  },
  handler: async ({ actor, tx, subject }) => {
    const { stage } = subject;
    const organizationId = actor.organizationId;
    let job = await records.findJob(tx, organizationId, subject.jobId);
    const assignment = await repo.findJobAssignment(tx, job.id, ['PENDING_DRIVER_ACCEPTANCE', 'ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW']);
    if (!assignment || assignment.status !== 'ACTIVE') throw stateError('The driver must start this job before its documents can be verified.');

    const cols = stageColumns(stage);
    const alreadyVerified = Boolean(job[cols.verified]);
    if (!alreadyVerified) {
      await repo.updateJobColumns(tx, job.id, { [cols.verified]: new Date(), [cols.actual]: job[cols.actual] ?? new Date() });
      job = await records.findJob(tx, organizationId, job.id);
      await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment.id, eventType: 'DOCUMENT_VERIFIED', data: { stage, method: 'MANAGER_MANUAL' } });
    }

    const by = { type: 'MANAGER', userId: actor.userId };
    const rank = await rankOf(tx, job);
    const result = alreadyVerified || rank >= sm.MILESTONE_RANK[cols.target]
      ? { applied: [], inferred: [], newStatus: job.currentStatus, kind: 'NOOP', noop: true }
      : await executeTransition(tx, { job, assignment, eventType: cols.target, source: 'MANAGER', verification: { stage, method: 'MANAGER_MANUAL' }, actor: by });
    await records.audit(tx, { organizationId, actor: by, action: `${stage}_DOCUMENT_VERIFIED`, entityId: job.id, after: { stage, status: result.newStatus, method: 'MANAGER_MANUAL' } });

    const fresh = await records.findJob(tx, organizationId, job.id);
    const driver = await records.findDriverContact(tx, assignment.driverId);
    const notify = !alreadyVerified && driver?.phone_e164;
    return {
      result: { ok: true, stage, verifiedAt: fresh[cols.verified], status: result.newStatus, alreadyVerified },
      events: [...(alreadyVerified ? [] : [{ type: 'document.verified', payload: { jobId: job.id, stage, method: 'MANAGER_MANUAL' } }]), ...milestoneEvent(job, result)],
      subject: { type: 'JOB', id: job.id },
      afterCommit: notify ? [tellAfterCommit('sendManagerVerification', { job: records.toBotJob(fresh), driver, stage })] : [],
    };
  },
});
