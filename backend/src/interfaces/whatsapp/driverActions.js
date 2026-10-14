/**
 * What the WhatsApp conversation calls to change or read a job. Each function runs one module action (or query) through the runner
 * as the driver and answers in the shape the conversation code reads (job and assignment rows, errors with the codes it switches on).
 */
const runner = require('../../platform/runner');
const records = require('../../platform/jobRecords');
const { AppError, PolicyBlockedError } = require('../../platform/errors');
const { PolicyViolationError } = require('../../platform/policy/violation');
const { WorkflowError } = require('./workflowError');

const driverActor = (driver) => ({ type: 'DRIVER', driverId: driver.id, organizationId: driver.organization_id, source: 'WHATSAPP' });
const systemActor = (organizationId) => ({ type: 'SYSTEM', organizationId, source: 'TIMER' });

/** A block becomes the policy violation the bot turns into a conversation; a refused step becomes a WorkflowError with its code. */
function translate(err) {
  if (err instanceof PolicyBlockedError && err.failure) return new PolicyViolationError(err.failure, err.failures);
  if (err instanceof AppError && [404, 409].includes(err.status)) return new WorkflowError(err.message, err.code);
  return err;
}

async function run(name, input, actor) {
  try {
    return (await runner.run(name, input, actor)).result;
  } catch (err) {
    throw translate(err);
  }
}

/** The rows as the old code returned them: database rows with snake_case columns, as they are after the change. */
const jobRow = records.jobRowById;
const assignmentRow = records.assignmentRowById;

/** Run a driver's action and answer { job, assignment, result }. */
async function step(name, input, driver) {
  const result = await run(name, input, driverActor(driver));
  return { job: await jobRow(result.jobId), assignment: result.assignmentId ? await assignmentRow(result.assignmentId) : undefined, result };
}

// Reads. A driver asks about their own trip; the bot also asks by id, which the system may do.
const idOf = (driver) => (typeof driver === 'string' ? driver : driver.id);
const read = (name, input, organizationId = null) => runner.runQuery(name, input, systemActor(organizationId));

module.exports = {
  // Changes
  requestJob: (driver, job, messageId, confidence) => step('request.submit', { jobId: job.id, messageId, confidence }, driver),
  cancelJobRequest: (driver, messageId, confidence) => step('request.withdraw', { messageId, confidence }, driver),
  acceptJob: (driver, messageId, confidence) => step('offer.accept', { messageId, confidence }, driver),
  declineJob: (driver, messageId, confidence) => step('offer.decline', { messageId, confidence }, driver),
  startJob: (driver, messageId, confidence) => step('trip.start', { messageId, confidence }, driver)
    .then(({ job, assignment, result }) => ({ job, assignment, ...(result.alreadyStarted ? { alreadyStarted: true } : {}) })),
  applyMilestone: (driver, eventType, data, messageId, confidence, { source = 'CHAT' } = {}) => step('trip.milestone', { eventType, data, messageId, confidence, source }, driver)
    .then(({ job, assignment, result }) => ({ job, assignment, ...result })),
  attachDocuments: (driver, input) => step('trip.attachDocument', input, driver),
  reportProofPending: (driver, milestone, messageId, confidence) => run('trip.reportProofPending', { milestone, messageId, confidence }, driverActor(driver)),
  verifyDocument: (driver, input) => step('trip.verifyDocument', input, driver).then(({ job, result }) => ({ ...result, job })),
  recordDocumentIssue: (driver, input) => run('trip.recordDocumentIssue', input, driverActor(driver)),
  recordStageDelay: (driver, stage, reason, messageId) => step('trip.recordDelayReason', { stage, reason, messageId }, driver).then(({ job, result }) => ({ ...result, job })),
  reportDelay: (driver, data, messageId, confidence) => step('trip.reportDelay', { data, messageId, confidence }, driver),
  requestCancellation: (driver, reason, messageId, confidence) => step('trip.requestCancellation', { reason, messageId, confidence }, driver),
  endJob: (driver, messageId, confidence) => step('job.requestClosure', { messageId, confidence }, driver).then(({ job, assignment, result }) => ({ job, assignment, ...(result.alreadyRequested ? { alreadyRequested: true } : {}) })),
  async applyPendingVerifications(driver, messageId = null) {
    const assignment = await read('trip.assignment', { driverId: driver.id });
    if (!assignment) return null;
    const result = await run('trip.applyPendingVerifications', { jobId: assignment.job_id, messageId }, driverActor(driver));
    return { job: await jobRow(result.jobId), assignment: result.assignmentId ? await assignmentRow(result.assignmentId) : null, ...result };
  },
  async requestClosureAuto(jobId) {
    const job = await jobRow(jobId);
    if (!job) throw new WorkflowError('Job not found', 'NOT_FOUND');
    const result = await run('job.requestClosure', { id: jobId }, systemActor(job.organization_id));
    return { job: await jobRow(jobId), driver: result.driver ?? null, assignment: result.assignmentId ? await assignmentRow(result.assignmentId) : undefined, alreadyRequested: result.alreadyRequested };
  },
  alertManagers: (actor, input) => run('notification.alertManagers', input, actor.type ? actor : driverActor(actor)),
  recordSafetyFollowup: (driver, input) => run('incident.recordSafetyFollowup', input, driverActor(driver)),
  async reportIncident(driver, input) {
    const result = await run('incident.report', input, driverActor(driver));
    return { job: await jobRow(result.jobId), assignment: { id: result.assignmentId }, ...result };
  },

  // Reads
  getDriverAssignment: (driver) => read('trip.assignment', { driverId: idOf(driver) }),
  describeProgress: (driver) => read('trip.progress', { driverId: driver.id }),
  listRecentJobsForDriver: (driver, limit = 5) => read('trip.recentJobs', { driverId: driver.id, limit }),
  hasPodDocument: (jobId) => read('trip.hasProofOfDelivery', { jobId }),
  listAvailableJobs: (driver) => read('request.available', { driverId: driver.id }, driver.organization_id),
  // The open jobs their vehicle suits: what a driver is shown when they ask for work.
  listJobsForDriver: (driver) => read('request.available', { driverId: driver.id, fitVehicle: true }, driver.organization_id),
  getPendingRequest: (driver) => read('request.pending', { driverId: driver.id }, driver.organization_id),
  getJobByNumber: (organizationId, jobRef) => read('job.findByNumber', { jobRef }, organizationId),
  findJobsDueForAutoClosure: (minutes) => read('job.dueForClosure', { minutes }),
  currentMilestoneRank: records.milestoneRankOf,
  run, translate, jobRow, assignmentRow, driverActor, systemActor,
};
