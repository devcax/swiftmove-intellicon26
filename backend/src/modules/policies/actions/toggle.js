const { defineAction } = require('../../../platform/registry');
const { bumpStoreVersion } = require('../../../platform/policy/store');
const { idSchema } = require('../schemas');
const { lockPolicy, changed } = require('../load');
const repo = require('../repo');

/** enable and disable are the same change in opposite directions. */
function createToggleAction({ name, enabled, title, description, auditAction, change }) {
  return defineAction({
    name, title, description, actors: ['MANAGER'], roles: ['ADMIN'], input: idSchema, load: lockPolicy,
    handler: async ({ input, actor, tx }) => {
      const organizationId = actor.organizationId;
      const row = await repo.findPolicy(tx, organizationId, input.id);
      await repo.setStatus(tx, organizationId, row.id, { enabled });
      if (row.status === 'PUBLISHED') await bumpStoreVersion(organizationId, tx);
      await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: auditAction, entityId: row.id, before: { enabled: row.enabled }, after: { enabled } });
      const fresh = await repo.findPolicy(tx, organizationId, row.id);
      return { result: fresh, events: [changed(fresh, change)], subject: { type: 'POLICY', id: row.id } };
    },
  });
}

module.exports = {
  disable: createToggleAction({
    name: 'policy.disable', enabled: false, auditAction: 'POLICY_DISABLED', change: 'disabled', title: 'Switch a policy off',
    description: 'Stop enforcing a policy without removing it. It can be switched back on.',
  }),
  enable: createToggleAction({
    name: 'policy.enable', enabled: true, auditAction: 'POLICY_ENABLED', change: 'enabled', title: 'Switch a policy on',
    description: 'Start enforcing a policy again after it was switched off.',
  }),
};
