/** Documents the driver sent that are not a stage paper: attach them to the right job, or ask which job. */
const driverActions = require("./driverActions");
const { setPendingAction } = require("./pending");
const repo = require("./repo");

const POD_PATTERN = /\b(pod|proof of delivery|delivery note|signed pod|grn)\b/i;

async function prepareDocumentContext(ctx, caption) {
  const { d, messageId, conversationId } = ctx;
  const attachments = await repo.listMessageAttachments(messageId);
  if (attachments.length === 0) return null;

  const attachmentIds = attachments.map((a) => a.id);
  const filenames = attachments.map((a) => a.originalFilename ?? "").join(" ");
  const documentType = POD_PATTERN.test(`${caption ?? ""} ${filenames}`)
    ? "POD"
    : "OTHER";

  const assignment = await driverActions.getDriverAssignment(d.id);
  if (!assignment) {
    const jobs = await driverActions.listRecentJobsForDriver(d);
    if (jobs.length === 0) {
      return {
        linked: false,
        confirmation:
          "Got the document, you don't have a job to attach it to right now, but the manager can still see it here.",
      };
    }
    await setPendingAction(conversationId, {
      type: "AWAITING_DOC_JOB_CHOICE",
      messageId,
      attachmentIds,
      documentType,
      caption,
    });
    return {
      needsJobChoice: true,
      jobRows: jobs.map((j) => ({
        id: `DOC_JOB:${j.id}`,
        title: j.job_number,
        description:
          `${j.pickup ?? "?"} → ${j.delivery ?? "?"} · ${j.current_status.replace(/_/g, " ")}`.slice(
            0,
            72,
          ),
      })),
    };
  }

  const { job } = await driverActions.attachDocuments(d, {
    attachmentIds,
    documentType,
    caption,
    messageId,
    confidence: 1,
  });
  const confirmation =
    documentType === "POD"
      ? `POD received and attached to *${job.job_number}*. The manager can see it on the job timeline.`
      : `Document attached to *${job.job_number}*. The manager can see it on the job timeline.`;
  return {
    linked: true,
    job,
    documentType,
    attachmentIds,
    caption,
    confirmation,
  };
}

module.exports = { prepareDocumentContext };
