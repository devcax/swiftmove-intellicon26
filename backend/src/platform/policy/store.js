/**
 * Policy store: the runtime view of PUBLISHED policies per organization.
 *
 * Caching: policy_store_meta carries a per-organization version counter that is bumped on every publish, rollback, toggle and
 * archive. Readers compare the counter with one cheap query, so a publish on one application instance is picked up by every
 * other instance without explicit cache broadcasts.
 *
 * Fail-safe: when the policy tables are not readable (a migration not applied yet, a damaged row), the store serves the compiled
 * seed defaults, which reproduce the behaviour from before policies existed, and retries the database after a short cooldown.
 */
const { prisma } = require('../db');
const { logger } = require('../logger');
const { builtInSeeds } = require('./seedProvider');
const { toPolicyRow } = require('./policyRow');
const registry = require('../registry');
const { paramsFromPolicies } = require('./requirementParams');

const RETRY_AFTER_FAILURE_MS = 30_000;

const cache = new Map(); // orgId -> { version, policies, byAction }
const fallbackCache = new Map(); // orgId -> { at, store }

function indexByAction(policies) {
  const byAction = new Map();
  for (const policy of policies) {
    if (!byAction.has(policy.action)) byAction.set(policy.action, []);
    byAction.get(policy.action).push(policy);
  }
  for (const list of byAction.values()) {
    list.sort(
      (a, b) =>
        (a.position ?? 100) - (b.position ?? 100) ||
        String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')) ||
        String(a.id ?? '').localeCompare(String(b.id ?? ''))
    );
  }
  return byAction;
}

function toStore(version, policies, source) {
  return { version, policies, byAction: indexByAction(policies), source };
}

/** Compiled seed defaults dressed as published rows (fail-safe path). */
function seedFallbackStore() {
  const policies = builtInSeeds().map((seed) => ({
    ...seed, id: `seed:${seed.key}`, version: 1, status: 'PUBLISHED', created_at: null,
  }));
  return toStore(0, policies, 'fallback');
}

async function loadStore(orgId) {
  const meta = await prisma.policyStoreMeta.findUnique({ where: { organizationId: orgId }, select: { version: true } });
  const version = Number(meta?.version ?? 0);

  const hit = cache.get(orgId);
  if (hit && hit.version === version) return hit;

  const rows = await prisma.policyDefinition.findMany({
    where: { organizationId: orgId, status: 'PUBLISHED' },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    take: 5000,
  });
  const store = toStore(version, rows.map(toPolicyRow), 'db');
  cache.set(orgId, store);
  return store;
}

/**
 * The published policy store for an organization.
 * @returns {Promise<{version: number, policies: Array, byAction: Map<string, Array>, source: 'db'|'fallback'}>}
 */
async function getPolicyStore(orgId) {
  try {
    return await loadStore(orgId);
  } catch (err) {
    const hit = fallbackCache.get(orgId);
    if (hit && Date.now() - hit.at < RETRY_AFTER_FAILURE_MS) return hit.store;
    logger.warn({ err, organizationId: orgId }, 'policy store unavailable, using compiled policy defaults');
    const store = seedFallbackStore();
    fallbackCache.set(orgId, { at: Date.now(), store });
    return store;
  }
}

/** Published, enabled GATEWAY policies for one action, in evaluation order. An action may borrow another's rules (`policyName`). */
async function getGatewayPolicies(orgId, action) {
  const store = await getPolicyStore(orgId);
  const own = store.byAction.get(registry.getAction(action)?.policyName ?? action) ?? [];
  return own.filter((p) => p.enforcement !== 'SETTING' && p.enabled !== false);
}

/**
 * The params of a requirement leaf inside a published GATEWAY policy (used by
 * compiled services that need a tuned value, e.g. the request-window hours
 * for the job-browse query). Returns `fallback` when the policy or leaf is
 * missing/disabled.
 */
async function getPolicyParams(organizationId, policyKey, requirement, fallback) {
  const store = await getPolicyStore(organizationId);
  return paramsFromPolicies(store.policies, policyKey, requirement, fallback);
}

/** The parameters of a published SETTING policy (rule.setting), or `fallback` when it is missing, disabled or unreadable. */
async function getPolicySetting(orgId, key, fallback) {
  const store = await getPolicyStore(orgId);
  const policy = store.policies.find((p) => p.key === key && p.enforcement === 'SETTING' && p.enabled !== false);
  const setting = policy?.rule?.setting;
  if (!setting || typeof setting !== 'object') return fallback;
  return setting;
}

/**
 * Bump the store version so every instance reloads published policies. Pass the transaction (`client`) when the bump belongs
 * to the same change as the publish, so they commit together.
 */
async function bumpStoreVersion(orgId, client) {
  const db = client ?? prisma;
  await db.policyStoreMeta.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, version: 1 },
    update: { version: { increment: 1 }, updatedAt: new Date() },
  });
  cache.delete(orgId);
}

/** Drop the local cache (one org, or everything when omitted). */
function invalidatePolicyCache(orgId = null) {
  if (!orgId) {
    cache.clear();
    fallbackCache.clear();
    return;
  }
  cache.delete(orgId);
  fallbackCache.delete(orgId);
}

module.exports = { getPolicyStore, getGatewayPolicies, getPolicySetting, getPolicyParams, bumpStoreVersion, invalidatePolicyCache };
