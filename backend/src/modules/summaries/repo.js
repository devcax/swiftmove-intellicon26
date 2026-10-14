/** Every database call of the summaries module. */
const { Prisma } = require('@prisma/client');

const MAX_INPUT_MESSAGES = 40;

/** The driver's live assignment and its job's status, or null. */
async function findLiveAssignment(db, organizationId, driverId) {
  const [assignment] = await db.$queryRaw(Prisma.sql`
    SELECT ja.job_id, j.current_status
      FROM job_assignments ja JOIN jobs j ON j.id = ja.job_id
     WHERE ja.driver_id = ${driverId}::uuid AND j.organization_id = ${organizationId}::uuid
       AND ja.status IN ('ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW')
     ORDER BY ja.assigned_at DESC LIMIT 1`);
  return assignment ?? null;
}

async function findSummary(db, jobId) {
  const [row] = await db.$queryRaw(Prisma.sql`SELECT summary_text, updated_at FROM job_summaries WHERE job_id = ${jobId}::uuid`);
  return row ?? null;
}

async function findLastMessageId(db, conversationId) {
  const [last] = await db.$queryRaw(Prisma.sql`SELECT id FROM messages WHERE conversation_id = ${conversationId}::uuid ORDER BY created_at DESC LIMIT 1`);
  return last?.id ?? null;
}

/** Did the bot apply or flag something because of this message? */
async function messageChangedSomething(db, messageId) {
  const [applied] = await db.$queryRaw(Prisma.sql`
    SELECT 1 AS applied FROM workflow_events WHERE source_message_id = ${messageId}::uuid AND event_status IN ('APPLIED', 'REVIEW_REQUIRED') LIMIT 1`);
  return Boolean(applied);
}

async function countMessagesSince(db, conversationId, since) {
  const [{ c }] = await db.$queryRaw(Prisma.sql`SELECT count(*)::int AS c FROM messages WHERE conversation_id = ${conversationId}::uuid AND created_at > ${since}`);
  return c;
}

const listMessagesSince = (db, conversationId, since) => db.$queryRaw(Prisma.sql`
  SELECT sender_type, message_type, body_text FROM messages
   WHERE conversation_id = ${conversationId}::uuid AND created_at > ${since} ORDER BY created_at ASC LIMIT ${MAX_INPUT_MESSAGES}`);

const ensureSummary = (tx, jobId, driverId) => tx.$executeRaw(Prisma.sql`
  INSERT INTO job_summaries (job_id, driver_id) VALUES (${jobId}::uuid, ${driverId}::uuid) ON CONFLICT (job_id) DO NOTHING`);

const saveSummary = (tx, jobId, text, lastMessageId, newCount) => tx.$executeRaw(Prisma.sql`
  UPDATE job_summaries SET summary_text = ${text}, last_message_id = ${lastMessageId}::uuid, message_count = message_count + ${newCount}, updated_at = now()
   WHERE job_id = ${jobId}::uuid`);

module.exports = {
  findLiveAssignment, findSummary, findLastMessageId, messageChangedSomething, countMessagesSince, listMessagesSince, ensureSummary, saveSummary,
};
