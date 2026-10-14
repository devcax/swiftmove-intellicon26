const { defineAction } = require('../../../platform/registry');
const { keySchema } = require('../schemas');
const { DEFAULT_INSTRUCTION_CONTENT } = require('../defaults');
const { requireKnown, dropCache, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'aiInstruction.reset',
  title: 'Reset an AI instruction',
  description: 'Remove this organization\'s customized text so the default that ships with the code is used again.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: keySchema,
  handler: async ({ input, actor, tx }) => {
    requireKnown(input.key);
    const removed = await repo.remove(tx, actor.organizationId, input.key);
    if (removed) {
      await repo.audit(tx, { organizationId: actor.organizationId, actorUserId: actor.userId, action: 'AI_INSTRUCTION_RESET', entityId: removed.id, before: { key: input.key } });
    }
    const result = { key: input.key, content: DEFAULT_INSTRUCTION_CONTENT[input.key], version: 0, isCustomized: false, updatedAt: null };
    // Resetting something that was never customized is harmless: no audit row, no event.
    return {
      result, events: removed ? [changed(removed.id, input.key, 'reset')] : [],
      subject: removed ? { type: 'AI_INSTRUCTION', id: removed.id } : undefined, afterCommit: [dropCache(actor.organizationId)],
    };
  },
});
