/** The driver's text when the bot was waiting for a specific answer (a cancel reason, a delay reason, the safety check). */
const driverActions = require("./driverActions");
const flowEngine = require("./flows/engine");
const { reply } = require("./reply");
const { clearPendingAction } = require("./pending");
const { flowDeps } = require("./flows/deps");
const { beginCancellation } = require("./safety");
const { appendPendingContinuation } = require("./milestone");
const { CONTINUE } = require("./constants");

/**
 * Flow engine: an active flow consumes the driver's text. Steps that only need the raw text (reason menus, delay reasons, ...) advance
 * right here before injection screening, mirroring the pending checks below; steps that branch on the interpreted intent wait for it.
 * Returns `{ result }` when the flow took the message, `{ wait }` when a step needs the interpretation first, or `{}`.
 */
async function consumeFlowText(ctx, text, pending) {
  if (pending?.type !== flowEngine.PENDING_TYPE) return {};
  const flow = await flowEngine.loadFlowVersion(
    ctx.d.organization_id,
    pending.flowKey,
    pending.flowVersion,
  );
  if (!flow) return {};
  const step = flowEngine.currentStep(flow, pending);
  if (step && !flowEngine.stepNeedsCandidate(step)) {
    const outcome = await flowEngine.advanceFlow(
      flowDeps(ctx),
      flow,
      pending,
      { text },
      ctx,
    );
    if (outcome.handled) return { result: { flow: pending.flowKey } };
  } else if (step) {
    return { wait: { flow, pending } };
  }
  return {};
}

/** The answers that need no interpretation. CONTINUE when the pending question is not one of them. */
async function handleAwaiting(ctx, text, pending) {
  const { d, conversationId, messageId } = ctx;
  if (["AWAITING_LOCATION", "AWAITING_BACKUP"].includes(pending?.type)) {
    return await reply({
      ...ctx,
      body: "Almost done, share your current location using the attachment menu in WhatsApp, or tap one of the backup options above. ",
    });
  }
  if (pending?.type === "AWAITING_CANCEL_REASON") {
    if (/never mind|forget it|ignore|sorry|keep (the )?job/i.test(text)) {
      await clearPendingAction(conversationId);
      return await reply({
        ...ctx,
        body: "No worries, your job stays as it is. ",
      });
    }
    return await beginCancellation(ctx, text);
  }

  if (pending?.type === "AWAITING_CANCEL_DETAILS") {
    if (/never mind|forget it|ignore|sorry|keep (the )?job/i.test(text)) {
      await clearPendingAction(conversationId);
      return await reply({
        ...ctx,
        body: "No worries, your job stays as it is.",
      });
    }
    const details = text.slice(0, 500);
    return await beginCancellation(ctx, `${pending.reason}: ${details}`);
  }

  if (pending?.type === "AWAITING_DELAY_REASON") {
    const stage = pending.stage === "DELIVERY" ? "DELIVERY" : "PICKUP";
    await clearPendingAction(conversationId);
    const rec = await driverActions.recordStageDelay(
      d,
      stage,
      text.slice(0, 500),
      messageId,
    );
    const lines = [
      rec.alreadyRecorded
        ? `I already had the ${stage.toLowerCase()} delay reason noted, so nothing changed.`
        : `Noted, thanks. The ${stage.toLowerCase()} delay (${rec.minutesLate} min late) is recorded and the manager can see it.`,
    ];
    const cont = await driverActions.applyPendingVerifications(d, messageId);
    await appendPendingContinuation(lines, ctx, cont);
    return await reply({ ...ctx, body: lines.join(" ") });
  }
  return CONTINUE;
}

module.exports = { consumeFlowText, handleAwaiting };
