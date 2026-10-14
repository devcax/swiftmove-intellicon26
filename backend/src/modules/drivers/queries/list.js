const { defineQuery } = require('../../../platform/registry');
const { listSchema } = require('../schemas');
const { presentDriver } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'driver.list',
  description: 'List the organization\'s drivers with their status, current job and completed trips.',
  roles: ['ADMIN', 'MANAGER'],
  input: listSchema,
  handler: async ({ actor, db }) => (await repo.listDrivers(db, actor.organizationId)).map(presentDriver),
});
