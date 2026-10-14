const { NotFoundError, ConflictError } = require('../../platform/errors');
const { ID_SHAPE } = require('../../platform/http/ownership');
const { lockRow } = require('../../platform/db');
const notices = require('../../platform/driverNotices');

/** Lock the job for this transaction. A job of another organization is reported as missing. */
async function lockJob({ input, actor, tx }) {
  if (!ID_SHAPE.test(input.id) || !(await lockRow(tx, 'jobs', input.id, actor.organizationId))) throw new NotFoundError('Job not found');
  return { jobId: input.id, subject: { type: 'JOB', id: input.id } };
}

/** A job that is in the wrong state for this change. `code` is what the dashboard already reads (BAD_STATE, JOB_FROZEN). */
const stateError = (message, code = 'BAD_STATE') => new ConflictError(message, { code });

const changed = (job, change, status = job.currentStatus) => ({ type: 'job.changed', payload: { jobId: job.id, jobNumber: job.jobNumber, status, change } });

/** Tell a driver something about their job, after the change is saved. `send` is a bot function taking { job, driver }. */
const tellDriverAfterCommit = (send, args) => () => notices.notify(send, args);

module.exports = { lockJob, stateError, changed, tellDriverAfterCommit };
