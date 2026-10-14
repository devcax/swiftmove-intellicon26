/** A button or list row the driver tapped: the flow it belongs to, or one of the built-in answers (apply, accept, confirm, cancel reason, safety check, ...). */
const driverActions = require("./driverActions");
const flowEngine = require("./flows/engine");
const { reply } = require("./reply");
const { getPendingAction, setPendingAction, clearPendingAction } = require("./pending");
const { flowDeps } = require("./flows/deps");
const { quotedApplyInviteJobId } = require("./invite");
const { submitApplyRequest } = require("./apply");
const { beginCancellation, applySafetyCheck } = require("./safety");
const { applyCandidate } = require("./intents");
const { confirmStartAndContinue } = require("./milestone");
const repo = require("./repo");

async function handleButton(buttonId, ctx) {
  const { d, conversationId, messageId } = ctx;

  // Flow engine: an active flow consumes taps on the options it offered.
  const pendingBtn = await getPendingAction(conversationId);
  if (pendingBtn?.type === flowEngine.PENDING_TYPE) {
    const flow = await flowEngine.loadFlowVersion(
      d.organization_id,
      pendingBtn.flowKey,
      pendingBtn.flowVersion,
    );
    if (flow) {
      const outcome = await flowEngine.advanceFlow(
        flowDeps(ctx),
        flow,
        pendingBtn,
        { buttonId },
        ctx,
      );
      if (outcome.handled) return { flow: pendingBtn.flowKey };
    }
  }

  // Flow engine: a tap can start a published BUTTON-triggered flow.
  const buttonFlows = await flowEngine.loadFlows(d.organization_id);
  const triggered = flowEngine.matchButton(buttonFlows, buttonId);
  if (triggered) {
    await flowEngine.startFlow(flowDeps(ctx), triggered, ctx, {
      buttonId,
      buttonParam: flowEngine.buttonParam(triggered, buttonId),
    });
    return { flow: triggered.key };
  }

  if (buttonId.startsWith("APPLY_JOB:")) {
    return await submitApplyRequest(ctx, buttonId.slice("APPLY_JOB:".length));
  }

  if (buttonId === "APPLY_JOB") {
    const quotedJobId = await quotedApplyInviteJobId(
      conversationId,
      ctx.replyToMessageId,
    );
    const pending = await getPendingAction(conversationId);
    const jobId = quotedJobId ?? pending?.job_id;
    await clearPendingAction(conversationId);
    if (!jobId)
      return await reply({
        ...ctx,
        body: "That invite expired on me, say \"jobs\" and I'll show what's open.",
      });
    return await submitApplyRequest(ctx, jobId);
  }

  if (buttonId === "ACCEPT_JOB" || buttonId === "DECLINE_JOB") {
    const fn =
      buttonId === "ACCEPT_JOB" ? driverActions.acceptJob : driverActions.declineJob;
    const { job } = await fn(d, messageId, 1);
    await clearPendingAction(conversationId);
    return await reply({
      ...ctx,
      body:
        buttonId === "ACCEPT_JOB"
          ? `You're on *${job.job_number}*. Just say "start ${job.job_number}" when you're ready to roll.`
          : `No worries, *${job.job_number}* goes back to the pool.`,
    });
  }

  if (buttonId === "CONFIRM_YES" || buttonId === "CONFIRM_NO") {
    const pending = await getPendingAction(conversationId);
    if (pending?.type !== "AWAITING_CONFIRMATION") {
      return await reply({
        ...ctx,
        body: "That one expired on me, send the update again and I'll pick it up.",
      });
    }
    await clearPendingAction(conversationId);
    if (buttonId === "CONFIRM_NO") {
      return await reply({
        ...ctx,
        body: "No problem, scrapped it, nothing changed. ",
      });
    }
    return await applyCandidate(pending.candidate, ctx, { confirmed: true });
  }

  if (buttonId.startsWith("CANCEL_REASON:")) {
    const pending = await getPendingAction(conversationId);
    if (pending?.type !== "AWAITING_CANCEL_REASON") {
      return await reply({
        ...ctx,
        body: "There's no cancellation request open right now, all good. ",
      });
    }
    const labels = {
      VEHICLE_PROBLEM: "Vehicle problem",
      ACCIDENT: "Accident",
      CUSTOMER_ISSUE: "Customer issue",
      PERSONAL: "Personal reason",
      OTHER: "Other",
    };
    const code = buttonId.slice("CANCEL_REASON:".length);
    const reason = labels[code] ?? "Other";
    if (["CUSTOMER_ISSUE", "PERSONAL", "OTHER"].includes(code)) {
      await setPendingAction(conversationId, {
        type: "AWAITING_CANCEL_DETAILS",
        reason,
      });
      return await reply({
        ...ctx,
        body: `Please tell me a little more about the ${reason.toLowerCase()}. I will include it with the manager's cancellation review.`,
      });
    }
    return await beginCancellation(ctx, reason);
  }

  if (buttonId === "END_JOB_CONFIRM_YES" || buttonId === "END_JOB_CONFIRM_NO") {
    if (buttonId === "END_JOB_CONFIRM_NO") {
      return await reply({
        ...ctx,
        body: "Got it, trip stays open. Keep the updates coming! ",
      });
    }
    return await applyCandidate(
      {
        intent: "END_JOB",
        job_reference: null,
        extracted_data: {},
        confidence: 1,
        events: [],
      },
      ctx,
      { confirmed: true },
    );
  }

  if (buttonId === "BACKUP_NEEDED" || buttonId === "BACKUP_NOT_NEEDED") {
    const pending = await getPendingAction(conversationId);
    if (!["AWAITING_LOCATION", "AWAITING_BACKUP"].includes(pending?.type)) {
      return await reply({
        ...ctx,
        body: "There is no safety check in progress right now.",
      });
    }
    return await applySafetyCheck(ctx, pending, {
      backup: buttonId === "BACKUP_NEEDED" ? "REQUESTED" : "DECLINED",
    });
  }

  if (buttonId === "GAP_START_YES" || buttonId === "GAP_START_NO") {
    const pending = await getPendingAction(conversationId);
    if (pending?.type !== "GAP_START") {
      return await reply({
        ...ctx,
        body: "That one expired on me, send the update again and I'll pick it up.",
      });
    }
    await clearPendingAction(conversationId);
    if (buttonId === "GAP_START_NO") {
      return await reply({
        ...ctx,
        body: "No problem Nothing logged, just say the word when you want to start the trip.",
      });
    }
    return await confirmStartAndContinue(ctx, pending.candidate ?? null);
  }

  if (buttonId === "CONFIRM_START_JOB" || buttonId === "START_NOT_YET") {
    const pending = await getPendingAction(conversationId);
    if (pending?.type !== "AWAITING_START_CONFIRM") {
      return await reply({
        ...ctx,
        body: "That one expired on me, send the update again and I'll pick it up.",
      });
    }
    await clearPendingAction(conversationId);
    if (buttonId === "START_NOT_YET") {
      return await reply({
        ...ctx,
        body: 'No problem, nothing changed. Just say "start job" here when you actually roll.',
      });
    }
    return await confirmStartAndContinue(ctx, pending.candidate ?? null);
  }

  if (buttonId.startsWith("CHOOSE_JOB:")) {
    const jobId = buttonId.slice("CHOOSE_JOB:".length);
    const job = await repo.findJobRow(jobId);
    if (!job)
      return await reply({
        ...ctx,
        body: "Ah, that one's gone already, say \"jobs\" and I'll show you what's open now.",
      });
    await clearPendingAction(conversationId);
    const { job: requested } = await driverActions.requestJob(d, job, messageId, 1);
    return await reply({
      ...ctx,
      body: `Done, I've asked the manager about *${requested.job_number}*. I'll ping you the moment it's approved!`,
    });
  }

  if (buttonId.startsWith("DOC_JOB:")) {
    const pending = await getPendingAction(conversationId);
    const jobId = buttonId.slice("DOC_JOB:".length);
    if (pending?.type !== "AWAITING_DOC_JOB_CHOICE") {
      return await reply({
        ...ctx,
        body: "That document request expired, mind sending the photo again ? ",
      });
    }
    const { job } = await driverActions.attachDocuments(d, {
      attachmentIds: pending.attachmentIds,
      documentType: pending.documentType,
      caption: pending.caption,
      jobId,
      messageId: pending.messageId,
      confidence: 1,
    });
    await clearPendingAction(conversationId);
    return await reply({
      ...ctx,
      body: `Got it, attached to *${job.job_number}*. The manager can see it now.`,
    });
  }

  return await reply({
    ...ctx,
    body: "Hmm, that button's from an old message, what's happening with the trip?",
  });
}

module.exports = { handleButton };
