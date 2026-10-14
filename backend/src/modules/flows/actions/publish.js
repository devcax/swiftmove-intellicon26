const { defineAction } = require('../../../platform/registry');
const { NotFoundError, ConflictError, ValidationError } = require('../../../platform/errors');
const { publishSchema, rollbackSchema } = require('../schemas');
const { lockFlow, assertValidDefinition, requireRows, changed, dropCache } = require('../load');
const { mapVersion } = require('../present');
const repo = require('../repo');

/** Make `target` the live version and archive the one that was live. Shared by publish and rollback. */
async function goLive({ tx, actor, rows, target, auditAction, change }) {
  const organizationId = actor.organizationId;
  const published = rows.find((r) => r.status === 'PUBLISHED') ?? null;
  if (published) await repo.setStatus(tx, organizationId, published.id, { status: 'ARCHIVED' });
  const now = await repo.setStatus(tx, organizationId, target.id, { status: 'PUBLISHED' });
  await repo.audit(tx, {
    organizationId, actorUserId: actor.userId, action: auditAction, entityId: target.id, before: published ? mapVersion(published) : null, after: mapVersion(now),
  });
  return { result: { key: target.key, version: mapVersion(now) }, events: [changed(now, change)], subject: { type: 'FLOW', id: target.id }, afterCommit: [dropCache(organizationId)] };
}

const publish = defineAction({
  name: 'flow.publish',
  title: 'Publish a flow',
  description: 'Make a draft the live version. The version that was live is archived.',
  actors: ['MANAGER'],
  roles: ['ADMIN'],
  input: publishSchema,
  load: lockFlow,
  handler: async ({ input, actor, tx }) => {
    const rows = await requireRows(tx, actor.organizationId, input.key);
    const target = rows.find((r) => r.version === Number(input.version)) ?? rows.find((r) => r.status === 'DRAFT');
    if (!target) throw new NotFoundError('No draft version to publish.');
    if (target.status === 'PUBLISHED') throw new ConflictError('This version is already published.');
    assertValidDefinition(target.definition);
    return goLive({ tx, actor, rows, target, auditAction: 'FLOW_PUBLISHED', change: 'published' });
  },
});

const rollback = defineAction({
  name: 'flow.rollback',
  title: 'Roll a flow back',
  description: 'Make an older, archived version the live one again.',
  actors: ['MANAGER'],
  roles: ['ADMIN'],
  input: rollbackSchema,
  load: lockFlow,
  handler: async ({ input, actor, tx }) => {
    const rows = await requireRows(tx, actor.organizationId, input.key);
    const target = rows.find((r) => r.version === Number(input.version));
    if (!target) throw new NotFoundError('Version not found.');
    if (target.status === 'PUBLISHED') throw new ConflictError('This version is already the published one.');
    if (target.status === 'DRAFT') throw new ValidationError('Publish the draft instead of rolling back to it.');
    assertValidDefinition(target.definition, 'That version no longer passes validation.');
    return goLive({ tx, actor, rows, target, auditAction: 'FLOW_ROLLED_BACK', change: 'rolled_back' });
  },
});

module.exports = { publish, rollback };
