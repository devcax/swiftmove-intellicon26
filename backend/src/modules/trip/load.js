const { NotFoundError, ConflictError } = require('../../platform/errors');
const { ID_SHAPE } = require('../../platform/http/ownership');
const { lockRow } = require('../../platform/db');
const records = require('../../platform/jobRecords');
const notices = require('../../platform/driverNotices');

/** A step that cannot happen right now. `code` is what the chat and dashboard already read (BAD_STATE, JOB_FROZEN, ...). */
const stateError = (message, code = 'BAD_STATE') => new ConflictError(message, { code });

/** Lock the acting driver (lock order: driver, job, assignment). */
async function lockActingDriver({ actor, tx }) {
  if (!actor.driverId || !(await lockRow(tx, 'drivers', actor.driverId, actor.organizationId))) throw new NotFoundError('Driver not found');
}

/** The driver's one live assignment (any live status), newest first, or null. */
const findDriverAssignment = (tx, actor) => records.findDriverLiveAssignment(tx, actor.organizationId, actor.driverId);

/**
 * Lock the driver, find their assignment, check it is in one of `statuses` (else the `message` the chat shows), and lock the job.
 * Returns the subject the runner needs: the ids for the policy context, the assignment, and the job reference for the log.
 */
async function loadDriverTrip({ actor, tx }, { statuses, message, code = 'BAD_STATE' }) {
  await lockActingDriver({ actor, tx });
  const assignment = await findDriverAssignment(tx, actor);
  if (!assignment || !statuses.includes(assignment.status)) throw stateError(message, code);
  await lockRow(tx, 'jobs', assignment.jobId, actor.organizationId);
  return { driverId: actor.driverId, jobId: assignment.jobId, assignment, subject: { type: 'JOB', id: assignment.jobId } };
}

/** Lock a job by id. A job of another organization is reported as missing. */
async function lockJobById({ tx, actor }, jobId) {
  if (!ID_SHAPE.test(String(jobId)) || !(await lockRow(tx, 'jobs', jobId, actor.organizationId))) throw new NotFoundError('Job not found');
}

/** Tell a driver something, after the change is saved. `send` is a bot function taking one argument object. */
const tellAfterCommit = (send, args) => () => notices.notify(send, args);

module.exports = { stateError, lockActingDriver, findDriverAssignment, loadDriverTrip, lockJobById, tellAfterCommit };
