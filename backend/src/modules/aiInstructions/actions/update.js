const { defineAction } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const { updateSchema } = require('../schemas');
const { requireKnown, dropCache, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'aiInstruction.update',
  title: 'Customize an AI instruction',
  description: 'Replace the text behind one AI feature for this organization. Resetting returns to the default that ships with the code.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: updateSchema,
  handler: async ({ input, actor, tx }) => {
    requireKnown(input.key);
    const content = String(input.content ?? '').trim();
    if (content.length < 20) throw new ValidationError('Instruction text is too short (min. 20 characters).');
    if (content.length > 20000) throw new ValidationError('Instruction text is too long (max. 20,000 characters).');

    const saved = await repo.upsert(tx, actor.organizationId, input.key, content);
    await repo.audit(tx, {
      organizationId: actor.organizationId, actorUserId: actor.userId, action: 'AI_INSTRUCTION_UPDATED', entityId: saved.id, after: { key: input.key, version: saved.version },
    });
    return {
      result: { key: input.key, content, version: saved.version, isCustomized: true, updatedAt: saved.updatedAt },
      events: [changed(saved.id, input.key, 'updated')], subject: { type: 'AI_INSTRUCTION', id: saved.id }, afterCommit: [dropCache(actor.organizationId)],
    };
  },
});
