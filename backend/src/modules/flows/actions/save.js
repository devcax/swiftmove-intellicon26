const { defineAction } = require('../../../platform/registry');
const { ConflictError } = require('../../../platform/errors');
const { updateSchema } = require('../schemas');
const { validateTriggerConfig, findTriggerClash } = require('../triggers');
const { lockFlow, assertValidDefinition, requireRows, clashError, changed, dropCache } = require('../load');
const { mapVersion } = require('../present');
const { ValidationError } = require('../../../platform/errors');
const repo = require('../repo');

module.exports = defineAction({
  name: 'flow.save',
  title: 'Save changes to a flow',
  description: 'Edit the working draft of a flow. When the latest version is live, the edit becomes a new draft branched from it.',
  actors: ['MANAGER'],
  roles: ['ADMIN'],
  input: updateSchema,
  load: lockFlow,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const rows = await requireRows(tx, organizationId, input.key);
    const latest = rows[0];

    let triggerConfig = latest.triggerConfig;
    if (input.triggerConfig !== undefined) {
      if (latest.isSystem) throw new ConflictError('The trigger of a built-in flow cannot be changed.');
      const trigger = validateTriggerConfig(latest.triggerType, input.triggerConfig);
      if (trigger.error) throw new ValidationError(trigger.error);
      const clash = findTriggerClash(await repo.latestOfOthers(tx, organizationId, input.key), latest.triggerType, trigger.value);
      if (clash) throw clashError(clash, latest.triggerType, trigger.value);
      triggerConfig = trigger.value;
    }

    const definition = input.definition ?? latest.definition;
    assertValidDefinition(definition);
    const name = input.name !== undefined ? String(input.name).trim() || latest.name : latest.name;
    const description = input.description !== undefined ? String(input.description).trim() : latest.description;

    const saved = latest.status === 'DRAFT'
      ? await repo.updateDraft(tx, organizationId, latest.id, { name, description, triggerConfig, definition })
      : await repo.insertVersion(tx, organizationId, {
        key: input.key, name, description, version: latest.version + 1, triggerType: latest.triggerType, triggerConfig, definition, isSystem: latest.isSystem,
      });
    await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: 'FLOW_VERSION_SAVED', entityId: saved.id, before: mapVersion(latest), after: mapVersion(saved) });
    return { result: { key: input.key, version: mapVersion(saved) }, events: [changed(saved, 'saved')], subject: { type: 'FLOW', id: saved.id }, afterCommit: [dropCache(organizationId)] };
  },
});
