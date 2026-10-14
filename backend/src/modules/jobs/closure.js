/**
 * Asking for a job to be closed, from the three places it happens. The driver says "I'm done" on WhatsApp, the timer does it for
 * a delivered job nobody closed, and a manager can send a delivered job to review. Each path has its own entry rules and its own
 * resulting status, so each is its own function; the action picks by who is acting.
 */
const { lockRow } = require('../../platform/db');
const records = require('../../platform/jobRecords');
const { ID_SHAPE } = require('../../platform/http/ownership');
const { NotFoundError } = require('../../platform/errors');
const { currentMilestoneRank } = require('../../platform/policy/context');
const { stateError, changed, tellDriverAfterCommit } = require('./load');
const changes = require('./changes');
const repo = require('./repo');
const sm = require('../../platform/jobStateMachine');

const ALREADY = ['DRIVER_SUBMITTED_COMPLETION', 'MANAGER_REVIEW', 'COMPLETED'];
const closure = (job, source, status, notice) => ({ type: 'closure.requested', payload: { jobId: job.id, source, status, notice } });

/** Driver: needs a started job that has reached delivery. A repeat is reported, not redone, and asks no policy. */
async function loadForDriver({ actor, tx }) {
  if (!actor.driverId || !(await lockRow(tx, 'drivers', actor.driverId, actor.organizationId))) throw new NotFoundError('Driver not found');
  const assignment = await records.findDriverLiveAssignment(tx, actor.organizationId, actor.driverId);
  if (!assignment || assignment.status !== 'ACTIVE') throw stateError('You can only finish a job that has been started');
  await lockRow(tx, 'jobs', assignment.jobId, actor.organizationId);
  const job = await records.findJob(tx, actor.organizationId, assignment.jobId);
  const subject = { driverId: actor.driverId, jobId: job.id, assignment, subject: { type: 'JOB', id: job.id } };
  if (ALREADY.includes(job.currentStatus)) return { ...subject, skipPolicies: true, already: true };

  const rank = await currentMilestoneRank(tx, { id: job.id, current_status: job.currentStatus });
  if (rank < sm.MILESTONE_RANK.IN_PROGRESS) throw stateError('This job has not started yet');
  if (rank < sm.MILESTONE_RANK.DELIVERED) {
    throw stateError('The delivery is not confirmed yet. Send a photo of the delivery document so the delivery code can be verified, then I can send this job for closure.', 'NOT_DELIVERED');
  }
  return subject;
}

async function runForDriver({ input, actor, tx, subject }) {
  const job = await records.findJob(tx, actor.organizationId, subject.jobId);
  const { assignment } = subject;
  const base = { jobId: job.id, assignmentId: assignment.id };
  if (subject.already) return { result: { ...base, alreadyRequested: true }, events: [], subject: subject.subject };

  await repo.noteCompletionSubmitted(tx, assignment.id);
  await records.setStatus(tx, job, 'DRIVER_SUBMITTED_COMPLETION', { type: 'DRIVER', driverId: actor.driverId });
  await records.recordEvent(tx, { jobId: job.id, assignmentId: assignment.id, messageId: input.messageId, eventType: 'END_JOB', data: { source: 'DRIVER' }, confidence: input.confidence });
  const driverName = await records.findDriverName(tx, actor.driverId);
  const notice = {
    type: 'COMPLETION_REVIEW', title: `${job.jobNumber} ready for review`,
    body: `${driverName} submitted trip completion. Review the timeline and mark as done.`, severity: 'INFO',
  };
  return { result: { ...base, alreadyRequested: false }, events: [closure(job, 'DRIVER', 'DRIVER_SUBMITTED_COMPLETION', notice)], subject: subject.subject };
}

/** Timer: a delivered job with a driver still on it. Anything else is "already handled" and asks no policy. */
async function loadForSystem({ input, actor, tx }) {
  if (!ID_SHAPE.test(String(input.id)) || !(await lockRow(tx, 'jobs', input.id, actor.organizationId))) throw new NotFoundError('Job not found');
  const job = await records.findJob(tx, actor.organizationId, input.id);
  const assignment = await records.findLiveAssignment(tx, job.id, ['ACTIVE']);
  const subject = { jobId: job.id, assignment, subject: { type: 'JOB', id: job.id } };
  const open = ['DELIVERED', 'DELIVERED_WITH_EXCEPTION'].includes(job.currentStatus) && assignment;
  return open ? subject : { ...subject, skipPolicies: true, already: true };
}

async function runForSystem({ actor, tx, subject }) {
  const job = await records.findJob(tx, actor.organizationId, subject.jobId);
  if (subject.already) return { result: { jobId: job.id, driver: null, alreadyRequested: true }, events: [], subject: subject.subject };
  const { assignment } = subject;
  await repo.noteCompletionSubmitted(tx, assignment.id);
  await records.setStatus(tx, job, 'DRIVER_SUBMITTED_COMPLETION', { type: 'SYSTEM' });
  await records.recordEvent(tx, {
    jobId: job.id, assignmentId: assignment.id, eventType: 'END_JOB', data: { source: 'AUTO', reason: 'Delivered with no driver closure request inside the auto-closure window' },
  });
  const notice = {
    type: 'COMPLETION_REVIEW', title: `${job.jobNumber} sent for closure automatically`,
    body: 'The delivery was confirmed and the driver did not request closure, so the job was sent for closure approval automatically.', severity: 'INFO',
  };
  await records.audit(tx, { organizationId: actor.organizationId, actor: { type: 'SYSTEM' }, action: 'CLOSURE_REQUESTED', entityId: job.id, after: { source: 'AUTO' } });
  const driver = await records.findDriverContact(tx, assignment.driverId);
  return {
    result: { jobId: job.id, jobNumber: job.jobNumber, job: records.toBotJob(job, 'DRIVER_SUBMITTED_COMPLETION'), assignmentId: assignment.id, driver, alreadyRequested: false },
    events: [closure(job, 'SYSTEM', 'DRIVER_SUBMITTED_COMPLETION', notice)], subject: subject.subject,
  };
}

/** Manager: sends a delivered job straight to review. */
async function runForManager({ input, actor, tx }) {
  const job = await changes.findJob(tx, actor.organizationId, input.id);
  if (!['DELIVERED', 'DELIVERED_WITH_EXCEPTION'].includes(job.currentStatus)) {
    throw stateError(`Job is ${job.currentStatus} — only delivered trips can be submitted for closure`);
  }
  const assignment = await changes.findLiveAssignment(tx, job.id, ['ACTIVE']);
  if (assignment) await repo.setCompletionSubmitted(tx, assignment.id);

  await changes.setStatus(tx, job, 'MANAGER_REVIEW', actor.userId);
  await changes.recordEvent(tx, { jobId: job.id, assignmentId: assignment?.id ?? null, eventType: 'COMPLETION_SUBMITTED' });
  await changes.audit(tx, { organizationId: job.organizationId, actorUserId: actor.userId, action: 'COMPLETION_SUBMITTED', entityId: job.id });

  const driver = assignment ? await changes.findDriverContact(tx, assignment.driverId) : null;
  return {
    result: { ok: true, status: 'MANAGER_REVIEW' }, events: [closure(job, 'MANAGER', 'MANAGER_REVIEW')], subject: { type: 'JOB', id: job.id },
    afterCommit: [tellDriverAfterCommit('sendCompletionSubmitted', { job: changes.toBotJob(job, 'MANAGER_REVIEW'), driver })],
  };
}

module.exports = { loadForDriver, runForDriver, loadForSystem, runForSystem, runForManager, changed };
