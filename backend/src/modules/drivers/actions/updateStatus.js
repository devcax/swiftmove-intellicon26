const { defineAction } = require('../../../platform/registry');
const { updateStatusSchema } = require('../schemas');
const { presentDriver } = require('../present');
const { lockDriver } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'driver.updateStatus',
  title: 'Set a driver\'s status',
  description: 'Mark a driver active, inactive or suspended without touching their other details.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: updateStatusSchema,
  load: lockDriver,
  handler: async ({ input, actor, tx }) => {
    await repo.setStatus(tx, actor.organizationId, input.id, input.status);
    return {
      result: presentDriver(await repo.findDriver(tx, actor.organizationId, input.id)),
      events: [{ type: 'driver.updated', payload: { driverId: input.id } }],
      subject: { type: 'DRIVER', id: input.id },
    };
  },
});
