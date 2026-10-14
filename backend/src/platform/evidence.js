/**
 * Generic evidence storage helpers. Evidence is proof that something happened (a document, a confirmation, a note,
 * a location, a manager's approval) recorded against a driver or a job, or against a PENDING reference when the thing
 * it will belong to does not exist yet (a birth certificate collected before the driver is created).
 *
 * Append-only: a new record supersedes an older one. The only change ever made to a row is revoke, which sets revoked_at.
 */
const { prisma } = require('./db');
const { ValidationError } = require('./errors');

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

const SIGNATURES = [
  { mime: 'image/jpeg', extension: 'jpg', matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png', extension: 'png',
    matches: (b) => b.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => b[i] === byte),
  },
  { mime: 'application/pdf', extension: 'pdf', matches: (b) => b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-' },
];

const ALLOWED_MIME_TYPES = SIGNATURES.map((s) => s.mime);

/**
 * Accept only JPEG, PNG or PDF up to 10 MB, judged by the file's own first bytes. The declared type must agree
 * with what the bytes say, so a script renamed to .png is refused.
 */
function validateFile({ buffer, declaredMime }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ValidationError('The file is empty.');
  if (buffer.length > MAX_FILE_BYTES) throw new ValidationError('The file is too large (10 MB at most).');
  const detected = SIGNATURES.find((signature) => signature.matches(buffer));
  if (!detected) throw new ValidationError('Only JPEG, PNG or PDF files are accepted.');
  if (declaredMime && declaredMime !== detected.mime) {
    throw new ValidationError('The file does not match the type it was sent as.');
  }
  return { mimeType: detected.mime, extension: detected.extension };
}

/**
 * Re-link evidence collected under a PENDING reference to the record that now exists. Call it inside the creating
 * action's transaction, so the evidence and the record appear together or not at all. Returns how many rows moved.
 */
async function attachEvidence(tx, { organizationId, evidenceRef, subjectType, subjectId }) {
  const moved = await tx.evidence.updateMany({
    where: { organizationId, subjectType: 'PENDING', subjectId: evidenceRef },
    data: { subjectType, subjectId },
  });
  return moved.count;
}

/** Delete PENDING evidence that nobody attached within 24 hours. */
async function purgePendingEvidence(client = prisma, { organizationId, now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - PENDING_TTL_MS);
  const result = await client.evidence.deleteMany({
    where: { subjectType: 'PENDING', createdAt: { lt: cutoff }, ...(organizationId ? { organizationId } : {}) },
  });
  return result.count;
}

module.exports = { validateFile, attachEvidence, purgePendingEvidence, MAX_FILE_BYTES, PENDING_TTL_MS, ALLOWED_MIME_TYPES };
