const { z } = require('zod');
const { defineEvent } = require('../../platform/registry');

module.exports = [
  defineEvent({
    name: 'conversation.messageHandled', description: 'The bot finished handling a message from a driver.',
    payload: z.object({ driverId: z.guid(), conversationId: z.guid() }),
  }),
  defineEvent({
    name: 'conversation.changed', description: 'A manager sent a message in a conversation, read it, paused or resumed the AI, cleared it or deleted it.',
    payload: z.object({ conversationId: z.guid(), change: z.string() }),
  }),
];
