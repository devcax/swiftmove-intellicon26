/**
 * Everything the WhatsApp interface reads or writes in the database, in one place, on Prisma.
 *
 * It writes only its own tables (conversations, messages, attachments, the AI's readings of messages). Business records (jobs,
 * incidents, assignments) are only ever read here, never written: a change to those goes through the action runner. Reads that join
 * several tables are raw SQL and answer in the old snake_case row shape the conversation code was written against; `numeric` columns
 * are cast to text so a quantity reads "18.000", as it always has.
 */
const { Prisma } = require('@prisma/client');
const { prisma } = require('../../platform/db');
const { notify } = require('../../modules/notifications/engine');

const sql = Prisma.sql;
const first = (rows) => rows[0] ?? null;

// ---------------------------------------------------------------- conversations

/** What the bot is waiting for in this conversation (a question it asked, a flow in progress), or null. */
async function getPendingAction(conversationId) {
  const row = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { pendingAction: true } });
  return row?.pendingAction ?? null;
}

const setPendingAction = (conversationId, action) => prisma.conversation.update({
  where: { id: conversationId }, data: { pendingAction: { ...action, created_at: new Date().toISOString() } },
});

const clearPendingAction = (conversationId) => prisma.conversation.update({ where: { id: conversationId }, data: { pendingAction: Prisma.DbNull } });

/** Clear the pending action only while it still belongs to this flow: an action may have replaced it with a newer one. */
const clearPendingActionOfFlow = (conversationId, pendingType, flowKey) => prisma.$executeRaw(sql`
  UPDATE conversations SET pending_action = NULL
   WHERE id = ${conversationId}::uuid AND pending_action->>'type' = ${pendingType} AND pending_action->>'flowKey' = ${flowKey}`);

async function isAiPaused(conversationId) {
  const row = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { aiPausedAt: true } });
  return row?.aiPausedAt != null;
}

/** The driver's oldest open conversation, or null. */
async function findOpenConversation(driverId) {
  const row = await prisma.conversation.findFirst({ where: { driverId, status: 'OPEN' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  return row?.id ?? null;
}

const createConversation = async ({ organizationId, driverId, jobId }) => (await prisma.conversation.create({ data: { organizationId, driverId, jobId }, select: { id: true } })).id;

const touchConversation = (conversationId) => prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

// ------------------------------------------------------------------- messages

/** Store what the bot is about to send; it is marked sent or failed once WhatsApp has answered. */
const insertBotMessage = async ({ conversationId, type, text }) => (await prisma.message.create({
  data: { conversationId, senderType: 'BOT', messageType: type, sourceType: 'BOT_MESSAGE', bodyText: text, deliveryStatus: 'QUEUED', sentAt: new Date() }, select: { id: true },
})).id;

const markMessageSent = (id, externalId) => prisma.message.update({ where: { id }, data: { deliveryStatus: 'SENT', ...(externalId ? { externalMessageId: externalId } : {}) } });

const markMessageFailed = (id) => prisma.message.update({ where: { id }, data: { deliveryStatus: 'FAILED' } });

/** The last few text and button messages, oldest first, for the model to read. */
async function listRecentMessages(conversationId, limit = 6) {
  const rows = await prisma.message.findMany({
    where: { conversationId, messageType: { in: ['TEXT', 'BUTTON'] } }, orderBy: { createdAt: 'desc' }, take: limit, select: { senderType: true, bodyText: true },
  });
  return rows.reverse().map((m) => ({ sender_type: m.senderType, body_text: m.bodyText }));
}

/** The text of a bot message we sent that the driver replied to (swiping a message to answer it). */
async function findBotMessageText(conversationId, externalMessageId) {
  const row = await prisma.message.findFirst({ where: { conversationId, externalMessageId, senderType: 'BOT' }, select: { bodyText: true } });
  return row?.bodyText ?? null;
}

const setMessageText = (id, text) => prisma.message.update({ where: { id }, data: { bodyText: text } });

/** A reading of a driver's message by the AI. A message is read once; a second reading is ignored. */
const storeInterpretation = (data) => prisma.aiInterpretation.createMany({ data: [data], skipDuplicates: true });

// ---------------------------------------------------------------- attachments

const findAudioAttachment = (messageId) => prisma.attachment.findFirst({
  where: { messageId, attachmentType: 'AUDIO' }, orderBy: { createdAt: 'desc' }, select: { id: true, storageKey: true, mimeType: true, transcriptionText: true },
});

const saveTranscript = (attachmentId, transcript) => prisma.attachment.update({ where: { id: attachmentId }, data: { transcriptionText: transcript } });

const listMessageAttachments = (messageId) => prisma.attachment.findMany({
  where: { messageId }, orderBy: { createdAt: 'asc' }, select: { id: true, attachmentType: true, originalFilename: true },
});

const findFirstPicture = (messageId) => prisma.attachment.findFirst({
  where: { messageId, attachmentType: { in: ['IMAGE', 'DOCUMENT'] } }, orderBy: { createdAt: 'asc' }, select: { id: true, publicUrl: true },
});

// ------------------------------------------------------- reads of business records

const findJobRow = async (id) => first(await prisma.$queryRaw(sql`SELECT * FROM jobs WHERE id = ${id}::uuid`));

/** The job a document is for: its codes and what has been verified. */
async function findJobForDocument(id) {
  return first(await prisma.$queryRaw(sql`
    SELECT id, job_number, current_status, pickup_code, delivery_code, pickup_verified_at, delivery_verified_at FROM jobs WHERE id = ${id}::uuid`));
}

/** The job a driver is applying for. */
async function findJobForApply(id) {
  return first(await prisma.$queryRaw(sql`
    SELECT id, organization_id, job_number, current_status, pickup_at, cargo_description FROM jobs WHERE id = ${id}::uuid`));
}

/** The job as the model is shown it: route, cargo and quantity. */
async function findJobView(id) {
  return first(await prisma.$queryRaw(sql`
    SELECT j.job_number, j.current_status AS status, j.cargo_description AS cargo, pl.name AS pickup, dl.name AS delivery, ji.planned_quantity::text AS quantity, ji.unit
      FROM jobs j
      LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
      LEFT JOIN locations pl ON pl.id = ps.location_id
      LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
      LEFT JOIN locations dl ON dl.id = ds.location_id
      LEFT JOIN job_items ji ON ji.job_id = j.id
     WHERE j.id = ${id}::uuid LIMIT 1`));
}

/** Did the bot send exactly this text in this conversation in the last ten minutes? (So a repeated event does not ask twice.) */
async function botSaidRecently(conversationId, text) {
  const row = await prisma.message.findFirst({
    where: { conversationId, senderType: 'BOT', bodyText: text, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } }, select: { id: true },
  });
  return Boolean(row);
}

async function findJobSummaryText(jobId) {
  const row = first(await prisma.$queryRaw(sql`SELECT summary_text FROM job_summaries WHERE job_id = ${jobId}::uuid`));
  return row?.summary_text || null;
}

/** The open accident or critical incident of the job that still lacks its safety follow-up. */
async function findIncidentNeedingSafetyCheck(jobId) {
  return first(await prisma.$queryRaw(sql`
    SELECT id, incident_type FROM incidents
     WHERE job_id = ${jobId}::uuid AND status IN ('OPEN', 'UNDER_REVIEW') AND (incident_type = 'ACCIDENT' OR severity = 'CRITICAL') AND safety_followup_at IS NULL
     ORDER BY created_at DESC LIMIT 1`));
}

/** What the driver has told us about an open incident so far (location, backup vehicle). */
async function findOpenIncidentDetails(incidentId) {
  return first(await prisma.$queryRaw(sql`
    SELECT location_lat, location_lng, backup_vehicle FROM incidents WHERE id = ${incidentId}::uuid AND status IN ('OPEN', 'UNDER_REVIEW')`));
}

/** The driver's last completed trips, newest first. */
const listCompletedTrips = (driverId) => prisma.$queryRaw(sql`
  SELECT j.job_number, j.cargo_description, j.completed_at, pl.name AS pickup, dl.name AS delivery
    FROM job_assignments ja
    JOIN jobs j ON j.id = ja.job_id
    LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
    LEFT JOIN locations pl ON pl.id = ps.location_id
    LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
    LEFT JOIN locations dl ON dl.id = ds.location_id
   WHERE ja.driver_id = ${driverId}::uuid AND ja.status = 'COMPLETED'
   ORDER BY COALESCE(ja.completed_at, j.completed_at) DESC NULLS LAST
   LIMIT 10`);

/** The id of the job in the conversation's organization with this number, or null. */
async function findJobIdByNumber(conversationId, jobNumber) {
  const row = first(await prisma.$queryRaw(sql`
    SELECT j.id FROM jobs j JOIN conversations c ON c.organization_id = j.organization_id
     WHERE c.id = ${conversationId}::uuid AND upper(j.job_number) = upper(${jobNumber}) LIMIT 1`));
  return row?.id ?? null;
}

// ------------------------------------------------------------ receiving a message

/** The active driver whose WhatsApp number (digits only) this is, or null. */
const findDriverByWhatsapp = async (digits) => first(await prisma.$queryRaw(sql`
  SELECT d.id AS driver_id, d.organization_id, d.active_job_id, d.name, d.vehicle_type
    FROM driver_whatsapp_accounts wa JOIN drivers d ON d.id = wa.driver_id
   WHERE regexp_replace(wa.phone_e164, '\\D', '', 'g') = ${digits} AND wa.verification_status <> 'REVOKED' AND d.status = 'ACTIVE'
   ORDER BY wa.is_primary DESC LIMIT 1`));

const findOpenConversationOf = (driverId) => prisma.conversation.findFirst({
  where: { driverId, status: 'OPEN' }, orderBy: { createdAt: 'asc' }, select: { id: true, jobId: true, aiPausedAt: true },
});

const setConversationJob = (conversationId, jobId) => prisma.conversation.update({ where: { id: conversationId }, data: { jobId } });

/** Store a message the driver sent. Null when a message with this WhatsApp id was stored before (WhatsApp delivers some twice). */
async function insertDriverMessage({ conversationId, externalMessageId, driverId, messageType, bodyText, timestamp }) {
  return prisma.$transaction(async (tx) => {
    const row = first(await tx.$queryRaw(sql`
      INSERT INTO messages (conversation_id, external_message_id, sender_type, sender_driver_id, message_type, source_type, body_text, delivery_status, received_at)
      VALUES (${conversationId}::uuid, ${externalMessageId}, 'DRIVER', ${driverId}::uuid, ${messageType}, 'DRIVER_MESSAGE', ${bodyText}, 'RECEIVED', to_timestamp(${Number(timestamp)}::bigint))
      ON CONFLICT (external_message_id) DO NOTHING
      RETURNING id`));
    if (!row) return null;
    const conversation = await tx.conversation.findUnique({ where: { id: conversationId }, select: { organizationId: true, jobId: true, driver: { select: { name: true } } } });
    await notify(tx, 'driverMessage', { organizationId: conversation.organizationId, jobId: conversation.jobId,
      messageId: row.id, conversationId, driverName: conversation.driver.name, bodyText, messageType });
    return row.id;
  });
}

const insertAttachment = ({ messageId, type, storageKey, filename, mimeType, transcript }) => prisma.attachment.create({
  data: { messageId, attachmentType: type, storageKey, originalFilename: filename, mimeType, transcriptionText: transcript },
});

/** WhatsApp reports a message as sent, delivered, read or failed: move it forward, never back. */
const updateDeliveryStatus = (externalId, status, timestamp) => prisma.$executeRaw(sql`
  UPDATE messages
     SET delivery_status = ${status}, sent_at = COALESCE(sent_at, to_timestamp(${Number(timestamp)}::bigint))
   WHERE external_message_id = ${externalId}
     AND CASE delivery_status WHEN 'QUEUED' THEN 1 WHEN 'SENT' THEN 2 WHEN 'DELIVERED' THEN 3 WHEN 'READ' THEN 4 ELSE 0 END
       <= CASE ${status} WHEN 'SENT' THEN 2 WHEN 'DELIVERED' THEN 3 WHEN 'READ' THEN 4 WHEN 'FAILED' THEN 2 ELSE 1 END`);

/** Photos, documents and videos of a message that have not been copied to file storage yet. */
const listUnmirroredAttachments = (messageId) => prisma.attachment.findMany({
  where: { messageId, attachmentType: { in: ['IMAGE', 'DOCUMENT', 'VIDEO'] }, r2Key: null }, select: { id: true, attachmentType: true, storageKey: true, mimeType: true },
});

const setAttachmentMirror = (id, key, url) => prisma.attachment.update({ where: { id }, data: { r2Key: key, publicUrl: url } });

// ------------------------------------------------- what the AI read from a photo

const findAttachmentForVision = (id) => prisma.attachment.findUnique({ where: { id }, select: { id: true, storageKey: true, mimeType: true, vision: true } });

/** Keep the AI's classification of a photo with it, so the same photo is not classified twice. */
const saveVision = (id, classification) => prisma.attachment.update({ where: { id }, data: { vision: classification } });

/** Add the codes read from a document to what is already kept for the photo. */
const saveCodeExtraction = (id, extraction) => prisma.$executeRaw(sql`
  UPDATE attachments SET vision = COALESCE(vision, '{}'::jsonb) || jsonb_build_object('code_extraction', ${JSON.stringify(extraction)}::jsonb) WHERE id = ${id}::uuid`);

module.exports = {
  findAttachmentForVision, saveVision, saveCodeExtraction,
  findDriverByWhatsapp, botSaidRecently, findOpenConversationOf, setConversationJob, insertDriverMessage, insertAttachment, updateDeliveryStatus, listUnmirroredAttachments, setAttachmentMirror,
  getPendingAction, setPendingAction, clearPendingAction, clearPendingActionOfFlow, isAiPaused, findOpenConversation, createConversation, touchConversation,
  insertBotMessage, markMessageSent, markMessageFailed, listRecentMessages, findBotMessageText, setMessageText, storeInterpretation,
  findAudioAttachment, saveTranscript, listMessageAttachments, findFirstPicture,
  findJobRow, findJobForDocument, findJobForApply, findJobView, findJobSummaryText, findIncidentNeedingSafetyCheck, findOpenIncidentDetails, listCompletedTrips, findJobIdByNumber,
};
