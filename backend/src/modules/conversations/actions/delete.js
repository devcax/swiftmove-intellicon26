const { defineAction } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { lockConversation, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'conversation.delete',
  title: 'Delete a conversation',
  description: 'Delete a conversation and all its messages. This cannot be undone.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  destructive: true,
  input: idSchema,
  load: lockConversation,
  handler: async ({ input, tx }) => {
    await repo.deleteMessages(tx, input.id);
    await repo.deleteConversation(tx, input.id);
    return { result: { ok: true }, events: [changed(input.id, 'deleted')], subject: { type: 'CONVERSATION', id: input.id } };
  },
});
