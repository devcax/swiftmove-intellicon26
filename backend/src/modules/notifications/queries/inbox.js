const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'notification.inbox',
  description: 'The signed-in manager’s driver message and incident notifications, newest first, with their unread count.',
  roles: ['ADMIN', 'MANAGER'],
  input: z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }),
  handler: async ({ actor, db, input }) => repo.inbox(db, actor, input.limit),
});
