/**
 * The records every job change leaves behind, shared by the modules that change jobs (jobs, requests, incidents, trip): the
 * status change with its audit row, the workflow event, the driver's contact details, the notice to managers. Each function
 * takes the runner's transaction first and writes inside it. Raw SQL where the old queries were, so the rows stay identical.
 */
const { Prisma } = require('@prisma/client');
const { recordAudit } = require('./audit');
const { prisma } = require('./db');
const { currentMilestoneRank } = require('./policy/context');

const LIVE_ASSIGNMENT = ['PENDING_DRIVER_ACCEPTANCE', 'ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW'];

const findJob = (tx, organizationId, id) => tx.job.findFirst({ where: { id, organizationId } });

/** Change the status and leave the audit row that says so. `actor` is { type, userId?, driverId? }. */
async function setStatus(tx, job, status, actor) {
  await tx.job.update({ where: { id: job.id }, data: { currentStatus: status } });
  await tx.auditLog.create({
    data: {
      organizationId: job.organizationId, actorType: actor.type ?? 'MANAGER', actorUserId: actor.userId ?? null, actorDriverId: actor.driverId ?? null,
      action: 'JOB_STATUS_CHANGED', entityType: 'JOB', entityId: job.id, beforeData: { status: job.currentStatus }, afterData: { status },
    },
  });
}

/** An audit row for something a person or the system did. */
const audit = (tx, { organizationId, actor, action, entityId, before, after, entityType = 'JOB' }) => tx.auditLog.create({
  data: {
    organizationId, actorType: actor.type, actorUserId: actor.userId ?? null, actorDriverId: actor.driverId ?? null, action, entityType, entityId,
    beforeData: before ?? undefined, afterData: after ?? undefined,
  },
});

const recordEvent = (tx, { jobId, assignmentId = null, messageId = null, eventType, status = 'APPLIED', data = {}, confidence = null }) => tx.workflowEvent.create({
  data: {
    jobId, assignmentId, sourceMessageId: messageId, eventType, eventStatus: status, eventData: data, confidenceScore: confidence,
    appliedAt: status === 'APPLIED' ? new Date() : null,
  },
});

const findLiveAssignment = (tx, jobId, statuses = LIVE_ASSIGNMENT) => tx.jobAssignment.findFirst({ where: { jobId, status: { in: statuses } } });

const clearActiveJob = (tx, driverId) => tx.driver.updateMany({ where: { id: driverId }, data: { activeJobId: null } });

/** The driver's name and WhatsApp number, in the shape the bot's messages take. */
async function findDriverContact(tx, driverId) {
  const rows = await tx.$queryRaw(Prisma.sql`
    SELECT d.id, d.name, wa.phone_e164 FROM drivers d
      LEFT JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
     WHERE d.id = ${driverId}::uuid`);
  return rows[0] ?? null;
}

/** The job as the bot's messages read it (the old snake_case row). */
const toBotJob = (job, status = job.currentStatus) => ({ id: job.id, job_number: job.jobNumber, organization_id: job.organizationId, current_status: status, cargo_description: job.cargoDescription });

/** A dashboard notification for every active manager and admin of the organization. */
async function notifyManagers(tx, { organizationId, jobId = null, incidentId = null, type, title, body, severity = 'INFO' }) {
  const managers = await tx.$queryRaw(Prisma.sql`
    SELECT u.id FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
     WHERE u.organization_id = ${organizationId}::uuid AND u.status = 'ACTIVE' AND r.code IN ('MANAGER', 'ADMIN')`);
  if (managers.length === 0) return;
  await tx.notification.createMany({
    data: managers.map((m) => ({ organizationId, jobId, incidentId, recipientUserId: m.id, notificationType: type, title, body, severity })),
  });
}

/** The driver's one live assignment (offered, assigned, started or in cancellation review), newest first. */
const findDriverLiveAssignment = (tx, organizationId, driverId) => tx.jobAssignment.findFirst({
  where: { driverId, status: { in: LIVE_ASSIGNMENT }, job: { organizationId } }, orderBy: { assignedAt: 'desc' },
});

const findDriverBrief = (tx, organizationId, id) => tx.driver.findFirst({ where: { id, organizationId }, select: { id: true, name: true } });
const findDriverName = async (tx, id) => (await tx.driver.findFirst({ where: { id }, select: { name: true } }))?.name ?? null;

/** The organization's oldest user: the person an assignment made on the system's behalf is recorded under. */
const oldestUserId = async (tx, organizationId) => (await tx.user.findFirst({ where: { organizationId }, orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id ?? null;

/** The job a driver now holds, and the open conversations that follow it. */
const setActiveJob = (tx, driverId, jobId) => tx.driver.update({ where: { id: driverId }, data: { activeJobId: jobId } });
const attachOpenConversations = (tx, driverId, jobId) => tx.conversation.updateMany({ where: { driverId, status: 'OPEN' }, data: { jobId } });

/** Is another driver's request for this job still waiting for a decision? */
const hasPendingRequests = async (tx, jobId) => Boolean(await tx.jobRequest.findFirst({ where: { jobId, status: 'REQUESTED' }, select: { id: true } }));

/** The job row as the old queries returned it (snake_case), or null. */
const findJobRow = async (tx, id) => (await tx.$queryRaw`SELECT * FROM jobs WHERE id = ${id}::uuid`)[0] ?? null;
const findAssignmentRow = async (tx, id) => (await tx.$queryRaw`SELECT * FROM job_assignments WHERE id = ${id}::uuid`)[0] ?? null;

/** The same reads on the global client, for code outside a transaction (the conversation reading what an action just changed). */
const jobRowById = (id) => findJobRow(prisma, id);
const assignmentRowById = (id) => findAssignmentRow(prisma, id);
const milestoneRankOf = (job) => currentMilestoneRank(prisma, job);

module.exports = {
  jobRowById, assignmentRowById, milestoneRankOf, findJobRow, findAssignmentRow, LIVE_ASSIGNMENT, findJob, setStatus, audit, recordEvent, findLiveAssignment, clearActiveJob, findDriverContact, toBotJob, notifyManagers, recordAudit,
  findDriverLiveAssignment, findDriverBrief, findDriverName, oldestUserId, setActiveJob, attachOpenConversations, hasPendingRequests,
};
