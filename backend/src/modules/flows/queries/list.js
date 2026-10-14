const { defineQuery } = require('../../../platform/registry');
const { listSchema } = require('../schemas');
const { STEP_TYPES } = require('../flowValidate');
const { INTENTS, ACTION_NAMES, ACTION_LABELS, PROMPT_PROVIDER_NAMES, PROMPT_PROVIDER_LABELS, CONDITION_NAMES, CONDITION_LABELS } = require('../vocabulary');
const { CREATABLE_INTENTS, INTENT_INFO } = require('../triggerCatalog');
const { mapFlowSummary } = require('../present');
const repo = require('../repo');

module.exports = defineQuery({
  name: 'flow.list',
  description: 'List every flow with its live and draft versions, plus the steps, actions and triggers the flow builder offers.',
  roles: ['ADMIN', 'MANAGER'],
  input: listSchema,
  handler: async ({ actor, db }) => {
    const groups = await repo.loadAllByKey(db, actor.organizationId);
    const summaries = groups.map(mapFlowSummary);
    // Who already answers each thing a driver can say: one conversation per intent (general questions: one per topic).
    const intentOwners = (intent) => summaries
      .filter((f) => f.triggerType === 'INTENT' && f.triggerConfig.intent === intent)
      .map((f) => ({ key: f.key, name: f.name, topic: f.triggerConfig.topic ?? null }));
    return {
      flows: summaries,
      meta: {
        stepTypes: [...STEP_TYPES],
        actions: ACTION_NAMES.map((name) => ({ name, label: ACTION_LABELS[name] ?? name })),
        promptProviders: PROMPT_PROVIDER_NAMES.map((name) => ({ name, label: PROMPT_PROVIDER_LABELS[name] ?? name })),
        // Raw intent names, for the advanced "route the answer by what the AI understood" setting inside a step.
        intents: INTENTS,
        conditions: CONDITION_NAMES.map((name) => ({ name, label: CONDITION_LABELS[name] })),
        starters: CREATABLE_INTENTS.map((id) => ({
          id, label: INTENT_INFO[id].label, hint: INTENT_INFO[id].hint, exclusive: id !== 'GENERAL_QUESTION', owners: intentOwners(id),
        })),
      },
    };
  },
});
