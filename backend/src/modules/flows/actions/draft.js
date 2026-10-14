const { defineAction } = require('../../../platform/registry');
const { generateSchema } = require('../schemas');
const { draftFlow } = require('../author');
const { generateDefinition } = require('../generateDefinition');

/**
 * Turn a plain-words description into a validated flow definition with the AI author. It saves nothing: the dashboard keeps
 * the draft in the editor and saves it through flow.create or flow.save, which validate again. The AI call is made in `prepare`
 * so no transaction is open while the model is thinking.
 */
function createDraftAction({ draft = draftFlow } = {}) {
  return defineAction({
    name: 'flow.generate',
    title: 'Draft a flow with the AI',
    description: 'Describe a conversation in plain words and the AI writes a flow definition from the supported steps. Nothing is saved.',
    actors: ['MANAGER'],
    roles: ['ADMIN', 'MANAGER'],
    input: generateSchema,
    prepare: async ({ input, actor }) => {
      const base = input.base !== undefined ? input.base : null;
      return { result: await generateDefinition({ description: input.description, base, organizationId: actor.organizationId, draft }) };
    },
    handler: async ({ prepared }) => ({ result: prepared.result, events: [] }),
  });
}

module.exports = { draftAction: createDraftAction(), createDraftAction };
