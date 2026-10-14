/** Every Prisma call for policies. Each function takes the client first and filters by organization. */
const { KEY_PATTERN } = require('../../platform/policy/dsl');
const { toPolicyRow } = require('../../platform/policy/policyRow');
const { recordAudit } = require('../../platform/audit');
const { prisma } = require('../../platform/db');

async function findPolicy(client, organizationId, id) {
  const row = await client.policyDefinition.findFirst({ where: { id, organizationId } });
  return row ? toPolicyRow(row) : null;
}

/** Every version of every policy, grouped by key, newest version first. */
async function listPolicies(client, organizationId) {
  const rows = await client.policyDefinition.findMany({
    where: { organizationId }, orderBy: [{ key: 'asc' }, { version: 'desc' }, { createdAt: 'desc' }], take: 5000,
  });
  return rows.map(toPolicyRow);
}

/** A key that does not exist yet for this organization. */
async function allocateKey(client, organizationId, suggestion) {
  const base = KEY_PATTERN.test(String(suggestion ?? '')) ? String(suggestion) : `rule.${Date.now().toString(36)}`;
  let candidate = base;
  for (let i = 2; ; i += 1) {
    if (!(await client.policyDefinition.findFirst({ where: { organizationId, key: candidate }, select: { id: true } }))) return candidate;
    candidate = `${base.slice(0, 70)}.${i}`;
  }
}

const keyExists = async (client, organizationId, key) => Boolean(
  await client.policyDefinition.findFirst({ where: { organizationId, key }, select: { id: true } }),
);

async function nextVersion(client, organizationId, key) {
  const { _max } = await client.policyDefinition.aggregate({ where: { organizationId, key }, _max: { version: true } });
  return (_max.version ?? 0) + 1;
}

/** A new DRAFT row. */
async function insertDraft(tx, organizationId, data) {
  const row = await tx.policyDefinition.create({
    data: {
      organizationId, key: data.key, name: data.name, description: data.description, action: data.action, enforcement: data.enforcement,
      match: data.match, rule: data.rule, onBlock: data.onBlock, position: data.position, version: data.version ?? 1, status: 'DRAFT',
      enabled: true, isSystem: data.isSystem ?? false, sourceInstruction: data.sourceInstruction ?? null, createdByUserId: data.createdByUserId,
    },
  });
  return toPolicyRow(row);
}

/** Archive the published version(s) of a key other than `exceptId`. Returns what was archived. */
async function archiveOtherPublished(tx, organizationId, key, exceptId) {
  const published = await tx.policyDefinition.findMany({
    where: { organizationId, key, status: 'PUBLISHED', id: { not: exceptId } }, select: { id: true, version: true },
  });
  if (published.length > 0) {
    await tx.policyDefinition.updateMany({ where: { id: { in: published.map((p) => p.id) } }, data: { status: 'ARCHIVED', updatedAt: new Date() } });
  }
  return published;
}

const setStatus = (tx, organizationId, id, data) => tx.policyDefinition.updateMany({
  where: { id, organizationId }, data: { ...data, updatedAt: new Date() },
});

const deleteDraft = (tx, organizationId, id) => tx.policyDefinition.deleteMany({ where: { id, organizationId } });

/** The audit trail entry that has always accompanied a policy change. */
const audit = (tx, entry) => recordAudit(tx, { ...entry, entityType: 'POLICY' });

module.exports = {
  client: prisma, findPolicy, listPolicies, allocateKey, keyExists, nextVersion, insertDraft, archiveOtherPublished, setStatus, deleteDraft, audit,
};
