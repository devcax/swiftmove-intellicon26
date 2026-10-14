/**
 * Every database call of the trip module. The reads for a driver's own trip answer in the old snake_case row shape the WhatsApp side reads
 * (these are internal reads, not dashboard shapes). Each function takes the client (or the runner's transaction) first.
 */
const { Prisma } = require('@prisma/client');

/** The driver's one live assignment (with the job's number, status and cargo), or null. */
async function findDriverAssignment(db, driverId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT ja.*, j.job_number, j.current_status AS job_status, j.organization_id, j.cargo_description
      FROM job_assignments ja
      JOIN jobs j ON j.id = ja.job_id
     WHERE ja.driver_id = ${driverId}::uuid
       AND ja.status IN ('PENDING_DRIVER_ACCEPTANCE', 'ASSIGNED', 'ACTIVE', 'CANCELLATION_REVIEW')
     ORDER BY ja.assigned_at DESC
     LIMIT 1`);
  return rows[0] ?? null;
}

const findJobRow = async (db, id) => (await db.$queryRaw(Prisma.sql`SELECT * FROM jobs WHERE id = ${id}::uuid`))[0] ?? null;

/** The job of the driver's most recent assignment, live or not, or null. */
async function findLatestJobOfDriver(db, driverId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT j.* FROM job_assignments ja JOIN jobs j ON j.id = ja.job_id
     WHERE ja.driver_id = ${driverId}::uuid ORDER BY ja.assigned_at DESC LIMIT 1`);
  return rows[0] ?? null;
}

function listRecentJobs(db, driverId, limit) {
  return db.$queryRaw(Prisma.sql`
    SELECT j.id, j.job_number, j.current_status, j.cargo_description, pl.name AS pickup, dl.name AS delivery
      FROM job_assignments ja
      JOIN jobs j ON j.id = ja.job_id
      LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
      LEFT JOIN locations pl ON pl.id = ps.location_id
      LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
      LEFT JOIN locations dl ON dl.id = ds.location_id
     WHERE ja.driver_id = ${driverId}::uuid
     ORDER BY ja.assigned_at DESC
     LIMIT ${limit}`);
}

async function hasProofOfDelivery(db, jobId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT 1 FROM workflow_events
     WHERE job_id = ${jobId}::uuid AND event_type = 'DOCUMENT_RECEIVED' AND event_data ->> 'document_type' = 'POD'
     LIMIT 1`);
  return rows.length > 0;
}

/** The newest assignment of the job whose status is one of `statuses`, or null. */
const findJobAssignment = (db, jobId, statuses) => db.jobAssignment.findFirst({ where: { jobId, status: { in: statuses } }, orderBy: { assignedAt: 'desc' } });
const findAssignmentUnderReview = (tx, jobId) => tx.jobAssignment.findFirst({ where: { jobId, status: 'CANCELLATION_REVIEW' } });
/** Did this driver ever have this job? */
const driverHadJob = async (tx, jobId, driverId) => Boolean(await tx.jobAssignment.findFirst({ where: { jobId, driverId }, select: { id: true } }));

const startAssignment = (tx, id) => tx.jobAssignment.update({ where: { id }, data: { status: 'ACTIVE', startedAt: new Date() } });
const putUnderReview = (tx, id, reason) => tx.jobAssignment.update({ where: { id }, data: { status: 'CANCELLATION_REVIEW', cancellationReason: reason } });
const cancelAssignment = (tx, id, reason) => tx.jobAssignment.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), ...(reason ? { cancellationReason: reason } : {}) } });
const restoreAssignment = (tx, id, status) => tx.jobAssignment.update({ where: { id }, data: { status, cancellationReason: null } });

/** Change columns of the job (a stage's verified time, actual time, proof, delay reason). */
const updateJobColumns = (tx, jobId, data) => tx.job.update({ where: { id: jobId }, data });
/** The pickup really happened now, unless a time was already noted. */
const notePickupActual = (tx, jobId) => tx.$executeRaw(Prisma.sql`UPDATE jobs SET pickup_actual_at = COALESCE(pickup_actual_at, now()) WHERE id = ${jobId}::uuid`);

/** How the latest applied document verification of a stage was made (a code match, a manager), or null. */
async function findVerificationMethod(tx, jobId, stage) {
  const [row] = await tx.$queryRaw(Prisma.sql`
    SELECT event_data ->> 'method' AS m FROM workflow_events
     WHERE job_id = ${jobId}::uuid AND event_type = 'DOCUMENT_VERIFIED' AND event_status = 'APPLIED' AND event_data ->> 'stage' = ${stage}
     ORDER BY created_at DESC LIMIT 1`);
  return row?.m ?? null;
}

module.exports = {
  findDriverAssignment, findJobRow, findLatestJobOfDriver, listRecentJobs, hasProofOfDelivery, findJobAssignment, findAssignmentUnderReview, driverHadJob,
  startAssignment, putUnderReview, cancelAssignment, restoreAssignment, updateJobColumns, notePickupActual, findVerificationMethod,
};
