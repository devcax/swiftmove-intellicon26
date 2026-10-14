const { defineAction } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { lockConversation, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'conversation.markRead',
  title: 'Mark a conversation as read',
  description: 'Note that a manager has read everything in a conversation so far, which clears its unread count.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  load: lockConversation,
  handler: async ({ input, tx }) => {
    const readAt = new Date();
    await repo.markRead(tx, input.id, readAt);
    return { result: { readAt }, events: [changed(input.id, 'read')], subject: { type: 'CONVERSATION', id: input.id } };
  },
});
