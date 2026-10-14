/** The safety check after an accident or critical incident, and asking to cancel a trip (which the safety check can interrupt). */
const driverActions = require("./driverActions");
const { reply } = require("./reply");
const { setPendingAction, clearPendingAction } = require("./pending");
const { tryStartEventFlow } = require("./flows/deps");
const repo = require("./repo");

async function findOpenSafetyIncident(driverId) {
  const assignment = await driverActions.getDriverAssignment(driverId);
  if (!assignment) return null;

  return repo.findIncidentNeedingSafetyCheck(assignment.job_id);
}

const BACKUP_BUTTONS = [
  { id: "BACKUP_NEEDED", title: "Need backup vehicle" },
  { id: "BACKUP_NOT_NEEDED", title: "No backup needed" },
];

async function beginSafetyFlow(ctx, incident, cancelReason) {
  await setPendingAction(ctx.conversationId, {
    type: "AWAITING_LOCATION",
    incidentId: incident.id,
    cancelReason: cancelReason ?? null,
  });
  return await reply({
    ...ctx,
    body: `Before we close this out, there's still an open ${incident.incident_type.toLowerCase()} report on your trip. Please share your current location using the attachment menu in WhatsApp, and let me know about a backup vehicle:`,
    buttons: BACKUP_BUTTONS,
  });
}

async function beginCancellation(ctx, reason) {
  const incident = await findOpenSafetyIncident(ctx.d.id);
  if (incident) {
    const started = await tryStartEventFlow(ctx, "incident.safety.required", {
      incidentId: incident.id,
      incidentType: incident.incident_type,
      cancelReason: reason ?? null,
    });
    if (started) return { flow: "incident.safety" };
    return beginSafetyFlow(ctx, incident, reason);
  }

  const { job } = await driverActions.requestCancellation(
    ctx.d,
    reason,
    ctx.messageId,
    1,
  );
  await clearPendingAction(ctx.conversationId);
  return reply({
    ...ctx,
    body: `Done, your cancellation request for *${job.job_number}*${reason ? ` (reason: ${reason})` : ""} is with the manager now. The job stays with you until they decide.`,
  });
}

async function applySafetyCheck(
  ctx,
  pending,
  { lat = null, lng = null, backup = null },
) {
  if (lat != null && lng != null) {
    await driverActions.recordSafetyFollowup(ctx.d, { incidentId: pending.incidentId, lat: Number(lat), lng: Number(lng) });
  }
  if (backup) {
    await driverActions.recordSafetyFollowup(ctx.d, { incidentId: pending.incidentId, backupVehicle: backup });
  }

  const incident = await repo.findOpenIncidentDetails(pending.incidentId);

  if (!incident) {
    await clearPendingAction(ctx.conversationId);
    return reply({
      ...ctx,
      body: "That incident is already closed, so no further safety details are needed.",
    });
  }
  if (incident.location_lat == null) {
    await setPendingAction(ctx.conversationId, {
      ...pending,
      type: "AWAITING_LOCATION",
    });
    return reply({
      ...ctx,
      body: "Noted. Now share your current location using the attachment menu in WhatsApp so the manager knows where you are.",
    });
  }
  if (!incident.backup_vehicle) {
    await setPendingAction(ctx.conversationId, {
      ...pending,
      type: "AWAITING_BACKUP",
    });
    return reply({
      ...ctx,
      body: "Location received. Do you need a backup vehicle?",
      buttons: BACKUP_BUTTONS,
    });
  }

  // Mark the safety follow-up as collected: this is the evidence the
  // closure/cancellation safety policies check at the action boundary.
  await driverActions.recordSafetyFollowup(ctx.d, { incidentId: pending.incidentId, complete: true });

  const { job } = await driverActions.requestCancellation(
    ctx.d,
    pending.cancelReason ?? "Incident follow-up",
    ctx.messageId,
    1,
  );
  await clearPendingAction(ctx.conversationId);
  await driverActions.alertManagers(ctx.d, { jobId: job.id,
    type: "SAFETY_CHECK_COMPLETE",
    title: `Safety check complete for ${job.job_number}`,
    body: `Driver location: https://www.google.com/maps?q=${incident.location_lat},${incident.location_lng}. Backup vehicle: ${incident.backup_vehicle === "REQUESTED" ? "requested" : "not needed"}. Cancellation request is waiting for review.`,
    severity: "HIGH",
  });
  return reply({
    ...ctx,
    body: `Thanks, your location and backup details are recorded. Your cancellation request for *${job.job_number}* is with the manager now.`,
  });
}

module.exports = { findOpenSafetyIncident, BACKUP_BUTTONS, beginSafetyFlow, beginCancellation, applySafetyCheck };
