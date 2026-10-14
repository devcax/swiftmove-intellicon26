const { defineAction } = require('../../../platform/registry');
const { bumpStoreVersion } = require('../../../platform/policy/store');
const { idSchema } = require('../schemas');
const { lockPolicy, changed } = require('../load');
const repo = require('../repo');

module.exports = defineAction({
  name: 'policy.archive',
  title: 'Archive a policy version',
  description: 'Retire a policy version and keep it in the history. If it was the active version, it stops being enforced.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  load: lockPolicy,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const row = await repo.findPolicy(tx, organizationId, input.id);
    if (row.status === 'ARCHIVED') return { result: row, events: [] };
    await repo.setStatus(tx, organizationId, row.id, { status: 'ARCHIVED' });
    if (row.status === 'PUBLISHED') await bumpStoreVersion(organizationId, tx);
    await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: 'POLICY_ARCHIVED', entityId: row.id, before: { status: row.status }, after: { status: 'ARCHIVED' } });
    const fresh = await repo.findPolicy(tx, organizationId, row.id);
    return { result: fresh, events: [changed(fresh, 'archived')], subject: { type: 'POLICY', id: row.id } };
  },
});
