const { defineAction } = require('../../../platform/registry');
const { ValidationError, ConflictError } = require('../../../platform/errors');
const { createSchema } = require('../schemas');
const { KEY_PATTERN, validateTriggerConfig, findTriggerClash } = require('../triggers');
const { lockFlow, assertValidDefinition, clashError, changed, dropCache } = require('../load');
const { mapVersion } = require('../present');
const repo = require('../repo');

module.exports = defineAction({
  name: 'flow.create',
  title: 'Create a flow',
  description: 'Start a new conversation flow as a draft. It is checked against the step vocabulary and cannot clash with another flow\'s trigger.',
  actors: ['MANAGER'],
  roles: ['ADMIN'],
  input: createSchema,
  load: lockFlow,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const key = String(input.key ?? '').trim();
    if (!KEY_PATTERN.test(key)) throw new ValidationError('key must be 2-61 chars of a-z 0-9 . - (e.g. "faq.working-hours").');
    const name = String(input.name ?? '').trim();
    if (!name) throw new ValidationError('name is required.');
    const triggerType = String(input.triggerType ?? '');
    const trigger = validateTriggerConfig(triggerType, input.triggerConfig);
    if (trigger.error) throw new ValidationError(trigger.error);
    assertValidDefinition(input.definition);

    if (await repo.keyExists(tx, organizationId, key)) throw new ConflictError('A flow with this key already exists.');
    const clash = findTriggerClash(await repo.latestOfOthers(tx, organizationId, null), triggerType, trigger.value);
    if (clash) throw clashError(clash, triggerType, trigger.value);

    const row = await repo.insertVersion(tx, organizationId, {
      key, name, description: String(input.description ?? '').trim() || null, version: 1, triggerType, triggerConfig: trigger.value, definition: input.definition,
    });
    await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: 'FLOW_CREATED', entityId: row.id, after: mapVersion(row) });
    return { result: { key, version: mapVersion(row) }, events: [changed(row, 'created')], subject: { type: 'FLOW', id: row.id }, afterCommit: [dropCache(organizationId)] };
  },
});
