/** The audit trail entry that accompanies a change a manager made. Write it in the same transaction as the change. */
function recordAudit(tx, { organizationId, actorUserId, action, entityType, entityId, before, after }) {
  return tx.auditLog.create({
    data: {
      organizationId, actorType: 'MANAGER', actorUserId, action, entityType, entityId,
      // Prisma wants undefined, not null, for "no JSON value"; dates inside are written as ISO strings.
      beforeData: before ?? undefined, afterData: after ?? undefined,
    },
  });
}

module.exports = { recordAudit };
