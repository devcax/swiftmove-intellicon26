const { defineQuery } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { presentDriver } = require('../present');
const { NotFoundError } = require('../../../platform/errors');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'driver.get',
  description: 'Read one driver with their status, current job and completed trips.',
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  handler: async ({ input, actor, db }) => {
    const row = await repo.findDriver(db, actor.organizationId, input.id);
    if (!row) throw new NotFoundError('Driver not found.');
    return presentDriver(row);
  },
});
