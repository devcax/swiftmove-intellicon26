const { defineAction } = require('../../../platform/registry');
const { updateSchema } = require('../schemas');
const { presentDriver } = require('../present');
const { lockDriver } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'driver.update',
  title: 'Edit a driver',
  description: 'Change a driver\'s name, number, vehicle, licence plate or status. A new number has to be verified again.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: updateSchema,
  load: lockDriver,
  handler: async ({ input, actor, tx }) => {
    await repo.updateFields(tx, actor.organizationId, input.id, input);
    await repo.replacePrimaryPhone(tx, input.id, input.phone);
    return {
      result: presentDriver(await repo.findDriver(tx, actor.organizationId, input.id)),
      events: [{ type: 'driver.updated', payload: { driverId: input.id } }],
      subject: { type: 'DRIVER', id: input.id },
    };
  },
});
