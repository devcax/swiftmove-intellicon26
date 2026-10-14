/**
 * The single executor for every trip-milestone move. Inside the caller's transaction it asks the state machine what the move means,
 * writes the inferred intermediate states (marked system-inferred), writes the target, and updates the job's status, all together.
 *
 * The AI never reaches this with authority: it supplies the milestone name, and whether that is legal is decided here. The guards
 * (document gates, protected milestones, frozen jobs, start confirmation) are published policies, checked by the runner before the
 * handler runs, so the state machine only does the mechanics (rank arithmetic, inferred states, no-op detection).
 */
const { currentMilestoneRank } = require('../../platform/policy/context');
const records = require('../../platform/jobRecords');
const { ConflictError } = require('../../platform/errors');
const sm = require('../../platform/jobStateMachine');
const repo = require('./repo');

const INERT_GUARDS = { documentGates: {}, protectedMilestones: [], frozenStatuses: [], requireStartConfirmation: false };

/** The furthest milestone the job has reached (the state machine reads the old snake_case row). */
const rankOf = (tx, job) => currentMilestoneRank(tx, { id: job.id, current_status: job.currentStatus });

async function executeTransition(tx, { job, assignment = null, eventType, data = {}, source = 'CHAT', actor, messageId = null, confidence = null, verification = null }) {
  const currentRank = await rankOf(tx, job);
  const plan = sm.planTransition({ currentStatus: job.currentStatus, currentRank: Math.max(currentRank, 0), target: eventType, source }, INERT_GUARDS);

  if (plan.kind === 'NOOP') return { applied: [], inferred: [], newStatus: job.currentStatus, kind: 'NOOP', noop: true };
  if (!plan.allowed) throw new ConflictError(plan.reason, { code: plan.code ?? 'INVALID_TRANSITION' });

  const applied = [];
  for (const inferredState of plan.inferred) {
    await records.recordEvent(tx, {
      jobId: job.id, assignmentId: assignment?.id ?? null, messageId, eventType: inferredState, confidence,
      data: { inferred: true, inferred_by: 'SYSTEM', reason: `implied by ${eventType}` },
    });
    applied.push(inferredState);
  }

  const withException = eventType === 'DELIVERED' && (data.refused_quantity || data.damaged_quantity || data.shortage_quantity);
  const newStatus = withException ? 'DELIVERED_WITH_EXCEPTION' : eventType;

  const eventData = { ...data };
  if (plan.kind === 'BACKWARD') eventData.correction = true;
  if (verification) eventData.verification = verification;

  await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment?.id ?? null, messageId, eventType, data: eventData, confidence });
  applied.push(eventType);

  await records.setStatus(tx, job, newStatus, actor);
  if (applied.includes('ARRIVED_AT_PICKUP')) {
    await repo.notePickupActual(tx, job.id);
  }
  return { applied, inferred: plan.inferred, newStatus, kind: plan.kind, noop: false };
}

/** The event the plugins hear when a move changed something. */
const milestoneEvent = (job, result) => (result.noop
  ? []
  : [{ type: 'trip.milestoneReached', payload: { jobId: job.id, milestone: result.applied[result.applied.length - 1], newStatus: result.newStatus } }]);

module.exports = { executeTransition, milestoneEvent, rankOf, INERT_GUARDS };
