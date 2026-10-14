/**
 * A driver's message, once it has been received and stored (see receive.js): what kind it is, what the bot was waiting for, what the AI
 * understood, and what to do about it. The bot never changes a job itself: every change is an action run as the driver.
 */
const { logger } = require("../../platform/logger");
const { WorkflowError } = require("./workflowError");
const runner = require("../../platform/runner");
const driverActions = require("./driverActions");
const { reply } = require("./reply");
const { getPendingAction, isAiPaused } = require("./pending");
const { handleButton } = require("./buttons");
const { handleLocation } = require("./location");
const { handleVoice, handleMedia } = require("./media");
const { consumeFlowText, handleAwaiting } = require("./awaiting");
const { understand } = require("./understand");
const { handleFollowups } = require("./followups");
const { routeCandidate } = require("./router");
const { renderRefusal } = require("./blocked");
const { CONTINUE } = require("./constants");

/** The conversation's working context: who is talking, how to answer them, and which message this is. */
function buildContext({ driver, conversationId, messageId, replyToMessageId, sourceMessageIds }) {
  const d = {
    id: driver.driver_id ?? driver.id,
    name: driver.name,
    organization_id: driver.organization_id,
    vehicle_type: driver.vehicle_type ?? null,
  };
  const phone = (driver.phone_e164 ?? "").replace(/\D/g, "") || driver.waId;
  return { d, phone, conversationId, messageId, replyToMessageId, sourceMessageIds: sourceMessageIds ?? [messageId] };
}

async function processInboundCore({ driver, conversationId, messageId, messageType, bodyText, buttonId, replyToMessageId, sourceMessageIds }) {
  const ctx = buildContext({ driver, conversationId, messageId, replyToMessageId, sourceMessageIds });

  try {
    if (buttonId) return await handleButton(buttonId, ctx);

    let text = (bodyText ?? "").trim();
    if (messageType === "LOCATION") return await handleLocation(ctx, text);

    if (messageType === "AUDIO") {
      const voice = await handleVoice(ctx);
      if (voice.result !== undefined) return voice.result;
      text = voice.text;
    }

    if (messageType === "IMAGE" || messageType === "DOCUMENT") {
      const media = await handleMedia(ctx, text);
      if (media.result !== undefined) return media.result;
      text = media.text;
    }

    if (!text) {
      return await reply({
        ...ctx,
        body: 'Hmm, that came through empty on my side, can you type it out? (e.g. "loaded 18 pallets")',
      });
    }

    const pending = await getPendingAction(conversationId);
    const flowInput = await consumeFlowText(ctx, text, pending);
    if (flowInput.result !== undefined) return flowInput.result;

    const awaiting = await handleAwaiting(ctx, text, pending);
    if (awaiting !== CONTINUE) return awaiting;

    const understood = await understand(ctx, text);
    if (understood.result !== undefined) return understood.result;
    const { candidate } = understood;

    const followup = await handleFollowups(ctx, text, candidate, pending, flowInput.wait ?? null);
    if (followup !== CONTINUE) return followup;

    return await routeCandidate(candidate, ctx);
  } catch (err) {
    if (err instanceof WorkflowError || err?.isPolicyViolation) {
      const rendered = await renderRefusal(ctx, err);
      if (rendered !== undefined) return rendered;
    }
    logger.error({ err }, "Bot processing failed");
    return await reply({
      ...ctx,
      body: "Something went wrong on my side. Please try again in a moment.",
    }).catch(() => {});
  }
}

async function processInbound(args) {
  if (await isAiPaused(args.conversationId)) {
    return { skipped: "MANAGER_TAKEOVER" };
  }
  const result = await processInboundCore(args);
  const driverId = args.driver.driver_id ?? args.driver.id;
  // Plugins may react (the job summary refreshes). A failure here never touches the driver's reply.
  runner
    .run("conversation.noteMessageHandled", { driverId, conversationId: args.conversationId }, driverActions.systemActor(args.driver.organization_id))
    .catch((err) => logger.error({ err }, "Could not note the handled message"));
  return result;
}

module.exports = { processInbound };
