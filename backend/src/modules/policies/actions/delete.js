const { defineAction } = require('../../../platform/registry');
const { ConflictError } = require('../../../platform/errors');
const { idSchema } = require('../schemas');
const { lockPolicy, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'policy.delete',
  title: 'Delete a policy draft',
  description: 'Delete a draft that was never published. Published versions are archived instead, and built-in policies cannot be deleted.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  destructive: true,
  input: idSchema,
  load: lockPolicy,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const row = await repo.findPolicy(tx, organizationId, input.id);
    if (row.isSystem) throw new ConflictError('This is a built-in policy — it can be disabled but not deleted.');
    if (row.status !== 'DRAFT') throw new ConflictError('Only drafts can be deleted; archive published versions to keep the history.');
    await repo.deleteDraft(tx, organizationId, row.id);
    await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: 'POLICY_DELETED', entityId: row.id, before: { key: row.key, version: row.version } });
    return { result: { ok: true, id: row.id }, events: [changed(row, 'deleted')], subject: { type: 'POLICY', id: row.id } };
  },
});
