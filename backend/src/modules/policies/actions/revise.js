const { defineAction } = require('../../../platform/registry');
const { reviseSchema } = require('../schemas');
const { revisionPayload } = require('../payload');
const { assertValidPayload } = require('../validate');
const { lockPolicy, changed } = require('../load');
const repo = require('../repo');

const FIELDS = ['name', 'description', 'action', 'enforcement', 'match', 'rule', 'onBlock', 'position', 'sourceInstruction'];

/** What changed: the `changes` object the dashboard sends, or the same fields directly in the body. */
function changesOf(input) {
  if (input.changes) return input.changes;
  return Object.fromEntries(FIELDS.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));
}

module.exports = defineAction({
  name: 'policy.revise',
  title: 'Revise a policy',
  description: 'Make the next version of a policy as a new draft. The version it is based on stays as it is.',
  actors: ['MANAGER'],
  roles: ['ADMIN', 'MANAGER'],
  input: reviseSchema,
  load: lockPolicy,
  handler: async ({ input, actor, tx }) => {
    const organizationId = actor.organizationId;
    const base = await repo.findPolicy(tx, organizationId, input.id);
    const changes = changesOf(input);
    const merged = revisionPayload(base, changes);
    assertValidPayload(merged);

    const version = await repo.nextVersion(tx, organizationId, base.key);
    const row = await repo.insertDraft(tx, organizationId, {
      ...merged, version, isSystem: base.isSystem, sourceInstruction: changes.sourceInstruction ?? base.sourceInstruction, createdByUserId: actor.userId,
    });
    await repo.audit(tx, {
      organizationId, actorUserId: actor.userId, action: 'POLICY_REVISION_CREATED', entityId: row.id,
      before: { id: base.id, version: base.version }, after: { id: row.id, version },
    });
    return { result: row, events: [changed(row, 'revised')], subject: { type: 'POLICY', id: row.id } };
  },
});
