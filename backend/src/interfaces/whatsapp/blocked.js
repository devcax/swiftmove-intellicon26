/**
 * When a step cannot happen: a policy blocked it, or the job is in the wrong state. This turns that into what the driver sees: a custom
 * conversation linked to the policy, the safety check, a wait for a manager, or the policy's own words asking for the missing evidence.
 */
const { logger } = require("../../platform/logger");
const driverActions = require("./driverActions");
const { WorkflowError } = require("./workflowError");
const { reply } = require("./reply");
const { tryStartEventFlow, tryStartFlowByKey } = require("./flows/deps");
const { findOpenSafetyIncident, beginSafetyFlow } = require("./safety");
const { voiceOf } = require("./context");

/**
 * The standard policy-block conversation (the default "missing requirements"
 * helper). One place that turns a PolicyViolationError into what the driver
 * sees:
 *   1. a custom conversation flow when the policy links one (onBlock.flowKey);
 *   2. the safety follow-up when that is the missing evidence;
 *   3. a wait/escalation reply when only a manager can satisfy the block —
 *      the driver is never told to fix something they cannot;
 *   4. otherwise the policy's own message, which explains the missing
 *      requirement and asks for the evidence (photo, confirmation, ...).
 * Re-evaluation and retry happen through the normal evidence paths: a
 * verified photo re-applies pending milestones, a start confirmation retries
 * the update, and a completed safety check re-runs the cancellation.
 * Returns truthy when it handled the block, null to fall back to legacy
 * error rendering.
 */
async function renderPolicyBlock(ctx, err) {
  const failure = err?.failure ?? null;
  if (!failure) return null;

  // 1. Custom conversation linked to the policy.
  const flowKey = failure.onBlock?.flowKey;
  if (flowKey) {
    const started = await tryStartFlowByKey(ctx, flowKey, {
      jobNumber: ctx.interp?.activeJob?.job_number ?? null,
      reason: failure.reason ?? null,
      policyKey: failure.policyKey ?? null,
      requirement: failure.requirement ?? null,
      params: failure.params ?? null,
    });
    if (started) return { flow: flowKey };
  }

  const kind = failure.evidence?.kind ?? null;

  // 2. Safety follow-up missing: run the safety check conversation.
  if (kind === "SAFETY_FOLLOWUP") {
    const incident = await findOpenSafetyIncident(ctx.d.id);
    if (incident) {
      const started = await tryStartEventFlow(ctx, "incident.safety.required", {
        incidentId: incident.id,
        incidentType: incident.incident_type,
        cancelReason: null,
      });
      if (started) return { flow: "incident.safety" };
      return beginSafetyFlow(ctx, incident, null);
    }
  }

  // 3. Manager-only blocks (explicit ESCALATE, or manager-approval evidence):
  // wait/escalation — never pretend the driver can satisfy these.
  if (failure.blockMode === "ESCALATE" || kind === "MANAGER_REVIEW") {
    if (failure.blockMode === "ESCALATE") {
      await driverActions
        .alertManagers(ctx.d, {
          jobId: ctx.interp?.activeJob?.id ?? null,
          type: "POLICY_ESCALATION",
          title: `Policy blocked an action: ${failure.policyName ?? failure.policyKey}`,
          body: `${failure.reason ?? failure.message} (driver: ${ctx.d.name ?? "unknown"})`,
          severity: "HIGH",
        })
        .catch((notifyErr) => logger.error({ err: notifyErr }, "Policy escalation notice failed"));
    }
    return await reply({
      ...ctx,
      body: failure.onBlock?.message ?? failure.message,
    });
  }

  // 4. Standard helper: explain + ask for the missing evidence.
  return await reply({
    ...ctx,
    body: failure.onBlock?.message ?? failure.message,
  });
}

/**
 * What to say for an error raised while handling a driver's message. Returns the sent message (or the flow started), or nothing for an
 * error that is not a refusal (the caller reports a general problem).
 */
async function renderRefusal(ctx, err) {
  const { d } = ctx;
  if (err instanceof WorkflowError || err?.isPolicyViolation) {
    if (err?.isPolicyViolation) {
      const rendered = await renderPolicyBlock(ctx, err);
      if (rendered) return rendered;
    }
    const VERBATIM = [
      "PROTECTED_MILESTONE",
      "VERIFICATION_REQUIRED",
      "JOB_FROZEN",
      "NOT_DELIVERED",
      "START_TOO_EARLY",
      "START_CONFIRMATION_REQUIRED",
      "NO_DELAY",
    ];
    if (VERBATIM.includes(err.code)) {
      return await reply({ ...ctx, body: err.message });
    }
    if (err.code === "BAD_STATE") {
      const progress = await driverActions.describeProgress(d).catch(() => null);
      if (progress && !progress.live) {
        return await reply({
          ...ctx,
          body: `*${progress.job.job_number}* is ${progress.label} and you're no longer assigned to it, so its status can't change. Say "jobs" when you're ready for the next one.`,
        });
      }
    }
    const human = await voiceOf(
      ctx,
      `The driver's update could not be applied. Reason: "${err.message}". Explain warmly and briefly what is missing and the one thing they can do next. Do not claim anything was recorded. Do not use emojis or em dashes.`,
    );
    return await reply({ ...ctx, body: human ?? err.message });
  }
}

module.exports = { renderPolicyBlock, renderRefusal };
