const { defineAction } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const { createSchema } = require('../schemas');
const { KEY_PATTERN, validateTriggerConfig } = require('../triggers');
const { lockFlow, assertValidDefinition } = require('../load');
const { saveNewFlow } = require('../saveNew');

module.exports = defineAction({
  name: 'flow.create',
  title: 'Create a flow',
  description: 'Start a new conversation flow as a draft. It is checked against the step vocabulary and cannot clash with another flow\'s trigger.',
  actors: ['MANAGER'],
  roles: ['ADMIN'],
  input: createSchema,
  load: lockFlow,
  handler: async ({ input, actor, tx }) => {
    const key = String(input.key ?? '').trim();
    if (!KEY_PATTERN.test(key)) throw new ValidationError('key must be 2-61 chars of a-z 0-9 . - (e.g. "faq.working-hours").');
    const name = String(input.name ?? '').trim();
    if (!name) throw new ValidationError('name is required.');
    const triggerType = String(input.triggerType ?? '');
    const trigger = validateTriggerConfig(triggerType, input.triggerConfig);
    if (trigger.error) throw new ValidationError(trigger.error);
    assertValidDefinition(input.definition);

    return saveNewFlow({ tx, actor, key, name, description: input.description, triggerType, trigger: trigger.value, definition: input.definition });
  },
});
