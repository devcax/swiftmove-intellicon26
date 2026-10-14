/** What a driver reports: an incident (damage, shortage, a failed delivery, an accident or breakdown) or a document they sent. */
const driverActions = require("../driverActions");
const { reply } = require("../reply");

async function damageReported(candidate, ctx, { d, messageId, data, confidence }) {
  const map = {
    DAMAGE_REPORTED: { type: "DAMAGE", eventType: "DAMAGE_REPORTED" },
    SHORTAGE_REPORTED: { type: "SHORTAGE", eventType: "SHORTAGE_REPORTED" },
    FAILED_DELIVERY: { type: "REFUSAL", eventType: "FAILED_DELIVERY" },
    INCIDENT_REPORTED: {
      type: data.incident_type,
      eventType: "INCIDENT_REPORTED",
    },
  }[candidate.intent];
  const description =
    data.description ??
    data.reason ??
    `${candidate.intent.replace(/_/g, " ").toLowerCase()} reported by driver`;
  const { job, incidentType, severity, alreadyReported } =
    await driverActions.reportIncident(d, {
      incidentType: map.type,
      severity: data.severity,
      description,
      data,
      messageId,
      confidence,
      eventType: map.eventType,
    });
  const emergencyLine =
    severity === "CRITICAL"
      ? " If anyone is hurt or in danger, call emergency services first, then update me."
      : "";
  return await reply({
    ...ctx,
    body: alreadyReported
      ? `An open ${incidentType.toLowerCase()} report already exists for *${job.job_number}*, so I have not created another one.${emergencyLine} If anything changed, send me the details or a photo and I will add it to the existing report.`
      : `I've logged the ${incidentType.toLowerCase()} on *${job.job_number}* and alerted the manager (severity ${severity}).${emergencyLine} If it's safe, send me a photo of the situation. Stay safe, I'm right here if anything changes.`,
  });
}

async function documentReceived(candidate, ctx, { d, messageId, data, confidence }) {
  if (ctx.document?.linked || ctx.document?.confirmation) {
    return await reply({ ...ctx, body: ctx.document.confirmation });
  }
  return await reply({
    ...ctx,
    body: "Send the photo or document right here and I'll attach it to your job. ",
  });
}

const reportIntents = {
  DAMAGE_REPORTED: damageReported,
  SHORTAGE_REPORTED: damageReported,
  FAILED_DELIVERY: damageReported,
  INCIDENT_REPORTED: damageReported,
  DOCUMENT_RECEIVED: documentReceived,
};

module.exports = { reportIntents };
