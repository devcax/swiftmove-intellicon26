const { defineAction } = require('../../../platform/registry');
const { takeoverSchema } = require('../schemas');
const { lockConversation, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'conversation.setAiTakeover',
  title: 'Take over a conversation from the AI',
  description: 'Pause the AI in a conversation so a manager can answer the driver themselves, or hand it back.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: takeoverSchema,
  load: lockConversation,
  handler: async ({ input, tx }) => {
    const enabled = Boolean(input.enabled);
    await repo.setAiPaused(tx, input.id, enabled ? new Date() : null);
    return { result: { aiPaused: enabled }, events: [changed(input.id, enabled ? 'ai_paused' : 'ai_resumed')], subject: { type: 'CONVERSATION', id: input.id } };
  },
});
