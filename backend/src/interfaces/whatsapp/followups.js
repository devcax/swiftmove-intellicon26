/** What the interpreted message means given what the bot was waiting for: an answer to its question, a confirmation, a reply to an invitation. */
const flowEngine = require("./flows/engine");
const { reply } = require("./reply");
const { setPendingAction, clearPendingAction } = require("./pending");
const { flowDeps } = require("./flows/deps");
const { quotedApplyInviteJobId } = require("./invite");
const { submitApplyRequest } = require("./apply");
const { describeBlocker, voiceOf } = require("./context");
const { applyCandidate } = require("./intents");
const { askConfirmation } = require("./router");
const { confirmStartAndContinue } = require("./milestone");
const { CONTINUE } = require("./constants");

/** CONTINUE when the message is a new request that should be routed as usual. */
async function handleFollowups(ctx, text, candidate, pending, flowCandidateWait) {
  const { d, conversationId, replyToMessageId } = ctx;

  const quotedJobId = await quotedApplyInviteJobId(
    conversationId,
    replyToMessageId,
  );
  const isApplyReply =
    candidate.intent === "CONFIRM_EVENT" ||
    candidate.intent === "REQUEST_JOB" ||
    /^apply(?:\s+now)?$/i.test(text);
  if (quotedJobId && isApplyReply) {
    await clearPendingAction(conversationId);
    return await submitApplyRequest(ctx, quotedJobId);
  }

  // Flow engine: steps that branch on the interpreted intent consume the
  // message here, after screening and interpretation like the legacy
  // AWAITING_CONFIRMATION / AWAITING_FREEFORM_ANSWER checks.
  if (flowCandidateWait) {
    const outcome = await flowEngine.advanceFlow(
      flowDeps(ctx),
      flowCandidateWait.flow,
      flowCandidateWait.pending,
      { text, candidate },
      ctx,
    );
    if (outcome.handled) return { flow: flowCandidateWait.pending.flowKey };
  }

  if (
    pending?.type === "AWAITING_ACCEPT_DECLINE" &&
    candidate.intent === "CONFIRM_EVENT"
  ) {
    await clearPendingAction(conversationId);
    return await applyCandidate(
      {
        intent: "ACCEPT_JOB",
        job_reference: null,
        extracted_data: {},
        confidence: 1,
        events: [],
      },
      ctx,
      { confirmed: true },
    );
  }

  if (
    pending?.type === "AWAITING_APPLY" &&
    (candidate.intent === "CONFIRM_EVENT" ||
      candidate.intent === "REQUEST_JOB")
  ) {
    const inviteJobId = pending.job_id;
    await clearPendingAction(conversationId);
    return await submitApplyRequest(ctx, inviteJobId);
  }

  if (
    pending?.type === "AWAITING_START_CONFIRM" &&
    candidate.intent === "CONFIRM_EVENT"
  ) {
    await clearPendingAction(conversationId);
    return await confirmStartAndContinue(ctx, pending.candidate ?? null);
  }

  if (pending?.type === "AWAITING_CONFIRMATION") {
    if (candidate.intent === "CONFIRM_EVENT") {
      await clearPendingAction(conversationId);
      return await applyCandidate(pending.candidate, ctx, {
        confirmed: true,
      });
    }
    if (candidate.intent === "CORRECT_EVENT") {
      const merged = {
        ...pending.candidate,
        extracted_data: {
          ...pending.candidate.extracted_data,
          ...candidate.extracted_data,
        },
      };
      await setPendingAction(conversationId, {
        type: "AWAITING_CONFIRMATION",
        candidate: merged,
      });
      return await askConfirmation(merged, ctx);
    }
    await clearPendingAction(conversationId);
  }

  if (pending?.type === "AWAITING_FREEFORM_ANSWER") {
    await clearPendingAction(conversationId);
    if (
      ["CONFIRM_EVENT", "CORRECT_EVENT", "UNKNOWN"].includes(candidate.intent)
    ) {
      const blocker = await describeBlocker(d);
      const human = await voiceOf(
        ctx,
        [
          `You asked the driver: "${pending.question}"`,
          `They replied: "${text}"`,
          "Answer their reply directly and give the one next step that follows from it.",
          blocker
            ? `What the trip is waiting on right now: ${blocker}`
            : null,
          "Never claim an action was taken or recorded. Do not use emojis or em dashes.",
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (human) return await reply({ ...ctx, body: human });
    }
  }

  return CONTINUE;
}

module.exports = { handleFollowups };
