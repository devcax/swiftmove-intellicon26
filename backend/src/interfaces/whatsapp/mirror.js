/** Keep a copy of the photos and documents drivers send in file storage, because WhatsApp's own links expire. */
const { logger } = require("../../platform/logger");
const { randomUUID } = require("crypto");
const storage = require("../../platform/storage");
const { downloadMedia } = require("../../platform/whatsappClient");
const repo = require("./repo");

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
};

async function storeInboundMedia(messageId, scope = "general") {
  if (!storage.isConfigured()) return;

  for (const row of await repo.listUnmirroredAttachments(messageId)) {
    try {
      const { buffer } = await downloadMedia(row.storageKey);
      const ext = EXT_BY_MIME[row.mimeType] ?? "bin";
      const key = `media/${scope}/${randomUUID()}.${ext}`;
      const { url } = await storage.putObject({ key, body: buffer, contentType: row.mimeType ?? "application/octet-stream" });
      await repo.setAttachmentMirror(row.id, key, url);
    } catch (err) {
      logger.error({ err }, `R2 upload failed for attachment ${row.id}`);
    }
  }
}

module.exports = { storeInboundMedia };
