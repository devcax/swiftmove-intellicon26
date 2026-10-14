/**
 * The published flows of an organization, read for the runtime and kept for a short while. The flows module clears the organization's entry
 * once a change is saved, so a publish is live straight away on this instance (other instances catch up within the cache time).
 */
const config = require('../../platform/config');
const { logger } = require('../../platform/logger');
const repo = require('./repo');

const CACHE_TTL_MS = config.flowCacheMs;
const cache = new Map(); // organizationId -> { at, value }

const toRuntimeFlow = (r) => ({
  id: r.id, key: r.key, name: r.name, description: r.description ?? null, version: r.version, triggerType: r.trigger_type,
  triggerConfig: r.trigger_config ?? {}, definition: r.definition, isSystem: r.is_system, enabled: r.enabled,
});

/** Published and enabled flows, by key. Null when the table cannot be read, so the caller falls back to its built-in conversations. */
async function listLive(organizationId) {
  const hit = cache.get(organizationId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  let flows;
  try {
    flows = (await repo.listLiveRows(organizationId)).map(toRuntimeFlow);
  } catch (err) {
    logger.warn({ err }, 'flow_definitions unavailable, built-in flows active');
    return null;
  }
  cache.set(organizationId, { at: Date.now(), value: flows });
  return flows;
}

/** One version of a flow, for a conversation that started on it and must finish on it. */
async function findVersion(organizationId, key, version) {
  try {
    const row = await repo.findVersionRow(organizationId, key, version);
    return row ? toRuntimeFlow(row) : null;
  } catch {
    return null;
  }
}

/** Forget what was read for an organization (everything when none is named). */
function invalidate(organizationId = null) {
  if (organizationId) cache.delete(organizationId);
  else cache.clear();
}

module.exports = { listLive, findVersion, invalidate };
