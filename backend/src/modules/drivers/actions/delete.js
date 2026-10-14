const { defineAction } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { lockDriver } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'driver.delete',
  title: 'Delete a driver',
  description: 'Permanently delete a driver with their conversations, messages, incidents and job history. This cannot be undone.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  destructive: true,
  input: idSchema,
  load: lockDriver,
  handler: async ({ input, actor, tx }) => {
    const driver = await repo.findDriver(tx, actor.organizationId, input.id);
    await repo.deleteDriverCascade(tx, actor.organizationId, input.id);
    return {
      result: { ok: true, id: input.id, name: driver.name },
      events: [{ type: 'driver.deleted', payload: { driverId: input.id } }],
      subject: { type: 'DRIVER', id: input.id },
    };
  },
});
