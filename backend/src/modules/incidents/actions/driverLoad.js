const { NotFoundError, ConflictError } = require('../../../platform/errors');
const { lockRow } = require('../../../platform/db');

/** Lock the acting driver for this transaction (lock order: driver, job, assignment). */
async function lockActingDriver({ actor, tx }) {
  if (!actor.driverId || !(await lockRow(tx, 'drivers', actor.driverId, actor.organizationId))) throw new NotFoundError('Driver not found');
}

/** A step that cannot happen right now. `code` is what the chat already reads (BAD_STATE, ...). */
const stateError = (message, code = 'BAD_STATE') => new ConflictError(message, { code });

module.exports = { lockActingDriver, stateError };
