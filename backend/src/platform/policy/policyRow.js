const { z } = require('zod');

// A JSON column is typed JsonValue by Prisma, which is not validation: parse it when it is read.
const jsonObject = z.record(z.string(), z.unknown());

/**
 * A policy_definitions row in the shape the dashboard, the engine and the store have always used. The naming is mixed on
 * purpose and is part of the contract: organization_id, created_at and updated_at are snake_case, the rest camelCase.
 * Throws when a JSON column is not an object, so a damaged row is noticed instead of being evaluated.
 */
function toPolicyRow(row) {
  return {
    id: row.id,
    organization_id: row.organizationId,
    key: row.key,
    name: row.name,
    description: row.description,
    action: row.action,
    enforcement: row.enforcement,
    match: jsonObject.parse(row.match ?? {}),
    rule: jsonObject.parse(row.rule),
    onBlock: jsonObject.parse(row.onBlock ?? { mode: 'BLOCK' }),
    position: row.position,
    version: row.version,
    status: row.status,
    enabled: row.enabled,
    isSystem: row.isSystem,
    sourceInstruction: row.sourceInstruction,
    createdByUserId: row.createdByUserId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

module.exports = { toPolicyRow };
