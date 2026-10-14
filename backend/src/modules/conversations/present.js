const { interpretationFields } = require('../../platform/interpretationFields');

// Who sent a message, as the dashboard shows it. A system message reads as the bot.
const KIND = { DRIVER: 'DRIVER', MANAGER: 'MANAGER', BOT: 'BOT', SYSTEM: 'BOT' };

const toConversationLine = (r) => ({
  id: r.id, driverId: r.driver_id ?? null, jobId: r.job_id ?? null, driver: r.driver, phone: r.phone ?? '', jobNumber: r.job_number, lastMessage: r.last_message ?? '', lastActivity: r.last_message_at,
  unread: r.unread_count, verified: r.verification_status === 'VERIFIED', aiPaused: r.ai_paused_at != null,
});

const toConversationDetail = (r) => ({
  id: r.id, status: r.status, driver: r.driver, phone: r.phone ?? '', jobNumber: r.job_number ?? 'No active job', verified: r.verification_status === 'VERIFIED',
  aiPaused: r.ai_paused_at != null,
});

function toMessages(messages, attachments) {
  const byMessage = new Map();
  for (const a of attachments) {
    const list = byMessage.get(a.message_id) ?? [];
    list.push({ id: a.id, type: a.attachment_type, filename: a.original_filename, mimeType: a.mime_type, publicUrl: a.public_url ?? null, createdAt: a.created_at });
    byMessage.set(a.message_id, list);
  }
  return messages.map((row) => ({
    id: row.id, kind: KIND[row.sender_type] ?? 'BOT', type: row.message_type, text: row.body_text ?? '', time: row.created_at, deliveryStatus: row.delivery_status,
    interpretation: row.primary_intent
      ? {
        intent: row.primary_intent, confidence: row.confidence_score != null ? Number(row.confidence_score) : 0,
        status: row.processing_status, fields: interpretationFields(row.structured_output),
      }
      : undefined,
    attachments: byMessage.get(row.id) ?? [],
  }));
}

module.exports = { toConversationLine, toConversationDetail, toMessages };
