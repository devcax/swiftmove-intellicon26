/** What the AI is shown about the driver, the job and the conversation, and the plain-language voice of the bot. */
const { logger } = require("../../platform/logger");
const stateMachine = require("../../platform/jobStateMachine");
const driverActions = require("./driverActions");
const { friendlyReply } = require("./ai/companion");
const { getPendingAction } = require("./pending");
const repo = require("./repo");

async function loadInterpreterContext(driver, conversationId) {
  const assignment = await driverActions.getDriverAssignment(driver.id);

  let activeJob = null;
  let activeJobSummary = null;
  if (assignment) {
    activeJob = await repo.findJobView(assignment.job_id);
    activeJobSummary = await repo.findJobSummaryText(assignment.job_id);
  }

  const pendingRequest = await driverActions.getPendingRequest(driver);
  const availableJobs = assignment
    ? []
    : await driverActions.listAvailableJobs(driver);

  const recentMessages = (await repo.listRecentMessages(conversationId)).map((m) => ({
    sender: m.sender_type,
    text: (m.body_text ?? "").slice(0, 160),
  }));

  const pendingAction = await getPendingAction(conversationId);
  return {
    activeJob,
    activeJobSummary,
    pendingRequest,
    availableJobs,
    recentMessages,
    pendingAction,
  };
}

async function describeBlocker(driver) {
  try {
    const progress = await driverActions.describeProgress(driver);
    if (!progress || !progress.live) return null;

    const rank = stateMachine.rankOf(progress.stage) ?? 0;
    const R = stateMachine.STAGE_RANK;

    if (rank < R.LOADED && !progress.verifiedPickup) {
      return "the signed pickup document. The job cannot be marked loaded until the driver sends a photo of it and the pickup code is verified. If the depot or site staff are holding the paperwork, the driver should collect it from them and send the photo here.";
    }
    if (rank < R.DELIVERED && !progress.verifiedDelivery) {
      return "the signed delivery document. The job cannot be marked delivered until the driver sends a photo of it and the delivery code is verified. If the receiver is holding the paperwork, the driver should collect it from them and send the photo here.";
    }
    if (rank >= R.DELIVERED && rank < R.DRIVER_SUBMITTED_COMPLETION) {
      return "the driver sending the job for closure, which the manager then approves.";
    }
    if (
      progress.stage === "DRIVER_SUBMITTED_COMPLETION" ||
      progress.stage === "MANAGER_REVIEW"
    ) {
      return "the manager approving the closure. Nothing is needed from the driver.";
    }
    return null;
  } catch (err) {
    logger.error({ err }, "Could not describe the current blocker");
    return null;
  }
}

async function voiceOf(ctx, situation) {
  return friendlyReply({
    situation,
    driverName: ctx.d.name,
    activeJob: ctx.interp?.activeJob ?? null,
    activeJobSummary: ctx.interp?.activeJobSummary ?? null,
    availableJobs: ctx.interp?.availableJobs ?? [],
    driverMessage: ctx.driverText ?? null,
    recentMessages: ctx.interp?.recentMessages ?? [],
    organizationId: ctx.d.organization_id ?? null,
  });
}

module.exports = { loadInterpreterContext, describeBlocker, voiceOf };
