/** Every Prisma call for flows. Each function takes the client first and filters by organization. */
const { Prisma } = require('@prisma/client');
const { toFlowRow } = require('./present');
const { recordAudit } = require('../../platform/audit');
const { prisma } = require('../../platform/db');

const RUNTIME_COLUMNS = Prisma.sql`id, key, name, description, version, trigger_type, trigger_config, definition, is_system, enabled`;

/** Published and enabled flows as rows for the runtime, by key. Throws when the table cannot be read. */
const listLiveRows = (organizationId) => prisma.$queryRaw(Prisma.sql`
  SELECT ${RUNTIME_COLUMNS} FROM flow_definitions
   WHERE organization_id = ${organizationId}::uuid AND status = 'PUBLISHED' AND enabled = TRUE
   ORDER BY key`);

/** One version of a flow as a row for the runtime, or null. */
const findVersionRow = async (organizationId, key, version) => (await prisma.$queryRaw(Prisma.sql`
  SELECT ${RUNTIME_COLUMNS} FROM flow_definitions
   WHERE organization_id = ${organizationId}::uuid AND key = ${key} AND version = ${Number(version)}`))[0] ?? null;

/** Every version of one flow, newest first. */
async function loadRows(client, organizationId, key) {
  const rows = await client.flowDefinition.findMany({ where: { organizationId, key }, orderBy: { version: 'desc' } });
  return rows.map(toFlowRow);
}

/** Every version of every flow, grouped by key (key order, newest version first within a key). */
async function loadAllByKey(client, organizationId) {
  const rows = await client.flowDefinition.findMany({ where: { organizationId }, orderBy: [{ key: 'asc' }, { version: 'desc' }], take: 5000 });
  const byKey = new Map();
  for (const row of rows.map(toFlowRow)) {
    if (!byKey.has(row.key)) byKey.set(row.key, []);
    byKey.get(row.key).push(row);
  }
  return [...byKey.values()];
}

/** The latest version of every flow except `excludeKey`: what a new trigger is checked against. */
async function latestOfOthers(client, organizationId, excludeKey) {
  const groups = await loadAllByKey(client, organizationId);
  return groups.filter((rows) => rows[0].key !== (excludeKey ?? '')).map((rows) => rows[0]);
}

const keyExists = async (client, organizationId, key) => Boolean(
  await client.flowDefinition.findFirst({ where: { organizationId, key }, select: { id: true } }),
);

const insertVersion = async (tx, organizationId, data) => toFlowRow(await tx.flowDefinition.create({
  data: {
    organizationId, key: data.key, name: data.name, description: data.description, version: data.version, status: 'DRAFT',
    triggerType: data.triggerType, triggerConfig: data.triggerConfig, definition: data.definition, isSystem: data.isSystem ?? false, enabled: true,
  },
}));

const updateDraft = async (tx, organizationId, id, data) => {
  await tx.flowDefinition.updateMany({ where: { id, organizationId }, data: { ...data, updatedAt: new Date() } });
  return toFlowRow(await tx.flowDefinition.findFirst({ where: { id, organizationId } }));
};

const setStatus = (tx, organizationId, id, data) => updateDraft(tx, organizationId, id, data);

const deleteKey = (tx, organizationId, key) => tx.flowDefinition.deleteMany({ where: { organizationId, key } });

/** The audit entry for a flow change; the entity id is the affected version row. */
const audit = (tx, entry) => recordAudit(tx, { ...entry, entityType: 'FLOW' });

module.exports = { listLiveRows, findVersionRow, loadRows, loadAllByKey, latestOfOthers, keyExists, insertVersion, updateDraft, setStatus, deleteKey, audit };
