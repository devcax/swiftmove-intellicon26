/**
 * Saving a brand-new flow as a draft, shared by everything that creates one (the dashboard's flow.create and the assistant's
 * flow.build) so the key, the starter and the definition are checked the same way whoever asked.
 */
const { ConflictError } = require('../../platform/errors');
const { findTriggerClash } = require('./triggers');
const { clashError, changed, dropCache } = require('./load');
const { mapVersion } = require('./present');
const repo = require('./repo');

/** Run inside the transaction, after the key, name, trigger and definition have been validated. */
async function saveNewFlow({ tx, actor, key, name, description, triggerType, trigger, definition }) {
  const organizationId = actor.organizationId;
  if (await repo.keyExists(tx, organizationId, key)) throw new ConflictError('A flow with this key already exists.');
  const clash = findTriggerClash(await repo.latestOfOthers(tx, organizationId, null), triggerType, trigger);
  if (clash) throw clashError(clash, triggerType, trigger);

  const row = await repo.insertVersion(tx, organizationId, {
    key, name, description: String(description ?? '').trim() || null, version: 1, triggerType, triggerConfig: trigger, definition,
  });
  await repo.audit(tx, { organizationId, actorUserId: actor.userId, action: 'FLOW_CREATED', entityId: row.id, after: mapVersion(row) });
  return { result: { key, version: mapVersion(row) }, events: [changed(row, 'created')], subject: { type: 'FLOW', id: row.id }, afterCommit: [dropCache(organizationId)] };
}

module.exports = { saveNewFlow };
