const { defineAction } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { lockConversation, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'conversation.clear',
  title: 'Clear a conversation',
  description: 'Delete every message of a conversation but keep the conversation. Records that pointed at a message (events, incidents, proof photos) keep existing without it.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  destructive: true,
  input: idSchema,
  load: lockConversation,
  handler: async ({ input, tx }) => {
    const deleted = await repo.deleteMessages(tx, input.id);
    await repo.clearLastMessage(tx, input.id);
    return { result: { ok: true, deleted }, events: [changed(input.id, 'cleared')], subject: { type: 'CONVERSATION', id: input.id } };
  },
});
