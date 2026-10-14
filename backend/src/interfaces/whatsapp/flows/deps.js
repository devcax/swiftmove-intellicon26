/** What the flow engine runs against in a live conversation (sending, saving the pending step, actions, classification), and starting flows. */
const { classifyAnswer } = require("../ai/flowClassify");
const flowEngine = require("./engine");
const { reply } = require("../reply");
const { setPendingAction, clearFlowPending } = require("../pending");

/** Dependency bundle the flow engine runs against (live WhatsApp bot). */
function flowDeps(ctx, { collect } = {}) {
  return {
    send: collect
      ? async ({ body }) => {
          if (body) collect.push(body);
          return null;
        }
      : async ({ body, buttons = null, listRows = null }) =>
          await reply({ ...ctx, body, buttons, listRows }),
    savePending: async (pending) =>
      await setPendingAction(ctx.conversationId, pending),
    clearFlowPending: async (flowKey) =>
      await clearFlowPending(ctx.conversationId, flowKey),
    get actions() {
      return require("./actions").flowActions; // required here: the actions call back into the conversation code that starts flows
    },
    get promptProviders() {
      return require("./providers").flowPromptProviders;
    },
    classify: async (text, categories) =>
      await classifyAnswer({
        text,
        categories,
        organizationId: ctx.d.organization_id,
      }),
  };
}

/**
 * Fire an EVENT-triggered flow. Returns false when no published flow owns
 * the event so the caller can run its legacy hardcoded path.
 * `collect` routes the flow's outgoing messages into an array instead of
 * sending them (used when a combined reply is still being composed).
 */
async function tryStartEventFlow(ctx, event, data, { collect } = {}) {
  const flows = await flowEngine.loadFlows(ctx.d.organization_id);
  const flow = flowEngine.matchEvent(flows, event);
  if (!flow) return false;
  await flowEngine.startFlow(flowDeps(ctx, { collect }), flow, ctx, data);
  return true;
}

/**
 * Fire the custom conversation a policy is linked to (onBlock.flowKey).
 * Returns false when no published+enabled flow with that key exists, so the
 * caller falls back to the standard policy-block helper instead of silently
 * doing nothing.
 */
async function tryStartFlowByKey(ctx, flowKey, data, { collect } = {}) {
  const flows = await flowEngine.loadFlows(ctx.d.organization_id);
  const flow = (flows ?? []).find((f) => f.key === flowKey);
  if (!flow) return false;
  await flowEngine.startFlow(flowDeps(ctx, { collect }), flow, ctx, data);
  return true;
}

/** Standard data bag for INTENT-triggered flows. */
function intentFlowData(candidate, ctx) {
  return {
    reason: candidate.extracted_data?.reason ?? null,
    jobReference: candidate.job_reference ?? null,
    candidate,
    text: ctx.driverText ?? null,
    jobNumber:
      ctx.interp?.activeJob?.job_number ?? candidate.job_reference ?? null,
  };
}

module.exports = { flowDeps, tryStartEventFlow, tryStartFlowByKey, intentFlowData };
