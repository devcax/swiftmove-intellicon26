const { z } = require('zod');
const { defineQuery } = require('../../../platform/registry');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'stats.sidebarCounts',
  description: 'The number shown on the sidebar: driver messages in open conversations that no manager has read yet.',
  roles: ['ADMIN', 'MANAGER'],
  input: z.object({}),
  handler: async ({ actor, db }) => ({ conversations: await repo.countUnreadDriverMessages(db, actor.organizationId) }),
});
