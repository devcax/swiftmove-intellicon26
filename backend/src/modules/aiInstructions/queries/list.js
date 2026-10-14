const { defineQuery } = require('../../../platform/registry');
const { listSchema } = require('../schemas');
const { INSTRUCTIONS, DEFAULT_INSTRUCTION_CONTENT } = require('../defaults');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'aiInstruction.list',
  description: 'Every editable AI instruction: its current text, the default, and whether this organization customized it.',
  roles: ['ADMIN', 'MANAGER'],
  input: listSchema,
  handler: async ({ actor, db }) => {
    const customByKey = new Map((await repo.listCustom(db, actor.organizationId)).map((r) => [r.key, r]));
    return {
      instructions: Object.entries(INSTRUCTIONS).map(([key, meta]) => {
        const row = customByKey.get(key);
        return {
          key, label: meta.label, description: meta.description, content: row?.content ?? DEFAULT_INSTRUCTION_CONTENT[key],
          defaultContent: DEFAULT_INSTRUCTION_CONTENT[key], version: row?.version ?? 0, isCustomized: Boolean(row), updatedAt: row?.updatedAt ?? null,
        };
      }),
    };
  },
});
