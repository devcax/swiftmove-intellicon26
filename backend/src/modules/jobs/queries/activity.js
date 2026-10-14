const { defineQuery } = require('../../../platform/registry');
const { idSchema } = require('../schemas');
const { interpretationFields } = require('../../../platform/interpretationFields');
const repo = require('../repo');

// Who sent a message, as the dashboard shows it. A system message reads as the bot.
const KIND = { DRIVER: 'DRIVER', MANAGER: 'MANAGER', BOT: 'BOT', SYSTEM: 'BOT' };

module.exports = defineQuery({
  name: 'job.activity',
  description: 'The conversation of the drivers of this job (with what the AI understood and any attachments) since it was first requested or assigned.',
  roles: ['ADMIN', 'MANAGER'],
  input: idSchema,
  handler: async ({ input, actor, db }) => {
    await repo.requireJob(db, actor.organizationId, input.id);
    const [messages, attachments] = await Promise.all([repo.listActivityMessages(db, input.id), repo.listActivityAttachments(db, input.id)]);

    const byMessage = new Map();
    for (const a of attachments) {
      const list = byMessage.get(a.message_id) ?? [];
      list.push({ id: a.id, type: a.attachment_type, filename: a.original_filename, mimeType: a.mime_type, publicUrl: a.public_url ?? null, createdAt: a.created_at });
      byMessage.set(a.message_id, list);
    }
    return {
      messages: messages.map((row) => ({
        id: row.id, kind: KIND[row.sender_type] ?? 'BOT', type: row.message_type, text: row.body_text ?? '', time: row.created_at, deliveryStatus: row.delivery_status,
        interpretation: row.primary_intent
          ? {
            intent: row.primary_intent, confidence: row.confidence_score != null ? Number(row.confidence_score) : 0,
            status: row.processing_status, fields: interpretationFields(row.structured_output),
          }
          : undefined,
        attachments: byMessage.get(row.id) ?? [],
      })),
    };
  },
});
