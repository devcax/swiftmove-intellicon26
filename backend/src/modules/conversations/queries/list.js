const { defineQuery } = require('../../../platform/registry');
const { emptySchema } = require('../schemas');
const { toConversationLine } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'conversation.list',
  description: 'Open conversations with drivers, most recent activity first, with the last message and how many driver messages are unread.',
  roles: ['ADMIN', 'MANAGER'],
  input: emptySchema,
  handler: async ({ actor, db }) => (await repo.listOpen(db, actor.organizationId)).map(toConversationLine),
});
