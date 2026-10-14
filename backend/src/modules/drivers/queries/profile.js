const { defineQuery } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { presentDriver } = require('../present');
const { NotFoundError } = require('../../../platform/errors');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'driver.profile',
  description: 'Read a driver profile and their latest 100 trip assignments.',
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  handler: async ({ input, actor, db }) => {
    const row = await repo.findDriverProfile(db, actor.organizationId, input.id);
    if (!row) throw new NotFoundError('Driver not found.');
    return { ...presentDriver(row), createdAt: row.createdAt, activeJobId: row.activeJobId, trips: row.trips };
  },
});
