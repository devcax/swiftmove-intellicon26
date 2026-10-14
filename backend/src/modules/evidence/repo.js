/** Every Prisma call for evidence. Each function takes the client first and filters by organization. */

const PUBLIC = {
  id: true, subjectType: true, subjectId: true, name: true, type: true, value: true, attachmentId: true,
  recordedByType: true, recordedById: true, source: true, createdAt: true, expiresAt: true, revokedAt: true,
};

const insertEvidence = (tx, organizationId, data) => tx.evidence.create({ data: { organizationId, ...data }, select: PUBLIC });

const findEvidence = (client, organizationId, id) => client.evidence.findFirst({ where: { id, organizationId }, select: PUBLIC });

/** A file belongs to the organization directly (a dashboard upload) or through the WhatsApp message it arrived on. */
async function attachmentBelongsTo(client, organizationId, attachmentId) {
  const found = await client.attachment.findFirst({
    where: { id: attachmentId, OR: [{ organizationId }, { message: { conversation: { organizationId } } }] },
    select: { id: true },
  });
  return Boolean(found);
}

/** Newest first. Revoked records are left out unless asked for. */
const listEvidence = (client, organizationId, { subjectType, subjectId, name, includeRevoked }) => client.evidence.findMany({
  where: { organizationId, subjectType, subjectId, ...(name ? { name } : {}), ...(includeRevoked ? {} : { revokedAt: null }) },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: PUBLIC, take: 200,
});

const markRevoked = (tx, organizationId, id) => tx.evidence.updateMany({
  where: { id, organizationId, revokedAt: null }, data: { revokedAt: new Date() },
});

const insertUpload = (client, organizationId, data) => client.attachment.create({
  data: { organizationId, attachmentType: data.attachmentType, storageKey: data.storageKey, originalFilename: data.originalFilename,
    mimeType: data.mimeType, fileSizeBytes: data.size, checksumSha256: data.checksum, publicUrl: data.url ?? null },
  select: { id: true, originalFilename: true, mimeType: true, fileSizeBytes: true },
});

module.exports = { insertEvidence, findEvidence, attachmentBelongsTo, listEvidence, markRevoked, insertUpload };
