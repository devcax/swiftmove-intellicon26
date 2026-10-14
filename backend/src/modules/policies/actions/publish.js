const { defineAction } = require('../../../platform/registry');
const { ValidationError } = require('../../../platform/errors');
const { bumpStoreVersion } = require('../../../platform/policy/store');
const { idSchema } = require('../schemas');
const { checkPayload, validationFailure } = require('../validate');
const { lockPolicy, changed } = require('../load');
const repo = require('../repo');

/** Ask the flows module whether the flow is live; a flow it does not know, or one still a draft, is not. */
async function isFlowPublished(actor, key) {
  const { runQuery } = require('../../../platform/runner'); // required here: the runner loads the registry that loads this module
  try {
    const flow = await runQuery('flow.get', { key }, actor);
    return flow.publishedVersion != null;
  } catch (err) {
    if (err.status === 404) return false;
    throw err;
  }
}

const REGISTRY_CHANGED = 'This version can no longer be enforced (the capability registry changed). Revise it instead of publishing.';

module.exports = defineAction({
  name: 'policy.publish',
  title: 'Publish a policy',
  description: 'Make a draft the rule that is enforced. The version that was active is archived. Publishing an older version is a rollback.',
  actors: ['MANAGER'],
  roles: ['ADMIN'],
  input: idSchema,
  // A policy may point at a flow for the conversation after a block. Check it is runnable before the transaction opens.
  prepare: async ({ input, actor }) => {
    const row = await repo.findPolicy(repo.client, actor.organizationId, input.id);
    const flowKey = row?.onBlock?.flowKey;
    return { missingFlow: flowKey && !(await isFlowPublished(actor, flowKey)) ? flowKey : null };
  },
  load: lockPolicy,
  handler: async ({ input, actor, tx, prepared }) => {
    const organizationId = actor.organizationId;
    const row = await repo.findPolicy(tx, organizationId, input.id);
    if (row.status === 'PUBLISHED' && row.enabled !== false) return { result: row, events: [] }; // already the active version

    // Never activate something the current registry cannot enforce.
    const check = checkPayload(row);
    if (!check.ok) throw validationFailure(check.errors, { hint: REGISTRY_CHANGED }, 422);
    if (prepared.missingFlow) {
      throw new ValidationError(`The flow "${prepared.missingFlow}" is not published yet. Publish it first.`, {
        details: [{ path: 'onBlock.flowKey', message: 'This flow is not published.' }],
      });
    }

    const archived = await repo.archiveOtherPublished(tx, organizationId, row.key, row.id);
    await repo.setStatus(tx, organizationId, row.id, { status: 'PUBLISHED', enabled: true });
    await bumpStoreVersion(organizationId, tx);

    const previous = archived.sort((a, b) => b.version - a.version)[0] ?? null;
    const isRollback = previous != null && row.version < previous.version;
    await repo.audit(tx, {
      organizationId, actorUserId: actor.userId, action: isRollback ? 'POLICY_ROLLBACK' : 'POLICY_PUBLISHED', entityId: row.id,
      before: previous ? { id: previous.id, version: previous.version, status: 'PUBLISHED' } : null,
      after: { id: row.id, key: row.key, version: row.version, status: 'PUBLISHED' },
    });
    const fresh = await repo.findPolicy(tx, organizationId, row.id);
    return { result: fresh, events: [changed(fresh, isRollback ? 'rolled_back' : 'published')], subject: { type: 'POLICY', id: row.id } };
  },
});
