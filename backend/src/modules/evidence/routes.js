const crypto = require('crypto');
const express = require('express');
const { ALLOWED_MIME_TYPES, MAX_FILE_BYTES, validateFile } = require('../../platform/evidence');
const { AppError, ValidationError, AuthorizationError } = require('../../platform/errors');
const { writeLimiter: defaultWriteLimiter } = require('../../platform/http/rateLimit');
const repo = require('./repo');

const defaultStorage = () => require('../../platform/storage').putObject;

// Only the file's name is taken from the client, and only to show it back: the stored key is generated.
const safeName = (raw) => String(raw ?? 'file').replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 120) || 'file';

/**
 * POST /api/evidence/upload: the body is the file itself (JPEG, PNG or PDF, 10 MB at most), the name comes in
 * X-Filename. The file is checked by its own bytes, stored, and an attachment row is returned to pass to
 * evidence.record. Needs a manager session.
 */
function createUploadRouter({ storage = defaultStorage(), writeLimiter = defaultWriteLimiter, db } = {}) {
  const router = express.Router();
  const body = express.raw({ type: ALLOWED_MIME_TYPES, limit: MAX_FILE_BYTES });

  router.post('/upload', writeLimiter, body, async (req, res) => {
    if (!req.actor || req.actor.type !== 'MANAGER') throw new AuthorizationError('You do not have permission to do that.');
    if (!Buffer.isBuffer(req.body)) throw new ValidationError('Send a JPEG, PNG or PDF file as the request body.');
    const { mimeType, extension } = validateFile({ buffer: req.body, declaredMime: req.headers['content-type'] });
    const key = `evidence/${req.actor.organizationId}/${crypto.randomUUID()}.${extension}`;
    const stored = await storage({ key, body: req.body, contentType: mimeType }).catch((err) => {
      if (/not configured/i.test(err.message)) {
        throw new AppError('File uploads are not set up on this server.', { code: 'STORAGE_NOT_CONFIGURED', status: 503, expose: true });
      }
      throw err;
    });
    const row = await repo.insertUpload(db ?? require('../../platform/db').prisma, req.actor.organizationId, {
      attachmentType: mimeType === 'application/pdf' ? 'DOCUMENT' : 'IMAGE', storageKey: key, originalFilename: safeName(req.headers['x-filename']),
      mimeType, size: req.body.length, checksum: crypto.createHash('sha256').update(req.body).digest('hex'), url: stored?.url,
    });
    res.status(201).json({ attachmentId: row.id, filename: row.originalFilename, mimeType: row.mimeType, size: Number(row.fileSizeBytes) });
  });

  return router;
}

module.exports = { createUploadRouter };
