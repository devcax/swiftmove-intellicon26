/** Every database call for AI instructions. Each function takes the client first and filters by organization. */
const { recordAudit } = require('../../platform/audit');

const listCustom = (client, organizationId) => client.aiInstruction.findMany({ where: { organizationId } });

/** Save the text for a key, or bump its version when it already has an override. One statement, so two saves cannot both claim a version. */
async function upsert(tx, organizationId, key, content) {
  const rows = await tx.$queryRaw`
    INSERT INTO ai_instructions (organization_id, key, content)
    VALUES (${organizationId}::uuid, ${key}, ${content})
    ON CONFLICT (organization_id, key)
    DO UPDATE SET content = ${content}, version = ai_instructions.version + 1, updated_at = now()
    RETURNING id, key, version, updated_at AS "updatedAt"`;
  return rows[0];
}

/** Delete the override; the removed row, or null when there was none. */
async function remove(tx, organizationId, key) {
  const row = await tx.aiInstruction.findUnique({ where: { organizationId_key: { organizationId, key } }, select: { id: true } });
  if (!row) return null;
  await tx.aiInstruction.deleteMany({ where: { organizationId, key } });
  return row;
}

const audit = (tx, entry) => recordAudit(tx, { ...entry, entityType: 'AI_INSTRUCTION' });

module.exports = { listCustom, upsert, remove, audit };
