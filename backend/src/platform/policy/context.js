/**
 * Policy context for the action runner: what the checks read, loaded through the runner's Prisma transaction client (`tx`).
 * Rows come back from raw SELECTs, so they keep their snake_case column names (the checks were written against them).
 * `numeric` columns (incident coordinates) are Prisma Decimals; no check reads them.
 *
 * Every read filters by organization. Raw SQL is used because some reads need DISTINCT / ANY, which the model API does not express.
 */
const { Prisma } = require('@prisma/client');
const sm = require('../jobStateMachine');
const { evidenceSubjects, partitionEvidence, EMPTY } = require('./evidenceFacts');

const { MILESTONE_RANK, MILESTONE_EVENTS } = sm;

async function first(tx, query) {
  const rows = await tx.$queryRaw(query);
  return rows[0] ?? null;
}

/** Port of workflow.currentMilestoneRank. */
async function currentMilestoneRank(tx, job) {
  if (MILESTONE_RANK[job.current_status] != null) return MILESTONE_RANK[job.current_status];
  const stageRank = sm.rankOf(job.current_status);
  if (stageRank != null && stageRank >= MILESTONE_RANK.DELIVERED) return MILESTONE_RANK.DELIVERED;
  if (!sm.isSideStatus(job.current_status)) return 0;

  const rows = await tx.$queryRaw(Prisma.sql`
    SELECT event_type FROM workflow_events
     WHERE job_id = ${job.id}::uuid AND event_status = 'APPLIED' AND event_type = ANY(${MILESTONE_EVENTS}::text[])`);
  const best = rows.reduce((max, row) => Math.max(max, MILESTONE_RANK[row.event_type] ?? 0), 0);
  return Math.max(best, MILESTONE_RANK.IN_PROGRESS);
}

/** Port of workflow.getDriverAssignment: the driver's one live assignment. */
const getDriverAssignment = (tx, driverId) => first(tx, Prisma.sql`
  SELECT ja.*, j.job_number, j.current_status AS job_status, j.organization_id, j.cargo_description
    FROM job_assignments ja
    JOIN jobs j ON j.id = ja.job_id
   WHERE ja.driver_id = ${driverId}::uuid
     AND ja.status IN ('PENDING_DRIVER_ACCEPTANCE', 'ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW')
   ORDER BY ja.assigned_at DESC
   LIMIT 1`);

/** Facts checks read instead of querying: applied events, received document types, the live assignment. */
async function loadJobFacts(tx, jobId) {
  const events = await tx.$queryRaw(Prisma.sql`
    SELECT event_type, event_status, event_data ->> 'document_type' AS document_type
      FROM workflow_events
     WHERE job_id = ${jobId}::uuid AND (event_status = 'APPLIED' OR event_type = 'DOCUMENT_RECEIVED')`);
  const jobAssignment = await first(tx, Prisma.sql`
    SELECT started_at FROM job_assignments
     WHERE job_id = ${jobId}::uuid AND status IN ('ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW', 'COMPLETED')
     LIMIT 1`);
  return {
    appliedEventTypes: [...new Set(events.filter((r) => r.event_status === 'APPLIED').map((r) => r.event_type))],
    receivedDocumentTypes: [...new Set(events.filter((r) => r.event_type === 'DOCUMENT_RECEIVED').map((r) => r.document_type))],
    jobAssignment,
  };
}

/** Evidence for the driver, the job, or a PENDING reference, with snake_case rows like the legacy builder. */
async function loadEvidence(tx, ctx) {
  const subjects = evidenceSubjects(ctx);
  if (subjects.ids.length === 0) return EMPTY();
  const rows = await tx.$queryRaw(Prisma.sql`
    SELECT id, subject_type, subject_id, name, type, value, created_at, expires_at
      FROM evidence
     WHERE organization_id = ${ctx.organizationId}::uuid AND revoked_at IS NULL AND subject_id = ANY(${subjects.ids}::uuid[])
     ORDER BY created_at DESC, id DESC`);
  return partitionEvidence(rows, subjects);
}

const loadJob = (tx, id, organizationId) => first(tx, Prisma.sql`
  SELECT * FROM jobs WHERE id = ${id}::uuid AND organization_id = ${organizationId}::uuid`);

const loadDriver = (tx, id, organizationId) => first(tx, Prisma.sql`
  SELECT * FROM drivers WHERE id = ${id}::uuid AND organization_id = ${organizationId}::uuid`);

/** Same fields as the legacy builder: job, driver, assignment, releasedFromJob, openIncidents, currentRank, params. */
async function buildPolicyContext({
  tx, organizationId, action, actor, source = 'API', jobId = null, job = null, driverId = null, driver = null, params = {},
}) {
  const ctx = {
    organizationId, action, actor, source, now: new Date(), params: { source, ...params },
    job: job ?? null, driver: driver ?? null, assignment: null, releasedFromJob: false, openIncidents: [], currentRank: 0,
    appliedEventTypes: undefined, receivedDocumentTypes: undefined, jobAssignment: undefined, evidence: EMPTY(),
  };

  if (!ctx.job && jobId) ctx.job = await loadJob(tx, jobId, organizationId);
  if (!ctx.driver && driverId) ctx.driver = await loadDriver(tx, driverId, organizationId);
  if (ctx.driver) ctx.assignment = await getDriverAssignment(tx, ctx.driver.id);
  // Driver-centric actions resolve the job through the live assignment.
  if (!ctx.job && ctx.assignment) ctx.job = await loadJob(tx, ctx.assignment.job_id, organizationId);

  if (ctx.job && ctx.driver) {
    ctx.releasedFromJob = Boolean(await first(tx, Prisma.sql`
      SELECT 1 AS found FROM job_assignments
       WHERE job_id = ${ctx.job.id}::uuid AND driver_id = ${ctx.driver.id}::uuid AND status = 'CANCELLED'
       LIMIT 1`));
  }
  if (ctx.job) {
    ctx.openIncidents = await tx.$queryRaw(Prisma.sql`
      SELECT * FROM incidents
       WHERE job_id = ${ctx.job.id}::uuid AND status IN ('OPEN', 'UNDER_REVIEW')
       ORDER BY created_at DESC`);
    ctx.currentRank = await currentMilestoneRank(tx, ctx.job);
    Object.assign(ctx, await loadJobFacts(tx, ctx.job.id));
  }
  ctx.evidence = await loadEvidence(tx, ctx);
  return ctx;
}

module.exports = { buildPolicyContext, currentMilestoneRank, loadJobFacts };
