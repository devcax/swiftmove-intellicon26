/**
 * What the system tells a driver on WhatsApp when something happened that the driver did not ask about: an offer, an invitation to apply,
 * a manager's decision. The modules call these after their change is saved.
 */
const { formatJobInvite } = require("./jobMessages");
const { reply } = require("./reply");
const { setPendingAction } = require("./pending");
const repo = require("./repo");
const { tryStartEventFlow } = require("./flows/deps");
const { fmtWhen } = require("../../platform/time");

/** The driver's open conversation, started for this job when they have none. */
async function conversationOf(driver, job) {
  return (await repo.findOpenConversation(driver.id)) ?? repo.createConversation({ organizationId: job.organization_id, driverId: driver.id, jobId: job.id });
}

async function deliverOffer({
  job,
  driver,
  body,
  buttons,
  pendingType = "AWAITING_ACCEPT_DECLINE",
}) {
  const phone = (driver.phone_e164 ?? "").replace(/\D/g, "");
  const conversationId = await conversationOf(driver, job);
  const messageId = await reply({ conversationId, phone, body, buttons });
  await setPendingAction(conversationId, { type: pendingType, job_id: job.id });
  return { conversationId, messageId };
}

async function sendJobOffer({ job, driver }) {
  return deliverOffer({
    job,
    driver,
    body: `Good news, *${job.job_number}* is yours if you want it: ${job.cargo_description}. Shall I lock it in for you?`,
    buttons: [
      { id: "ACCEPT_JOB", title: "Accept" },
      { id: "DECLINE_JOB", title: "Decline" },
    ],
  });
}

async function sendJobApplyInvite({ job, driver }) {
  return await deliverOffer({
    job,
    driver,
    body: formatJobInvite(job, driver),
    buttons: [{ id: `APPLY_JOB:${job.id}`, title: "Apply now" }],
    pendingType: "AWAITING_APPLY",
  });
}

/** Notify a driver about a request rejection. */
async function sendRequestRejected({ job, driver }) {
  return await notifyDriver({
    job,
    driver,
    body: `Ah, *${job.job_number}* went another way this time Say "jobs" and I'll show you what else is open.`,
  });
}

/** Generic manager-initiated WhatsApp notice to the driver of a job. */
async function notifyDriver({ job, driver, body }) {
  if (!driver) return null;
  const phone = (driver.phone_e164 ?? "").replace(/\D/g, "");
  const conversationId = await conversationOf(driver, job);
  return await reply({ conversationId, phone, body });
}

/** Manager cancelled the job -> tell the driver they are free again. */
async function sendJobCancelled({ job, driver }) {
  return await notifyDriver({
    job,
    driver,
    body: `Heads up, *${job.job_number}* was cancelled by the manager. You're free for other jobs now; just say "jobs" anytime.`,
  });
}

/** The job no longer exists: preserve the chat, and never attach a new conversation to the deleted id. */
async function sendJobDeleted({ job, driver }) {
  return await notifyDriver({
    job: { ...job, id: null }, driver,
    body: `You've been unassigned from *${job.job_number}*. This job has been deleted and is no longer available. Send "jobs" to see other available jobs.`,
  });
}

/** Manager asks for a correction during completion review. */
async function sendCorrectionRequest({ job, driver, note }) {
  return await notifyDriver({
    job,
    driver,
    body: `The manager reviewed *${job.job_number}* and needs a small fix${note ? `: ${note}` : ""}. Send the corrected update or document here and I'll sort it.`,
  });
}

/** Manager submitted a delivered trip for closure review. */
async function sendCompletionSubmitted({ job, driver }) {
  return await notifyDriver({
    job,
    driver,
    body: `*${job.job_number}* is in final review now If any paperwork (like the signed POD) is still pending, send it here.`,
  });
}

async function sendManagerVerification({ job, driver, stage }) {
  const progress = stage === 'PICKUP' ? 'loaded' : 'delivered';
  return await notifyDriver({
    job,
    driver,
    body: `The manager verified the ${stage.toLowerCase()} code for *${job.job_number}*. Your job is now marked as ${progress}.`,
  });
}

/** Completion review outcome: job marked done, driver available again. */
async function sendJobCompleted({ job, driver }) {
  return await notifyDriver({
    job,
    driver,
    body: `*${job.job_number}* is officially complete, great work! Ready for the next one? Say "jobs" anytime.`,
  });
}

/** Manager decision on a driver's cancellation request. */
async function sendCancellationDecision({ job, driver, action }) {
  const body =
    {
      release: `Good news, your cancellation request for *${job.job_number}* was approved. You're released and free for other jobs.`,
      cancel: `Your cancellation request for *${job.job_number}* was approved and the job has been cancelled.`,
      reject: `The manager reviewed your cancellation request for *${job.job_number}* and kept the job with you. Message me if anything changed.`,
    }[action] ??
    `Update on your cancellation request for *${job.job_number}*: ${action}.`;
  return await notifyDriver({ job, driver, body });
}

/**
 * Ask the driver why a stage was late, when a manager verified it by hand. Starts the delay-reason flow when the organization has one,
 * otherwise asks in plain words and waits for the answer. A repeated delivery of the same event asks once.
 */
async function askDelayReason({ job, driver, stage, minutesLate, scheduledAt }) {
  const phone = (driver.phone_e164 ?? "").replace(/\D/g, "");
  const conversationId = await conversationOf(driver, job);
  const lower = String(stage).toLowerCase();
  const body = `The manager verified your ${lower} paper. This ${lower} was about ${minutesLate} min later than scheduled (${fmtWhen(scheduledAt)}), so I need the reason for the records. What caused the delay?`;
  if (await repo.botSaidRecently(conversationId, body)) return null;
  const ctx = { d: { id: driver.id, name: driver.name, organization_id: job.organization_id }, phone, conversationId, messageId: null };
  if (await tryStartEventFlow(ctx, "delay.reason.required", { stage, minutesLate, scheduledAt, variant: "manager" })) return null;
  await setPendingAction(conversationId, { type: "AWAITING_DELAY_REASON", stage });
  return await reply({ conversationId, phone, body });
}

module.exports = {
  askDelayReason,
  sendJobOffer,
  sendJobApplyInvite,
  sendRequestRejected,
  sendJobCancelled,
  sendJobDeleted,
  sendCorrectionRequest,
  sendCompletionSubmitted,
  sendManagerVerification,
  sendJobCompleted,
  sendCancellationDecision,
  notifyDriver,
};
