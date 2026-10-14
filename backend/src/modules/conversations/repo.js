/** Every database call of the conversations module. Raw SQL where a shape joins several tables. */
const { Prisma } = require('@prisma/client');
const { prisma } = require('../../platform/db');

/** Open conversations, most recent activity first, with the last message and the unread count. */
function listOpen(db, organizationId) {
  return db.$queryRaw(Prisma.sql`
    SELECT c.id, d.id AS driver_id, c.job_id,
           d.name                                       AS driver,
           wa.phone_e164                                AS phone,
           wa.verification_status                       AS verification_status,
           COALESCE(j.job_number, 'No active job')      AS job_number,
           (SELECT m.body_text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
           (SELECT COUNT(*)::int FROM messages m
             WHERE m.conversation_id = c.id AND m.sender_type = 'DRIVER'
               AND m.created_at > COALESCE(c.manager_last_read_at, c.created_at)) AS unread_count,
           c.last_message_at,
           c.ai_paused_at
      FROM conversations c
      JOIN drivers d ON d.id = c.driver_id
      LEFT JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
      LEFT JOIN jobs j ON j.id = c.job_id
     WHERE c.organization_id = ${organizationId}::uuid AND c.status = 'OPEN'
     ORDER BY c.last_message_at DESC NULLS LAST`);
}

async function findHeader(db, organizationId, id) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT c.id, c.status, c.job_id, c.ai_paused_at, d.name AS driver, wa.phone_e164 AS phone, wa.verification_status, j.job_number
      FROM conversations c
      JOIN drivers d ON d.id = c.driver_id
      LEFT JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
      LEFT JOIN jobs j ON j.id = c.job_id
     WHERE c.id = ${id}::uuid AND c.organization_id = ${organizationId}::uuid`);
  return rows[0] ?? null;
}

/** Oldest first, at most 500, with what the AI understood. */
const listMessages = (db, id) => db.$queryRaw(Prisma.sql`
  SELECT m.id, m.sender_type, m.message_type, m.body_text, m.delivery_status, m.created_at,
         ai.primary_intent, ai.confidence_score, ai.structured_output, ai.processing_status
    FROM messages m
    LEFT JOIN ai_interpretations ai ON ai.message_id = m.id
   WHERE m.conversation_id = ${id}::uuid
   ORDER BY m.created_at ASC
   LIMIT 500`);

const listAttachments = (db, id) => db.$queryRaw(Prisma.sql`
  SELECT a.id, a.message_id, a.attachment_type, a.original_filename, a.mime_type, a.public_url, a.created_at
    FROM attachments a JOIN messages m ON m.id = a.message_id
   WHERE m.conversation_id = ${id}::uuid
   ORDER BY a.created_at ASC`);

/** The conversation's driver's primary WhatsApp number, or null (no number means a message cannot be sent). */
async function findSendTarget(db, organizationId, id) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT c.driver_id, wa.phone_e164
      FROM conversations c JOIN driver_whatsapp_accounts wa ON wa.driver_id = c.driver_id AND wa.is_primary
     WHERE c.id = ${id}::uuid AND c.organization_id = ${organizationId}::uuid`);
  return rows[0] ?? null;
}

const exists = async (db, organizationId, id) => Boolean(await db.conversation.findFirst({ where: { id, organizationId }, select: { id: true } }));

const markRead = (tx, id, readAt) => tx.conversation.update({ where: { id }, data: { managerLastReadAt: readAt } });
const setAiPaused = (tx, id, pausedAt) => tx.conversation.update({ where: { id }, data: { aiPausedAt: pausedAt } });
const touchLastMessage = (db, id) => db.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
const clearLastMessage = (tx, id) => tx.conversation.update({ where: { id }, data: { lastMessageAt: null } });
const deleteConversation = (tx, id) => tx.conversation.delete({ where: { id } });

const insertManagerMessage = (tx, conversationId, body) => tx.message.create({
  data: { conversationId, senderType: 'MANAGER', messageType: 'TEXT', sourceType: 'MANUAL_MANAGER_MESSAGE', bodyText: body, deliveryStatus: 'QUEUED', sentAt: new Date() },
});
const markMessageSent = (db, id, externalMessageId) => db.message.update({ where: { id }, data: { deliveryStatus: 'SENT', ...(externalMessageId ? { externalMessageId } : {}) } });
const markMessageFailed = (db, id) => db.message.update({ where: { id }, data: { deliveryStatus: 'FAILED' } });

/**
 * Delete a conversation's messages. Other records point at a message or its photo (a workflow event, an incident, a job's proof, an
 * AI reading, a confirmation); they are detached or removed first so the delete is allowed and nothing else is lost.
 */
async function deleteMessages(tx, conversationId) {
  const id = Prisma.sql`${conversationId}::uuid`;
  const messages = Prisma.sql`SELECT id FROM messages WHERE conversation_id = ${id}`;
  const attachments = Prisma.sql`SELECT id FROM attachments WHERE message_id IN (${messages})`;

  await tx.$executeRaw(Prisma.sql`UPDATE workflow_events SET source_message_id = NULL WHERE source_message_id IN (${messages})`);
  await tx.$executeRaw(Prisma.sql`UPDATE incidents SET source_message_id = NULL WHERE source_message_id IN (${messages})`);
  await tx.$executeRaw(Prisma.sql`DELETE FROM event_confirmations WHERE confirmation_message_id IN (${messages})`);
  await tx.$executeRaw(Prisma.sql`DELETE FROM ai_interpretations WHERE message_id IN (${messages})`);
  await tx.$executeRaw(Prisma.sql`UPDATE jobs SET pickup_proof_attachment_id = NULL WHERE pickup_proof_attachment_id IN (${attachments})`);
  await tx.$executeRaw(Prisma.sql`UPDATE jobs SET delivery_proof_attachment_id = NULL WHERE delivery_proof_attachment_id IN (${attachments})`);
  return tx.$executeRaw(Prisma.sql`DELETE FROM messages WHERE conversation_id = ${id}`);
}

module.exports = {
  client: prisma, listOpen, findHeader, listMessages, listAttachments, findSendTarget, exists, markRead, setAiPaused, touchLastMessage, clearLastMessage,
  deleteConversation, insertManagerMessage, markMessageSent, markMessageFailed, deleteMessages,
};
