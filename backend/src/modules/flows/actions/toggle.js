const { defineAction } = require('../../../platform/registry');
const { ConflictError } = require('../../../platform/errors');
const { enabledSchema } = require('../schemas');
const { lockFlow, requireRows, changed, dropCache } = require('../load');
const { mapVersion } = require('../present');
const repo = require('../repo');

module.exports = defineAction({
  name: 'flow.toggle',
  title: 'Switch a flow on or off',
  description: 'Enable or disable the live version of a flow without removing it.',
  actors: ['MANAGER'],
  roles: ['ADMIN'],
  input: enabledSchema,
  load: lockFlow,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const rows = await requireRows(tx, organizationId, input.key);
    const published = rows.find((r) => r.status === 'PUBLISHED');
    if (!published) throw new ConflictError('Publish a version first — only the live version can be enabled or disabled.');
    const enabled = Boolean(input.enabled);
    const updated = await repo.setStatus(tx, organizationId, published.id, { enabled });
    await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: 'FLOW_TOGGLED', entityId: published.id, before: mapVersion(published), after: mapVersion(updated) });
    return { result: { key: input.key, enabled }, events: [changed(updated, enabled ? 'enabled' : 'disabled')], subject: { type: 'FLOW', id: published.id }, afterCommit: [dropCache(organizationId)] };
  },
});
