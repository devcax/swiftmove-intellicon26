/** Flow actions that hand a message back to the conversation code: apply what was understood, merge a correction, ask again, answer a free-form reply. */
const { reply } = require("../reply");
const { setPendingAction } = require("../pending");
const { describeBlocker, voiceOf } = require("../context");
const { applyCandidate } = require("../intents");
const { routeCandidate } = require("../router");

const actionsRoute = {
  async applyCandidateConfirmed(ctx, params) {
    return await applyCandidate(params.candidate, ctx, { confirmed: true });
  },

  async mergeCorrection(_ctx, _params, data, refs) {
    data.candidate = {
      ...(data.candidate ?? {}),
      extracted_data: {
        ...(data.candidate?.extracted_data ?? {}),
        ...(refs?.candidate?.extracted_data ?? {}),
      },
    };
    // Re-ask the confirmation question with the merged candidate.
    return { retry: true };
  },

  async routeCandidatePassthrough(ctx, _params, _data, refs) {
    if (!refs?.candidate) return { end: true };
    return await routeCandidate(refs.candidate, ctx);
  },

  async sendClarification(ctx, params) {
    await setPendingAction(ctx.conversationId, {
      type: "AWAITING_CLARIFICATION",
      candidate: params.candidate,
    });
    const body =
      params.question ??
      `I am not sure I understood. Did you mean *${String(params.candidate?.intent ?? "")
        .replace(/_/g, " ")
        .toLowerCase()}*? Please rephrase or add the job number.`;
    return await reply({ ...ctx, body });
  },

  async answerFreeform(ctx, params, _data, refs) {
    const blocker = await describeBlocker(ctx.d);
    const human = await voiceOf(
      ctx,
      [
        `You asked the driver: "${params.question}"`,
        `They replied: "${params.answer}"`,
        "Answer their reply directly and give the one next step that follows from it.",
        blocker
          ? `What the trip is waiting on right now: ${blocker}`
          : null,
        "Never claim an action was taken or recorded. Do not use emojis or em dashes.",
      ]
        .filter(Boolean)
        .join(" "),
    );
    if (human) {
      await reply({ ...ctx, body: human });
      return;
    }
    // The AI had nothing to say: continue normal routing with this message,
    // exactly like the legacy fall-through.
    if (refs?.candidate) {
      return await routeCandidate(refs.candidate, ctx);
    }
    return { end: true };
  },
};

module.exports = { actionsRoute };
