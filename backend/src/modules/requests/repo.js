/** Every database call of the requests module. Raw SQL where a shape joins several tables and keeps the old column text (quantity "3.000"). */
const { Prisma } = require('@prisma/client');

/** Requests in any of `statuses`, most recently reviewed first, at most 100. */
function listRequests(db, organizationId, statuses) {
  return db.$queryRaw(Prisma.sql`
    SELECT jr.id, jr.status, jr.requested_at, jr.reviewed_at,
           j.id AS job_id, j.job_number, j.cargo_description, j.pickup_at,
           j.current_status AS job_status,
           pl.name AS pickup, dl.name AS delivery,
           ji.planned_quantity::text AS quantity, ji.unit,
           d.id AS driver_id, d.name AS driver_name,
           wa.phone_e164 AS driver_phone, wa.verification_status
      FROM job_requests jr
      JOIN jobs j ON j.id = jr.job_id
      LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
      LEFT JOIN locations pl ON pl.id = ps.location_id
      LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
      LEFT JOIN locations dl ON dl.id = ds.location_id
      LEFT JOIN job_items ji ON ji.job_id = j.id
      JOIN drivers d ON d.id = jr.driver_id
      LEFT JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
     WHERE j.organization_id = ${organizationId}::uuid AND jr.status = ANY(${statuses}::text[])
     ORDER BY jr.reviewed_at DESC NULLS LAST, jr.requested_at DESC
     LIMIT 100`);
}

// Every decision a manager made on something a driver asked: a request, a cancellation, a closure. Requests have their own
// table; cancellations and closures are read back from the audit log.
const STOPS = Prisma.sql`
  LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
  LEFT JOIN locations pl ON pl.id = ps.location_id
  LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
  LEFT JOIN locations dl ON dl.id = ds.location_id`;
const LATEST_DRIVER = Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT ja.driver_id FROM job_assignments ja
     WHERE ja.job_id = j.id ORDER BY ja.assigned_at DESC LIMIT 1
  ) la ON true
  LEFT JOIN drivers d ON d.id = la.driver_id
  LEFT JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary`;

/** The merged decision feed, newest first, at most 150. */
function listHistory(db, organizationId) {
  const org = Prisma.sql`${organizationId}::uuid`;
  return db.$queryRaw(Prisma.sql`
    SELECT * FROM (
      SELECT
        'JOB_REQUEST'::text AS type,
        jr.id::text AS id,
        jr.status AS decision,
        COALESCE(jr.reviewed_at, jr.requested_at) AS decided_at,
        j.id AS job_id, j.job_number, j.cargo_description AS cargo,
        pl.name AS pickup, dl.name AS delivery,
        d.id AS driver_id, d.name AS driver_name,
        wa.phone_e164 AS driver_phone, wa.verification_status
      FROM job_requests jr
      JOIN jobs j ON j.id = jr.job_id
      ${STOPS}
      JOIN drivers d ON d.id = jr.driver_id
      LEFT JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
     WHERE j.organization_id = ${org} AND jr.status IN ('APPROVED', 'REJECTED')

     UNION ALL

     SELECT
       'CANCELLATION'::text AS type,
       al.id::text AS id,
       CASE al.action
         WHEN 'CANCELLATION_RELEASE' THEN 'APPROVED'
         WHEN 'CANCELLATION_CANCEL' THEN 'CANCELLED'
         WHEN 'CANCELLATION_REJECT' THEN 'REJECTED'
         ELSE al.action
       END AS decision,
       al.created_at AS decided_at,
       j.id AS job_id, j.job_number, j.cargo_description AS cargo,
       pl.name AS pickup, dl.name AS delivery,
       d.id AS driver_id, d.name AS driver_name,
       wa.phone_e164 AS driver_phone, wa.verification_status
     FROM audit_logs al
     JOIN jobs j ON j.id = al.entity_id AND al.entity_type = 'JOB'
     ${STOPS}
     ${LATEST_DRIVER}
     WHERE j.organization_id = ${org}
       AND al.action IN ('CANCELLATION_RELEASE', 'CANCELLATION_CANCEL', 'CANCELLATION_REJECT')

     UNION ALL

     SELECT
       'CLOSURE'::text AS type,
       al.id::text AS id,
       CASE al.action
         WHEN 'JOB_COMPLETED' THEN 'APPROVED'
         WHEN 'CORRECTION_REQUESTED' THEN 'REQUIRES_CORRECTION'
         ELSE al.action
       END AS decision,
       al.created_at AS decided_at,
       j.id AS job_id, j.job_number, j.cargo_description AS cargo,
       pl.name AS pickup, dl.name AS delivery,
       d.id AS driver_id, d.name AS driver_name,
       wa.phone_e164 AS driver_phone, wa.verification_status
     FROM audit_logs al
     JOIN jobs j ON j.id = al.entity_id AND al.entity_type = 'JOB'
     ${STOPS}
     ${LATEST_DRIVER}
     WHERE j.organization_id = ${org}
       AND al.action IN ('JOB_COMPLETED', 'CORRECTION_REQUESTED')
    ) combined
    ORDER BY decided_at DESC
    LIMIT 150`);
}

const findRequest = (tx, id) => tx.jobRequest.findUnique({ where: { id } });
const approveRequest = (tx, id, userId) => tx.jobRequest.update({ where: { id }, data: { status: 'APPROVED', reviewedByUserId: userId, reviewedAt: new Date() } });
const rejectRequest = (tx, id, userId, reason) => tx.jobRequest.update({ where: { id }, data: { status: 'REJECTED', reviewedByUserId: userId, reviewedAt: new Date(), cancelReason: reason } });

/** The driver asks for a job. Null when they already have a pending request for it. */
async function insertRequest(tx, jobId, driverId) {
  const rows = await tx.$queryRaw(Prisma.sql`
    INSERT INTO job_requests (job_id, driver_id, status) VALUES (${jobId}::uuid, ${driverId}::uuid, 'REQUESTED')
    ON CONFLICT DO NOTHING RETURNING id`);
  return rows[0]?.id ?? null;
}

/** Withdraw the driver's pending request. Returns { id, job_id }, or null when there is none. */
async function cancelPendingRequest(tx, driverId) {
  const rows = await tx.$queryRaw(Prisma.sql`
    UPDATE job_requests SET status = 'CANCELLED_BY_DRIVER', cancelled_at = now()
     WHERE driver_id = ${driverId}::uuid AND status = 'REQUESTED'
     RETURNING id, job_id`);
  return rows[0] ?? null;
}

/** A new offer waiting for the driver's answer. A driver can hold one live assignment, which the database enforces (Prisma code P2002). */
const createOffer = (tx, { jobId, driverId, assignedByUserId }) => tx.jobAssignment.create({
  data: { jobId, driverId, status: 'PENDING_DRIVER_ACCEPTANCE', assignedByUserId },
});

const findPendingOffer = (tx, jobId, driverId) => tx.jobAssignment.findFirst({ where: { jobId, driverId, status: 'PENDING_DRIVER_ACCEPTANCE' }, select: { id: true } });

/** An older offer to the driver is replaced by a newer one. */
const supersedePendingOffers = (tx, driverId) => tx.jobAssignment.updateMany({
  where: { driverId, status: 'PENDING_DRIVER_ACCEPTANCE' }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Superseded by a new job offer' },
});

const acceptOffer = (tx, id) => tx.jobAssignment.update({ where: { id }, data: { status: 'ASSIGNED', acceptedAt: new Date() } });
const declineOffer = (tx, id) => tx.jobAssignment.update({ where: { id }, data: { status: 'DECLINED' } });

/** The first acceptance wins: every other pending offer for the job closes. */
const closeOtherOffers = (tx, jobId, exceptId) => tx.jobAssignment.updateMany({
  where: { jobId, status: 'PENDING_DRIVER_ACCEPTANCE', id: { not: exceptId } },
  data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Job accepted by another driver' },
});

// ------------------------------------------------------------ what a driver can browse

const OPEN_JOB_COLUMNS = Prisma.sql`
  j.id, j.job_number, j.cargo_description, j.special_instructions, j.pickup_at, j.delivery_at,
  pl.name AS pickup, pl.address_line_1 AS pickup_address, pl.city AS pickup_city,
  dl.name AS delivery, dl.address_line_1 AS delivery_address, dl.city AS delivery_city,
  ji.planned_quantity::text AS quantity, ji.unit`;
const OPEN_JOB_JOINS = Prisma.sql`
  FROM jobs j
  LEFT JOIN job_stops ps ON ps.job_id = j.id AND ps.stop_type = 'PICKUP'
  LEFT JOIN locations pl ON pl.id = ps.location_id
  LEFT JOIN job_stops ds ON ds.job_id = j.id AND ds.stop_type = 'DELIVERY'
  LEFT JOIN locations dl ON dl.id = ds.location_id
  LEFT JOIN job_items ji ON ji.job_id = j.id`;

/** Open jobs picked up inside the window that this driver has not asked for and was not released from. At most 10, soonest first. */
const listAvailableJobs = (db, organizationId, driverId, hours) => db.$queryRaw(Prisma.sql`
  SELECT ${OPEN_JOB_COLUMNS} ${OPEN_JOB_JOINS}
   WHERE j.organization_id = ${organizationId}::uuid
     AND j.current_status IN ('PUBLISHED', 'DRIVER_REQUESTED')
     AND j.pickup_at >= now()
     AND j.pickup_at < now() + (${hours} * interval '1 hour')
     AND NOT EXISTS (SELECT 1 FROM job_requests jr WHERE jr.job_id = j.id AND jr.driver_id = ${driverId}::uuid AND jr.status = 'REQUESTED')
     AND NOT EXISTS (SELECT 1 FROM job_assignments ja WHERE ja.job_id = j.id AND ja.driver_id = ${driverId}::uuid AND ja.status = 'CANCELLED')
   ORDER BY j.pickup_at ASC
   LIMIT 10`);

const findDriverVehicle = (db, id) => db.driver.findUnique({ where: { id }, select: { id: true, name: true, vehicleType: true } });

async function findPendingRequestOf(db, driverId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT jr.id, jr.job_id, jr.requested_at, j.job_number
      FROM job_requests jr JOIN jobs j ON j.id = jr.job_id
     WHERE jr.driver_id = ${driverId}::uuid AND jr.status = 'REQUESTED'
     ORDER BY jr.requested_at DESC LIMIT 1`);
  return rows[0] ?? null;
}

// ------------------------------------------------------ what the driverMatching plugin reads

async function findJobForOffers(db, organizationId, jobId) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT j.organization_id, j.current_status, ${OPEN_JOB_COLUMNS} ${OPEN_JOB_JOINS}
     WHERE j.id = ${jobId}::uuid AND j.organization_id = ${organizationId}::uuid`);
  return rows[0] ?? null;
}

const listJobItems = (db, jobId) => db.$queryRaw(Prisma.sql`SELECT description, planned_quantity::text AS planned_quantity, unit FROM job_items WHERE job_id = ${jobId}::uuid`);

/** Active drivers with no job, a vehicle and a WhatsApp number, who were not taken off this job and have not already asked for it. */
const listOfferCandidates = (db, organizationId, jobId) => db.$queryRaw(Prisma.sql`
  SELECT d.id, d.name, d.vehicle_type, wa.phone_e164
    FROM drivers d
    JOIN driver_whatsapp_accounts wa ON wa.driver_id = d.id AND wa.is_primary
   WHERE d.organization_id = ${organizationId}::uuid AND d.status = 'ACTIVE' AND d.active_job_id IS NULL
     AND btrim(COALESCE(d.vehicle_type, '')) <> ''
     AND NOT EXISTS (SELECT 1 FROM job_assignments ja WHERE ja.job_id = ${jobId}::uuid AND ja.driver_id = d.id AND ja.status = 'CANCELLED')
     AND NOT EXISTS (SELECT 1 FROM job_requests jr WHERE jr.job_id = ${jobId}::uuid AND jr.driver_id = d.id AND jr.status = 'REQUESTED')`);

module.exports = {
  listRequests, listHistory, findRequest, approveRequest, rejectRequest, insertRequest, cancelPendingRequest, createOffer, findPendingOffer,
  supersedePendingOffers, acceptOffer, declineOffer, closeOtherOffers, listAvailableJobs, findDriverVehicle, findPendingRequestOf, findJobForOffers,
  listJobItems, listOfferCandidates,
};
