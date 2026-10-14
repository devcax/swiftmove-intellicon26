/** The flow action that saves what the driver just answered (a confirmation, a note, a location, a photo) as evidence the policies can ask for. */
const { logger } = require("../../../platform/logger");
const driverActions = require("../driverActions");
const repo = require("../repo");

const TYPES = ["CONFIRMATION", "TEXT", "LOCATION", "DOCUMENT"];

/**
 * What to record, from the step's params: `name` and `type`, and the answer under `text` (TEXT), `location` ({ lat, lng }, LOCATION)
 * or `photo` ({ messageId }, DOCUMENT); a CONFIRMATION needs none. Returns the evidence.record input, or null when the answer is not usable.
 */
async function evidenceInput(ctx, params, subjectType, subjectId) {
  const { name, type } = params;
  if (typeof name !== "string" || !TYPES.includes(type)) return null;
  const base = { subjectType, subjectId, name, type };
  if (type === "CONFIRMATION") return { ...base, value: { confirmed: true } };
  if (type === "TEXT") {
    const text = String(params.text ?? "").trim().slice(0, 500);
    return text ? { ...base, value: { text } } : null;
  }
  if (type === "LOCATION") {
    const lat = Number(params.location?.lat);
    const lng = Number(params.location?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { ...base, value: { lat, lng } } : null;
  }
  const attachment = params.photo?.messageId ? await repo.findFirstPicture(params.photo.messageId) : null;
  return attachment ? { ...base, attachmentId: attachment.id } : null;
}

const actionsEvidence = {
  /**
   * Save an answer as evidence for the driver (the default) or, with `subject: "JOB"`, for the job they are on. The driver's own chat is
   * trusted for both: it is recorded as the driver for themselves, and as the system on the driver's behalf for the job.
   */
  async recordEvidence(ctx, params) {
    const forJob = params.subject === "JOB";
    let subjectId = ctx.d.id;
    if (forJob) {
      const assignment = await driverActions.getDriverAssignment(ctx.d.id);
      if (!assignment) return;
      subjectId = assignment.job_id;
    }
    const input = await evidenceInput(ctx, params, forJob ? "JOB" : "DRIVER", subjectId);
    if (!input) {
      logger.error(`Flow evidence "${params.name}" was not recorded: the answer was missing or not usable.`);
      return;
    }
    const actor = forJob ? driverActions.systemActor(ctx.d.organization_id) : driverActions.driverActor(ctx.d);
    try {
      await driverActions.run("evidence.record", input, actor);
    } catch (err) {
      logger.error({ err }, `Flow evidence "${params.name}" was not recorded`);
    }
  },
};

module.exports = { actionsEvidence };
