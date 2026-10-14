/**
 * Every database call of the jobs module. Each function takes the client (the runner's `db`, a transaction, or the Prisma client) first and
 * filters by organization. The reads are raw SQL, because the dashboard's shapes join several tables and number columns must keep the text the old queries returned
 * (`planned_quantity` is numeric(12,3): "12.000", not 12), which the model API cannot express.
 */
const { Prisma } = require('@prisma/client');
const { NotFoundError } = require('../../platform/errors');
const { ID_SHAPE } = require('../../platform/http/ownership');
const { LIVE_STATUSES } = require('../../platform/jobStateMachine');

const NOT_FOUND = 'Job not found';

/** A job of another organization is reported exactly like one that does not exist. */
async function requireJob(db, organizationId, id) {
  if (!ID_SHAPE.test(id)) throw new NotFoundError(NOT_FOUND);
  const rows = await db.$queryRaw(Prisma.sql`SELECT id, created_at FROM jobs WHERE id = ${id}::uuid AND organization_id = ${organizationId}::uuid`);
  if (rows.length === 0) throw new NotFoundError(NOT_FOUND);
  return rows[0];
}

// The line shown for a job: its stops, its first item and the one assignment that counts (the finished one, else the live one).
const SUMMARY_SELECT = Prisma.sql`
  SELECT j.id, j.job_number, j.current_status, j.cargo_description, j.pickup_at, j.delivery_at, j.pickup_code, j.delivery_code,
         pl.name AS pickup, dl.name AS delivery,
         ji.planned_quantity::text AS quantity, ji.unit,
         d.name AS driver_name, ja.cancellation_reason,
         (SELECT ja3.status FROM job_assignments ja3
           WHERE ja3.job_id = j.id AND ja3.status = 'PENDING_DRIVER_ACCEPTANCE'
           LIMIT 1) AS assignment_status
    FROM jobs j
    LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
    LEFT JOIN locations pl ON pl.id = ps.location_id
    LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
    LEFT JOIN locations dl ON dl.id = ds.location_id
    LEFT JOIN job_items ji ON ji.job_id = j.id
    LEFT JOIN LATERAL (
      SELECT ja2.driver_id, ja2.cancellation_reason
        FROM job_assignments ja2
       WHERE ja2.job_id = j.id
         AND (
           j.current_status = 'COMPLETED'
           OR ja2.status IN ('ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW', 'COMPLETED')
         )
       ORDER BY
         CASE
           WHEN j.current_status = 'COMPLETED' AND ja2.status = 'COMPLETED' THEN 0
           WHEN ja2.status IN ('ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW') THEN 1
           ELSE 2
         END,
         ja2.completed_at DESC NULLS LAST,
         ja2.assigned_at DESC
       LIMIT 1
    ) ja ON true
    LEFT JOIN drivers d ON d.id = ja.driver_id`;

/** Newest first, at most 200. `statuses` and `search` are optional filters. */
function listJobs(db, organizationId, { statuses = null, search = null } = {}) {
  const conditions = [Prisma.sql`j.organization_id = ${organizationId}::uuid`];
  if (statuses) conditions.push(Prisma.sql`j.current_status = ANY(${statuses}::text[])`);
  if (search) {
    const like = `%${search}%`;
    conditions.push(Prisma.sql`(j.job_number ILIKE ${like} OR j.cargo_description ILIKE ${like})`);
  }
  return db.$queryRaw(Prisma.sql`${SUMMARY_SELECT} WHERE ${Prisma.join(conditions, ' AND ')} ORDER BY j.created_at DESC LIMIT 200`);
}

/** The summary line of one job, or null. */
async function findJobSummary(db, organizationId, jobId) {
  const rows = await db.$queryRaw(Prisma.sql`${SUMMARY_SELECT} WHERE j.id = ${jobId}::uuid AND j.organization_id = ${organizationId}::uuid`);
  return rows[0] ?? null;
}

/** Jobs in a live status, most recently active first, with the last event and the open incident count. */
function listLiveJobs(db, organizationId) {
  return db.$queryRaw(Prisma.sql`
    SELECT j.id, j.job_number, j.current_status, j.cargo_description, j.pickup_at, j.delivery_at,
           pl.name AS pickup, pl.address_line_1 AS pickup_address, pl.city AS pickup_city,
           dl.name AS delivery, dl.address_line_1 AS delivery_address, dl.city AS delivery_city,
           ji.planned_quantity::text AS quantity, ji.unit,
           d.name AS driver_name, wa.phone_e164 AS driver_phone, ja.cancellation_reason,
           le.event_type AS last_event_type, le.created_at AS last_event_at,
           progress.previous_status, progress.changed_at AS milestone_changed_at,
           (SELECT count(*)::int FROM incidents i WHERE i.job_id = j.id AND i.status <> 'RESOLVED') AS open_incidents
      FROM jobs j
      LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
      LEFT JOIN locations pl ON pl.id = ps.location_id
      LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
      LEFT JOIN locations dl ON dl.id = ds.location_id
      LEFT JOIN job_items ji ON ji.job_id = j.id
      LEFT JOIN job_assignments ja ON ja.job_id = j.id
           AND ja.status IN ('PENDING_DRIVER_ACCEPTANCE', 'ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW')
      LEFT JOIN drivers d ON d.id = ja.driver_id
      LEFT JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
      LEFT JOIN LATERAL (
        SELECT we.event_type, we.created_at
          FROM workflow_events we
         WHERE we.job_id = j.id
         ORDER BY we.created_at DESC
         LIMIT 1
      ) le ON TRUE
      LEFT JOIN LATERAL (
        SELECT a.before_data ->> 'status' AS previous_status, a.created_at AS changed_at
          FROM audit_logs a
         WHERE a.organization_id = j.organization_id AND a.entity_type = 'JOB' AND a.entity_id = j.id
           AND a.action = 'JOB_STATUS_CHANGED' AND a.after_data ->> 'status' = j.current_status
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT 1
      ) progress ON TRUE
     WHERE j.organization_id = ${organizationId}::uuid AND j.current_status = ANY(${LIVE_STATUSES}::text[])
     ORDER BY le.created_at DESC NULLS LAST, j.created_at DESC
     LIMIT 200`);
}

/** The job row with its stops, items and latest assignment, or null. */
async function findJobDetail(db, organizationId, jobId) {
  const jobs = await db.$queryRaw(Prisma.sql`SELECT * FROM jobs WHERE id = ${jobId}::uuid AND organization_id = ${organizationId}::uuid`);
  if (jobs.length === 0) return null;
  const stops = await db.$queryRaw(Prisma.sql`
    SELECT js.stop_type, js.stop_sequence, l.name, l.address_line_1, l.city, l.latitude::float8 AS latitude, l.longitude::float8 AS longitude
      FROM job_stops js JOIN locations l ON l.id = js.location_id
     WHERE js.job_id = ${jobId}::uuid ORDER BY js.stop_sequence`);
  const items = await db.$queryRaw(Prisma.sql`
    SELECT description, planned_quantity::text AS planned_quantity, unit FROM job_items WHERE job_id = ${jobId}::uuid`);
  const assignments = await db.$queryRaw(Prisma.sql`
    SELECT ja.id, ja.status, ja.assigned_at, ja.accepted_at, ja.started_at,
           ja.completion_submitted_at, ja.cancellation_reason,
           d.id AS driver_id, d.name AS driver_name, wa.phone_e164 AS driver_phone
      FROM job_assignments ja
      JOIN drivers d ON d.id = ja.driver_id
      LEFT JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
     WHERE ja.job_id = ${jobId}::uuid
     ORDER BY ja.assigned_at DESC LIMIT 1`);
  return { job: jobs[0], stops, items, assignment: assignments[0] ?? null };
}

/** Oldest first, at most 300. */
function listTimeline(db, jobId) {
  return db.$queryRaw(Prisma.sql`
    SELECT we.id, we.event_type, we.event_status, we.event_data, we.confidence_score::float8 AS confidence_score,
           we.applied_at, we.created_at, m.body_text AS source_message
      FROM (SELECT * FROM workflow_events WHERE job_id = ${jobId}::uuid ORDER BY created_at DESC, id DESC LIMIT 300) we
      LEFT JOIN messages m ON m.id = we.source_message_id
     ORDER BY we.created_at ASC, we.id ASC`);
}

// What the drivers of this job said, from the moment it was first requested or assigned (else created) onwards.
const activityScope = (jobId) => Prisma.sql`
  WITH cutoff AS (
    SELECT COALESCE(
      LEAST(
        (SELECT MIN(requested_at) FROM job_requests WHERE job_id = ${jobId}::uuid),
        (SELECT MIN(assigned_at) FROM job_assignments WHERE job_id = ${jobId}::uuid)
      ),
      (SELECT created_at FROM jobs WHERE id = ${jobId}::uuid)
    ) AS t
  ),
  job_drivers AS (
    SELECT driver_id FROM job_requests WHERE job_id = ${jobId}::uuid
    UNION
    SELECT driver_id FROM job_assignments WHERE job_id = ${jobId}::uuid
  )`;

const listActivityMessages = (db, jobId) => db.$queryRaw(Prisma.sql`
  ${activityScope(jobId)}
  SELECT m.id, m.sender_type, m.message_type, m.body_text, m.delivery_status, m.created_at,
         ai.primary_intent, ai.confidence_score::float8 AS confidence_score, ai.processing_status, ai.structured_output
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN job_drivers jd ON jd.driver_id = c.driver_id
    CROSS JOIN cutoff
    LEFT JOIN ai_interpretations ai ON ai.message_id = m.id
   WHERE m.created_at >= cutoff.t
   ORDER BY m.created_at ASC
   LIMIT 500`);

const listActivityAttachments = (db, jobId) => db.$queryRaw(Prisma.sql`
  ${activityScope(jobId)}
  SELECT a.id, a.message_id, a.attachment_type, a.original_filename, a.mime_type, a.public_url, a.created_at
    FROM attachments a
    JOIN messages m ON m.id = a.message_id
    JOIN conversations c ON c.id = m.conversation_id
    JOIN job_drivers jd ON jd.driver_id = c.driver_id
    CROSS JOIN cutoff
   WHERE m.created_at >= cutoff.t
   ORDER BY a.created_at ASC`);

// ------------------------------------------------------------------ writes

/** Take the first location of this name (ignoring case), or add it. */
async function findOrCreateLocation(tx, organizationId, name, coordinates = null) {
  const existing = await tx.location.findFirst({ where: { organizationId, name: { equals: name, mode: 'insensitive' }, ...(coordinates ?? {}) }, select: { id: true } });
  if (existing) return existing.id;
  const created = await tx.location.create({ data: { organizationId, name, addressLine1: name, city: 'Sri Lanka', country: 'Sri Lanka', ...(coordinates ?? {}) }, select: { id: true } });
  return created.id;
}

/** A new job. A job number already in use is a Prisma unique violation (code P2002), left for the caller to turn into its message. */
const insertJob = (tx, data) => tx.job.create({ data });
const insertItem = (tx, data) => tx.jobItem.create({ data });
const insertStops = (tx, data) => tx.jobStop.createMany({ data });

const updateJobFields = (tx, id, data) => tx.job.update({ where: { id }, data });
const updateStop = (tx, jobId, stopType, data) => tx.jobStop.updateMany({ where: { jobId, stopType }, data });
/** Change the job's first item, or add one. */
async function saveFirstItem(tx, jobId, data) {
  const item = await tx.jobItem.findFirst({ where: { jobId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  return item ? tx.jobItem.update({ where: { id: item.id }, data }) : tx.jobItem.create({ data: { jobId, ...data } });
}

const markCompleted = (tx, jobId, userId) => tx.job.update({ where: { id: jobId }, data: { completedAt: new Date(), completedByUserId: userId } });
const republish = (tx, job) => tx.job.update({ where: { id: job.id }, data: { currentStatus: 'PUBLISHED', publishedAt: job.publishedAt ?? new Date() } });
const markCancelled = (tx, jobId) => tx.job.update({ where: { id: jobId }, data: { currentStatus: 'CANCELLED' } });

/** Requests nobody decided no longer make sense. */
const expireOpenRequests = (tx, jobId) => tx.jobRequest.updateMany({ where: { jobId, status: 'REQUESTED' }, data: { status: 'EXPIRED' } });
const cancelAssignment = (tx, id, reason) => tx.jobAssignment.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason } });
const completeAssignment = (tx, id) => tx.jobAssignment.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
const cancelLiveAssignments = (tx, jobId, liveStatuses) => tx.jobAssignment.updateMany({ where: { jobId, status: { in: liveStatuses } }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
const clearActiveJobOfDrivers = (tx, jobId) => tx.driver.updateMany({ where: { activeJobId: jobId }, data: { activeJobId: null } });

/** Capture current drivers and outstanding offers before their assignment records are deleted. */
async function listDeletionRecipients(tx, organizationId, jobId) {
  return tx.$queryRaw(Prisma.sql`
    SELECT DISTINCT d.id, d.name, wa.phone_e164
      FROM drivers d
      JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
     WHERE d.organization_id = ${organizationId}::uuid
       AND (d.active_job_id = ${jobId}::uuid OR EXISTS (
         SELECT 1 FROM job_assignments a WHERE a.job_id = ${jobId}::uuid AND a.driver_id = d.id
           AND a.status IN ('PENDING_DRIVER_ACCEPTANCE', 'ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW')
       ))`);
}

/** Remove a job with everything that points at it. Conversations stay, detached. */
async function deleteJobCascade(tx, jobId) {
  await clearActiveJobOfDrivers(tx, jobId);
  await tx.conversation.updateMany({ where: { jobId }, data: { jobId: null, pendingAction: Prisma.DbNull } });
  // An invite can live in a conversation that was never attached to this job. Clear only that pending invite.
  await tx.conversation.updateMany({ where: { OR: [
    { pendingAction: { path: ['job_id'], equals: jobId } },
    { pendingAction: { path: ['jobId'], equals: jobId } },
  ] }, data: { pendingAction: Prisma.DbNull } });
  await deleteTripRecords(tx, jobId);
  await tx.job.delete({ where: { id: jobId } });
}

async function deleteTripRecords(tx, jobId) {
  await tx.notification.deleteMany({ where: { jobId } });
  await tx.eventConfirmation.deleteMany({ where: { workflowEvent: { jobId } } });
  await tx.workflowEvent.deleteMany({ where: { jobId } });
  await tx.incident.deleteMany({ where: { jobId } });
  await tx.jobRequest.deleteMany({ where: { jobId } });
  await tx.jobAssignment.deleteMany({ where: { jobId } });
}

/** Wipe the trip history of a job, free the drivers who were on it, and put the job back as published with the codes given. */
async function resetJob(tx, jobId, { pickupCode, deliveryCode }) {
  const assignments = await tx.jobAssignment.findMany({ where: { jobId }, select: { driverId: true } });
  await tx.driver.updateMany({ where: { OR: [{ activeJobId: jobId }, { id: { in: assignments.map((a) => a.driverId) } }] }, data: { activeJobId: null } });
  await deleteTripRecords(tx, jobId);
  await tx.jobSummary.updateMany({ where: { jobId }, data: { summaryText: '', driverId: null, messageCount: 0, lastMessageId: null } });
  await tx.job.update({
    where: { id: jobId },
    data: {
      currentStatus: 'PUBLISHED', publishedAt: new Date(), completedAt: null, completedByUserId: null,
      pickupActualAt: null, pickupVerifiedAt: null, pickupDelayReason: null, pickupProofAttachmentId: null,
      deliveryActualAt: null, deliveryVerifiedAt: null, deliveryDelayReason: null, deliveryProofAttachmentId: null,
      pickupCode, deliveryCode,
    },
  });
}

/** The driver (or the timer) says the trip is done: note the time once. */
const noteCompletionSubmitted = (tx, assignmentId) => tx.$executeRaw`UPDATE job_assignments SET completion_submitted_at = COALESCE(completion_submitted_at, now()) WHERE id = ${assignmentId}::uuid`;
const setCompletionSubmitted = (tx, assignmentId) => tx.jobAssignment.update({ where: { id: assignmentId }, data: { completionSubmittedAt: new Date() } });

// ------------------------------------------------------- reads for the conversation and the timer

/** A job of the organization by the number a driver typed, as a row. */
async function findJobByNumber(db, organizationId, number, withPrefix) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT * FROM jobs WHERE organization_id = ${organizationId}::uuid AND (upper(job_number) = ${number} OR upper(job_number) = ${withPrefix}) LIMIT 1`);
  return rows[0] ?? null;
}

/** Delivered jobs with a driver still on them whose delivery was confirmed more than `minutes` ago. At most 25. */
async function listJobIdsDueForClosure(db, minutes) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT j.id FROM jobs j
     WHERE j.current_status IN ('DELIVERED', 'DELIVERED_WITH_EXCEPTION')
       AND EXISTS (SELECT 1 FROM workflow_events we WHERE we.job_id = j.id AND we.event_type = 'DELIVERED' AND we.event_status = 'APPLIED'
                      AND we.applied_at <= now() - (${minutes} * interval '1 minute'))
       AND EXISTS (SELECT 1 FROM job_assignments ja WHERE ja.job_id = j.id AND ja.status = 'ACTIVE')
     ORDER BY j.id LIMIT 25`);
  return rows.map((row) => row.id);
}

module.exports = {
  listDeletionRecipients,
  requireJob, listJobs, findJobSummary, listLiveJobs, findJobDetail, listTimeline, listActivityMessages, listActivityAttachments,
  findOrCreateLocation, insertJob, insertItem, insertStops, updateJobFields, updateStop, saveFirstItem, markCompleted, republish, markCancelled,
  expireOpenRequests, cancelAssignment, completeAssignment, cancelLiveAssignments, clearActiveJobOfDrivers, deleteJobCascade, resetJob,
  noteCompletionSubmitted, setCompletionSubmitted, findJobByNumber, listJobIdsDueForClosure,
};
