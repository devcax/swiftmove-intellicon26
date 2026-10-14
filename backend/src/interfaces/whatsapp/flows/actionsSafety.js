/** Flow actions for the safety check and for closing the trip. Each acts for the driver in the conversation. */
const stateMachine = require("../../../platform/jobStateMachine");
const driverActions = require("../driverActions");
const { reply } = require("../reply");
const { tryStartEventFlow } = require("./deps");
const { beginCancellation, beginSafetyFlow, findOpenSafetyIncident } = require("../safety");
const repo = require("../repo");

const actionsSafety = {
  async beginCancellation(ctx, params) {
    let reason = params.reason ?? null;
    if (params.details) {
      reason = `${reason}: ${String(params.details).slice(0, 500)}`;
    }
    return await beginCancellation(ctx, reason);
  },

  async safetyRecordLocation(ctx, params, data) {
    if (!data.incidentId) return;
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    await driverActions.recordSafetyFollowup(ctx.d, { incidentId: data.incidentId, lat, lng });
  },

  async safetyRecordBackup(ctx, params, data) {
    if (!data.incidentId) return;
    const backup = params.backup === "BACKUP_NEEDED" ? "REQUESTED" : "DECLINED";
    await driverActions.recordSafetyFollowup(ctx.d, { incidentId: data.incidentId, backupVehicle: backup });
  },

  async safetyComplete(ctx, _params, data) {
    const incident = await repo.findOpenIncidentDetails(data.incidentId);

    if (!incident) {
      return await reply({
        ...ctx,
        body: "That incident is already closed, so no further safety details are needed.",
      });
    }

    // Mark the safety follow-up as collected (see applySafetyCheck).
    await driverActions.recordSafetyFollowup(ctx.d, { incidentId: data.incidentId, complete: true });

    const { job } = await driverActions.requestCancellation(
      ctx.d,
      data.cancelReason ?? "Incident follow-up",
      ctx.messageId,
      1,
    );
    await driverActions.alertManagers(ctx.d, { jobId: job.id,
      type: "SAFETY_CHECK_COMPLETE",
      title: `Safety check complete for ${job.job_number}`,
      body: `Driver location: https://www.google.com/maps?q=${incident.location_lat},${incident.location_lng}. Backup vehicle: ${incident.backup_vehicle === "REQUESTED" ? "requested" : "not needed"}. Cancellation request is waiting for review.`,
      severity: "HIGH",
    });
    return await reply({
      ...ctx,
      body: `Thanks, your location and backup details are recorded. Your cancellation request for *${job.job_number}* is with the manager now.`,
    });
  },

  async endJobGuarded(ctx) {
    const { d, messageId } = ctx;

    const incident = await findOpenSafetyIncident(d.id);
    if (incident) {
      const started = await tryStartEventFlow(ctx, "incident.safety.required", {
        incidentId: incident.id,
        incidentType: incident.incident_type,
        cancelReason: "Driver asked to end the trip after an incident",
      });
      if (!started) {
        await beginSafetyFlow(
          ctx,
          incident,
          "Driver asked to end the trip after an incident",
        );
      }
      // The safety flow now owns the conversation; end this flow.
      return { end: true };
    }

    const assignment = await driverActions.getDriverAssignment(d.id);
    if (assignment?.status === "ACTIVE") {
      const job = await repo.findJobRow(assignment.job_id);
      if (job) {
        const rank = await driverActions.currentMilestoneRank(job);
        if (rank < stateMachine.MILESTONE_RANK.DELIVERED) {
          await reply({
            ...ctx,
            body: `I can't send *${job.job_number}* for closure yet because the delivery isn't confirmed. Please upload the delivery document so I can verify the delivery code and mark the job as delivered.`,
          });
          return;
        }
      }
    }

    const { job, alreadyRequested } = await driverActions.endJob(d, messageId, 1);
    if (alreadyRequested) {
      await reply({
        ...ctx,
        body: `*${job.job_number}* is already with the manager for closure, so I haven't sent it again. I'll let you know as soon as it's approved.`,
      });
      return;
    }
    const needsPod =
      /pod/i.test(job.special_instructions ?? "") &&
      !(await driverActions.hasPodDocument(job.id));
    const podWarning = needsPod
      ? " One last thing, this job needs a signed POD, so send a photo of it here when you can."
      : "";
    await reply({
      ...ctx,
      body: `Done. *${job.job_number}* has been sent to the manager for closure.${podWarning} I'll let you know once it's approved.`,
    });
  },
};

module.exports = { actionsSafety };
