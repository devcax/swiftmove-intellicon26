const { z } = require('zod');
const { defineAction } = require('../../../platform/registry');
const { lockRow } = require('../../../platform/db');
const { NotFoundError } = require('../../../platform/errors');

module.exports = defineAction({
  name: 'conversation.noteMessageHandled',
  title: 'Note that a driver\'s message was handled',
  description: 'The bot finished with a driver\'s message (answered it, or held it for a manager). Lets plugins react, for example by refreshing the job summary.',
  actors: ['SYSTEM'],
  input: z.object({ driverId: z.guid(), conversationId: z.guid() }),
  load: async ({ input, actor, tx }) => {
    if (!(await lockRow(tx, 'conversations', input.conversationId, actor.organizationId))) throw new NotFoundError('Conversation not found');
    return { subject: { type: 'CONVERSATION', id: input.conversationId } };
  },
  handler: async ({ input }) => ({
    result: { ok: true },
    events: [{ type: 'conversation.messageHandled', payload: { driverId: input.driverId, conversationId: input.conversationId } }],
    subject: { type: 'CONVERSATION', id: input.conversationId },
  }),
});
