const { defineAction } = require('../../../platform/registry');
const { updateSchema } = require('../schemas');
const { presentDriver } = require('../present');
const { lockDriver } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'driver.update',
  title: 'Edit a driver',
  description: 'Change a driver\'s contact, vehicle, optional personal and bank details, or status. A new number has to be verified again: a new activation link is sent to it.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: updateSchema,
  load: lockDriver,
  handler: async ({ input, actor, tx }) => {
    await repo.updateFields(tx, actor.organizationId, input.id, input);
    const { accountId, changed } = await repo.replacePrimaryPhone(tx, input.id, input.phone);
    if (changed) await repo.issueActivation(tx, accountId);
    return {
      result: presentDriver(await repo.findDriver(tx, actor.organizationId, input.id)),
      events: [
        { type: 'driver.updated', payload: { driverId: input.id } },
        ...(changed ? [{ type: 'driver.activationRequested', payload: { driverId: input.id } }] : []),
      ],
      subject: { type: 'DRIVER', id: input.id },
    };
  },
});
