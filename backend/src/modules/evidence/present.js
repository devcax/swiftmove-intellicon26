/** An evidence row as the API returns it. */
const presentEvidence = (row) => ({
  id: row.id, subjectType: row.subjectType, subjectId: row.subjectId, name: row.name, type: row.type, value: row.value,
  attachmentId: row.attachmentId, recordedByType: row.recordedByType, recordedById: row.recordedById, source: row.source,
  createdAt: row.createdAt, expiresAt: row.expiresAt, revokedAt: row.revokedAt,
});

module.exports = { presentEvidence };
