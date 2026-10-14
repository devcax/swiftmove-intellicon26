const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { NotFoundError } = require('../../../platform/errors');
const repo = require('../repo');

module.exports = defineAction({
  name: 'notification.markRead', title: 'Mark notifications as read',
  description: 'Read one notification, or all notifications received up to a supplied time, for the signed-in user only.',
  actors: ['MANAGER'], roles: ['ADMIN', 'MANAGER'],
  input: z.union([z.object({ id: z.guid() }), z.object({ through: z.iso.datetime() })]),
  handler: async ({ actor, input, tx }) => {
    const result = await repo.markRead(tx, actor, input);
    if ('id' in input && !result.found) throw new NotFoundError('Notification not found');
    return { result: { ok: true }, events: [] };
  },
});
