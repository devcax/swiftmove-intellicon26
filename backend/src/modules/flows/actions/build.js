const { defineAction } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const { buildSchema } = require('../schemas');
const { KEY_PATTERN, validateTriggerConfig, findTriggerClash } = require('../triggers');
const { describeTrigger } = require('../triggerCatalog');
const { generateDefinition } = require('../generateDefinition');
const { lockFlow, clashError } = require('../load');
const { saveNewFlow } = require('../saveNew');
const repo = require('../repo');

const slugify = (text) => String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

/**
 * Create a bot conversation from plain words, in one step: the AI author writes the steps, the backend checks them, and the result is
 * saved as a draft. Nothing goes live until it is published. The model call is made in `prepare`, before any transaction opens.
 */
function createBuildAction({ generate = generateDefinition, db = repo.client } = {}) {
  return defineAction({
    name: 'flow.build',
    title: 'Create a bot conversation',
    description: 'Create a new bot conversation (flow) from plain words: say what it should do and what the driver says to start it. The AI writes the steps and it is saved as a draft only. Use flow.listAll first to check the starter is free.',
    actors: ['MANAGER'],
    roles: ['ADMIN'],
    input: buildSchema,
    prepare: async ({ input, actor }) => {
      const organizationId = actor.organizationId;
      const trigger = validateTriggerConfig('INTENT', { intent: input.starter, topic: input.topic });
      if (trigger.error) throw new ValidationError(trigger.error);
      const clash = findTriggerClash(await repo.latestOfOthers(db, organizationId, null), 'INTENT', trigger.value);
      if (clash) throw clashError(clash, 'INTENT', trigger.value);

      const requestedKey = String(input.key ?? '').trim();
      if (requestedKey && !KEY_PATTERN.test(requestedKey)) throw new ValidationError('key must be 2-61 chars of a-z 0-9 . - (e.g. "faq.working-hours").');

      const authored = await generate({ description: input.description, organizationId });
      const name = String(input.name ?? '').trim() || authored.name || 'New conversation';
      const key = requestedKey || await repo.allocateKey(db, organizationId, slugify(name));
      return { key, name, description: authored.description, definition: authored.definition, trigger: trigger.value };
    },
    // A dry run skips `prepare`, so there may be no key to lock yet.
    load: ({ actor, tx, prepared }) => lockFlow({ input: { key: prepared?.key }, actor, tx }),
    handler: async ({ actor, tx, prepared }) => {
      const { key, name, description, definition, trigger } = prepared;
      const saved = await saveNewFlow({ tx, actor, key, name, description, triggerType: 'INTENT', trigger, definition });
      return {
        ...saved,
        result: {
          key, name, status: 'DRAFT', startsWhen: describeTrigger({ triggerType: 'INTENT', triggerConfig: trigger }), steps: definition.steps.length,
          note: 'Saved as a draft. It does not run for drivers until it is published.',
        },
      };
    },
  });
}

module.exports = { buildAction: createBuildAction(), createBuildAction };
