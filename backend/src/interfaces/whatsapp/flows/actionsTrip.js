/** Flow actions for the trip itself: a delay reason, confirming the start. */
const driverActions = require("../driverActions");
const { reply } = require("../reply");
const { getPendingAction, clearPendingAction } = require("../pending");
const { appendPendingContinuation, confirmStartAndContinue } = require("../milestone");

const actionsTrip = {
  async recordDelayReason(ctx, params) {
    const stage = params.stage === "DELIVERY" ? "DELIVERY" : "PICKUP";
    const rec = await driverActions.recordStageDelay(
      ctx.d,
      stage,
      String(params.reason ?? "").slice(0, 500),
      ctx.messageId,
    );
    const lines = [
      rec.alreadyRecorded
        ? `I already had the ${stage.toLowerCase()} delay reason noted, so nothing changed.`
        : `Noted, thanks. The ${stage.toLowerCase()} delay (${rec.minutesLate} min late) is recorded and the manager can see it.`,
    ];
    const cont = await driverActions.applyPendingVerifications(ctx.d, ctx.messageId);
    await appendPendingContinuation(lines, ctx, cont);
    return await reply({ ...ctx, body: lines.join(" ") });
  },

  async confirmStartAndContinue(ctx, params) {
    return await confirmStartAndContinue(ctx, params.candidate ?? null);
  },

  async gapStartRespond(ctx, params) {
    const pending = await getPendingAction(ctx.conversationId);
    if (pending?.type !== "GAP_START") {
      return await reply({
        ...ctx,
        body: "That one expired on me, send the update again and I'll pick it up.",
      });
    }
    await clearPendingAction(ctx.conversationId);
    if (params.answer === "GAP_START_NO") {
      return await reply({
        ...ctx,
        body: "No problem Nothing logged, just say the word when you want to start the trip.",
      });
    }
    return await confirmStartAndContinue(ctx, pending.candidate ?? null);
  },
};

module.exports = { actionsTrip };
