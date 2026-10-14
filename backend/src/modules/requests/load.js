const { NotFoundError, ConflictError } = require('../../platform/errors');
const { ID_SHAPE } = require('../../platform/http/ownership');
const { lockRow } = require('../../platform/db');
const { logger } = require('../../platform/logger');
const notices = require('../../platform/driverNotices');

/** Lock the acting driver for this transaction (lock order: driver, job, assignment). */
async function lockActingDriver({ actor, tx }) {
  if (!actor.driverId || !(await lockRow(tx, 'drivers', actor.driverId, actor.organizationId))) throw new NotFoundError('Driver not found');
  return { driverId: actor.driverId };
}

/** Lock a request row. A request of another organization is reported as missing. */
async function lockRequest({ input, actor, tx }) {
  if (!ID_SHAPE.test(input.id) || !(await lockRow(tx, 'job_requests', input.id, actor.organizationId))) throw new NotFoundError('Request not found');
  return {};
}

/** A step that cannot happen right now. `code` is what the chat and dashboard already read (BAD_STATE, NO_OFFER, ...). */
const stateError = (message, code = 'BAD_STATE') => new ConflictError(message, { code });

/** Tell a driver something, after the change is saved. `send` is a bot function taking one argument object. */
const tellAfterCommit = (send, args) => () => notices.notify(send, args);

/** Tell a driver something with a plain message. */
const notifyAfterCommit = (args) => () => notices.notify('notifyDriver', args);

const logFailure = (err, what) => logger.error({ err }, what);

module.exports = { lockActingDriver, lockRequest, stateError, tellAfterCommit, notifyAfterCommit, logFailure };
