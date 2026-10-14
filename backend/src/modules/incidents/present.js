const toIncidentLine = (r) => ({
  id: r.id, type: r.incident_type, severity: r.severity, status: r.status, description: r.description, reportedAt: r.created_at,
  resolvedAt: r.resolved_at, managerNotes: r.manager_notes, job: { id: r.job_id, jobNumber: r.job_number, status: r.job_status }, driver: r.driver_name,
});

const toIncidentDetail = (r, attachments) => ({
  ...toIncidentLine(r),
  sourceMessage: r.source_message ? { text: r.source_message, time: r.source_message_at } : null,
  location: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng, receivedAt: r.location_received_at } : null,
  backupVehicle: r.backup_vehicle ?? null,
  attachments: attachments.map((a) => ({ id: a.id, type: a.attachment_type, filename: a.original_filename, mimeType: a.mime_type, publicUrl: a.public_url ?? null })),
});

module.exports = { toIncidentLine, toIncidentDetail };
