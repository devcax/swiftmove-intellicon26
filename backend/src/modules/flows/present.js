const { z } = require('zod');
const { describeTrigger } = require('./triggerCatalog');

// A JSON column is typed JsonValue by Prisma, which is not validation: parse it when it is read.
const jsonObject = z.record(z.string(), z.unknown());

/** A flow_definitions row with its JSON columns checked. Throws when one is not an object. */
const toFlowRow = (row) => ({ ...row, definition: jsonObject.parse(row.definition), triggerConfig: jsonObject.parse(row.triggerConfig ?? {}) });

const mapVersion = (row) => ({
  id: row.id, version: row.version, status: row.status, enabled: row.enabled, definition: row.definition, updatedAt: row.updatedAt,
});

/** One line per flow: the live version, the draft, and when it last changed. `rows` are the versions of one key, newest first. */
function mapFlowSummary(rows) {
  const published = rows.find((r) => r.status === 'PUBLISHED') ?? null;
  const latest = rows[0];
  return {
    key: latest.key, name: latest.name, description: latest.description ?? null, triggerType: latest.triggerType,
    triggerConfig: latest.triggerConfig ?? {}, startsWhen: describeTrigger(latest), isSystem: latest.isSystem, enabled: published?.enabled ?? false,
    publishedVersion: published?.version ?? null, draftVersion: rows.find((r) => r.status === 'DRAFT')?.version ?? null,
    versions: rows.length, updatedAt: latest.updatedAt,
  };
}

module.exports = { toFlowRow, mapVersion, mapFlowSummary };
