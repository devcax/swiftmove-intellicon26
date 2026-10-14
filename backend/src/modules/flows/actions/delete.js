const { defineAction } = require('../../../platform/registry');
const { ConflictError } = require('../../../platform/errors');
const { keySchema } = require('../schemas');
const { lockFlow, requireRows, changed, dropCache } = require('../load');
const { mapFlowSummary } = require('../present');
const repo = require('../repo');

module.exports = defineAction({
  name: 'flow.delete',
  title: 'Delete a flow',
  description: 'Remove a flow and all its versions. Built-in flows can be disabled but not deleted.',
  actors: ['MANAGER'],
  roles: ['ADMIN'],
  input: keySchema,
  load: lockFlow,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const rows = await requireRows(tx, organizationId, input.key);
    if (rows[0].isSystem) throw new ConflictError('This is a built-in flow — it can be disabled but not deleted.');
    await repo.deleteKey(tx, organizationId, input.key);
    await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: 'FLOW_DELETED', entityId: rows[0].id, before: mapFlowSummary(rows) });
    return { result: { ok: true, key: input.key }, events: [changed(rows[0], 'deleted')], subject: { type: 'FLOW', id: rows[0].id }, afterCommit: [dropCache(organizationId)] };
  },
});
