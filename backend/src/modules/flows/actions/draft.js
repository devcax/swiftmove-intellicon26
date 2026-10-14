const { defineAction } = require('../../../platform/registry');
const { AppError, ValidationError } = require('../../../platform/errors');
const { generateSchema } = require('../schemas');
const { draftFlow } = require('../author');
const { ACTION_NAMES, ACTION_LABELS, PROMPT_PROVIDER_NAMES, PROMPT_PROVIDER_LABELS } = require('../vocabulary');
const { validateFlow } = require('../flowValidate');
const { VALIDATE_KNOWN, flowInvalid } = require('../load');

const catalog = (names, labels) => names.map((n) => `- ${n} — ${labels[n] ?? n}`).join('\n');

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
      const description = String(input.description ?? '').trim();
      if (description.length < 10 || description.length > 2000) throw new ValidationError('Describe the conversation (or the change) in 10-2000 characters.');
      let base = null;
      if (input.base !== undefined) {
        const check = validateFlow(input.base, VALIDATE_KNOWN);
        if (!check.ok) throw flowInvalid(check.errors, 'The current definition has validation problems — fix them in the editor first.');
        base = input.base;
      }
      let result;
      try {
        result = await draft({
          description, base, organizationId: actor.organizationId,
          catalogs: { actions: catalog(ACTION_NAMES, ACTION_LABELS), promptProviders: catalog(PROMPT_PROVIDER_NAMES, PROMPT_PROVIDER_LABELS) },
          validate: (def) => validateFlow(def, VALIDATE_KNOWN),
        });
      } catch (cause) {
        throw new AppError('The AI author is unavailable right now — try again in a moment.', { code: 'EXTERNAL_SERVICE_FAILED', status: 502, expose: true, cause });
      }
      if (!result.ok) {
        throw flowInvalid(result.issues.map((message) => ({ step: null, message })), 'The AI draft did not pass validation — try rephrasing the description.', 422);
      }
      return { result };
    },
    handler: async ({ prepared }) => ({ result: prepared.result, events: [] }),
  });
}

module.exports = { draftAction: createDraftAction(), createDraftAction };
