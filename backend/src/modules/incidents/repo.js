/** Every database call of the incidents module. Raw SQL where a shape joins several tables and keeps the old column types. */
const { Prisma } = require('@prisma/client');

/** Newest first, at most 200. `statuses` and `severities` are optional filters. */
function listIncidents(db, organizationId, { statuses = null, severities = null } = {}) {
  const conditions = [Prisma.sql`j.organization_id = ${organizationId}::uuid`];
  if (statuses) conditions.push(Prisma.sql`i.status = ANY(${statuses}::text[])`);
  if (severities) conditions.push(Prisma.sql`i.severity = ANY(${severities}::text[])`);
  return db.$queryRaw(Prisma.sql`
    SELECT i.id, i.incident_type, i.severity, i.status, i.description, i.created_at,
           i.resolved_at, i.manager_notes,
           j.id AS job_id, j.job_number, j.current_status AS job_status,
           d.name AS driver_name
      FROM incidents i
      JOIN jobs j ON j.id = i.job_id
      JOIN drivers d ON d.id = i.reported_by_driver_id
     WHERE ${Prisma.join(conditions, ' AND ')}
     ORDER BY i.created_at DESC
     LIMIT 200`);
}

/** One incident with its job, driver and the message it came from, or undefined. */
async function findIncident(db, organizationId, id) {
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT i.*, i.location_lat::float8 AS lat, i.location_lng::float8 AS lng, j.job_number, j.current_status AS job_status, d.name AS driver_name,
           m.body_text AS source_message, m.created_at AS source_message_at
      FROM incidents i
      JOIN jobs j ON j.id = i.job_id
      JOIN drivers d ON d.id = i.reported_by_driver_id
      LEFT JOIN messages m ON m.id = i.source_message_id
     WHERE i.id = ${id}::uuid AND j.organization_id = ${organizationId}::uuid`);
  return rows[0];
}

function listAttachments(db, incidentId) {
  return db.$queryRaw(Prisma.sql`
    SELECT a.id, a.attachment_type, a.original_filename, a.mime_type, a.public_url
      FROM incident_attachments ia JOIN attachments a ON a.id = ia.attachment_id
     WHERE ia.incident_id = ${incidentId}::uuid
     ORDER BY ia.created_at`);
}

/** An incident with the job it belongs to, as the old queries returned it (snake_case). */
async function findIncidentWithJob(tx, id) {
  const rows = await tx.$queryRaw`SELECT i.*, j.organization_id, j.current_status AS job_status, j.job_number FROM incidents i JOIN jobs j ON j.id = i.job_id WHERE i.id = ${id}::uuid`;
  return rows[0];
}

const insertIncident = (tx, data) => tx.incident.create({ data });
const attachPhoto = (tx, incidentId, attachmentId) => (attachmentId
  ? tx.incidentAttachment.createMany({ data: [{ incidentId, attachmentId }], skipDuplicates: true })
  : null);

const recordLocation = (tx, id, lat, lng) => tx.$executeRaw`UPDATE incidents SET location_lat = ${lat}, location_lng = ${lng}, location_received_at = now() WHERE id = ${id}::uuid`;
const setBackupVehicle = (tx, id, backupVehicle) => tx.incident.update({ where: { id }, data: { backupVehicle } });
/** Completing twice keeps the first time. */
const completeSafetyFollowup = (tx, id) => tx.$executeRaw`UPDATE incidents SET safety_followup_at = COALESCE(safety_followup_at, now()) WHERE id = ${id}::uuid`;

const resolveIncident = (tx, id, { status, managerNotes, userId }) => tx.incident.update({ where: { id }, data: { status, managerNotes, resolvedAt: new Date(), resolvedByUserId: userId } });
const setIncidentStatus = (tx, id, { status, managerNotes }) => tx.incident.update({ where: { id }, data: { status, managerNotes } });
const saveManagerNotes = (tx, id, managerNotes) => tx.incident.update({ where: { id }, data: { managerNotes } });

module.exports = {
  listIncidents, findIncident, listAttachments, findIncidentWithJob, insertIncident, attachPhoto, recordLocation, setBackupVehicle, completeSafetyFollowup,
  resolveIncident, setIncidentStatus, saveManagerNotes,
};
