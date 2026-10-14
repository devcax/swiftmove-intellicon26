const { lockRow } = require('../../platform/db');
const { NotFoundError } = require('../../platform/errors');

/** Lock the driver for this transaction. A driver of another organization is reported as missing. */
async function lockDriver({ input, actor, tx }) {
  if (!(await lockRow(tx, 'drivers', input.id, actor.organizationId))) throw new NotFoundError('Driver not found.');
  return { driverId: input.id, subject: { type: 'DRIVER', id: input.id } };
}

module.exports = { lockDriver };
