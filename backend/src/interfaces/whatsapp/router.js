/** Decide what to do with what the AI understood: ask again, ask to confirm, hand it to a conversation flow, or just do it. */
const driverActions = require("./driverActions");
const stateMachine = require("../../platform/jobStateMachine");
const { routeTopic } = require("./ai/topicRouter");
const flowEngine = require("./flows/engine");
const { reply } = require("./reply");
const { setPendingAction } = require("./pending");
const { flowDeps, tryStartEventFlow, intentFlowData } = require("./flows/deps");
const { findOpenSafetyIncident, beginSafetyFlow } = require("./safety");
const { candidateSummary } = require("./text");
const { applyCandidate } = require("./intents");
const { AUTO_APPLY_MIN, CLARIFY_MIN, STATE_CHANGING } = require("./constants");
const repo = require("./repo");

async function routeCandidate(candidate, ctx) {
  const { d, conversationId } = ctx;

  if (candidate.intent === "UNLOADED") {
    candidate = { ...candidate, intent: "DELIVERED" };
  }

  const rawText = ctx.driverText ?? "";
  if (
    candidate.intent === "UNKNOWN" &&
    /\b(jobs?|loads?|work)\b/i.test(rawText) &&
    !/(did|done|before|previous|prev|past|history|earlier|completed|finished)/i.test(
      rawText,
    )
  ) {
    return await applyCandidate(
      { ...candidate, intent: "SHOW_AVAILABLE_JOBS" },
      ctx,
      { confirmed: false },
    );
  }

  if (candidate.intent === "END_JOB") {
    const endFlows = await flowEngine.loadFlows(d.organization_id);
    const endFlow = flowEngine.matchIntent(endFlows, "END_JOB");
    if (endFlow) {
      await flowEngine.startFlow(
        flowDeps(ctx),
        endFlow,
        ctx,
        intentFlowData(candidate, ctx),
      );
      return { flow: endFlow.key };
    }
    const incident = await findOpenSafetyIncident(d.id);
    if (incident)
      return await beginSafetyFlow(
        ctx,
        incident,
        "Driver asked to end the trip after an incident",
      );

    const assignment = await driverActions.getDriverAssignment(d.id);
    if (assignment?.status === "ACTIVE") {
      const job = await repo.findJobRow(assignment.job_id);
      if (job) {
        const rank = await driverActions.currentMilestoneRank(job);
        if (rank < stateMachine.MILESTONE_RANK.DELIVERED) {
          return await reply({
            ...ctx,
            body: `I can't send *${job.job_number}* for closure yet because the delivery isn't confirmed. Please upload the delivery document so I can verify the delivery code and mark the job as delivered.`,
          });
        }
      }
    }

    return await applyCandidate(candidate, ctx, { confirmed: true });
  }

  if (candidate.confidence < CLARIFY_MIN && candidate.intent !== "UNKNOWN") {
    const started = await tryStartEventFlow(
      ctx,
      "candidate.clarification.required",
      { candidate, question: candidate.clarification_question ?? null },
    );
    if (started) return { flow: "candidate.clarify" };
    await setPendingAction(conversationId, {
      type: "AWAITING_CLARIFICATION",
      candidate,
    });
    return await reply({
      ...ctx,
      body:
        candidate.clarification_question ??
        `I am not sure I understood. Did you mean *${candidate.intent.replace(/_/g, " ").toLowerCase()}*? Please rephrase or add the job number.`,
    });
  }

  if (candidate.clarification_question && candidate.intent !== "UNKNOWN") {
    const started = await tryStartEventFlow(
      ctx,
      "candidate.clarification.required",
      { candidate, question: candidate.clarification_question },
    );
    if (started) return { flow: "candidate.clarify" };
    await setPendingAction(conversationId, {
      type: "AWAITING_CLARIFICATION",
      candidate,
    });
    return await reply({ ...ctx, body: candidate.clarification_question });
  }

  if (
    STATE_CHANGING.has(candidate.intent) &&
    (candidate.needs_confirmation || candidate.confidence < AUTO_APPLY_MIN)
  ) {
    const started = await tryStartEventFlow(
      ctx,
      "candidate.confirmation.required",
      { candidate },
    );
    if (started) return { flow: "candidate.confirm" };
    await setPendingAction(conversationId, {
      type: "AWAITING_CONFIRMATION",
      candidate,
    });
    return await askConfirmation(candidate, ctx);
  }

  // Flow engine: a published INTENT flow owns this intent if one matches.
  const intentFlows = await flowEngine.loadFlows(d.organization_id);
  let matchedFlow = null;
  if (candidate.intent === "GENERAL_QUESTION") {
    // General questions are routed by topic: each published flow may own one
    // topic slug, the AI picks the best fit among them, and a topic-less
    // flow is the default for questions no topic claims.
    const questionFlows = flowEngine.matchIntentAll(intentFlows, "GENERAL_QUESTION");
    const topicFlows = questionFlows.filter((f) => f.triggerConfig.topic);
    if (topicFlows.length > 0) {
      const topic = await routeTopic({
        text: ctx.driverText,
        topics: topicFlows.map((f) => ({
          id: f.triggerConfig.topic,
          description: `${f.name}${f.description ? ` — ${f.description}` : ""}`,
        })),
        organizationId: d.organization_id,
      });
      matchedFlow =
        topicFlows.find((f) => f.triggerConfig.topic === topic) ??
        questionFlows.find((f) => !f.triggerConfig.topic) ??
        null;
    } else {
      matchedFlow = questionFlows[0] ?? null;
    }
  } else {
    matchedFlow = flowEngine.matchIntent(intentFlows, candidate.intent);
  }
  if (matchedFlow) {
    await flowEngine.startFlow(
      flowDeps(ctx),
      matchedFlow,
      ctx,
      intentFlowData(candidate, ctx),
    );
    return { flow: matchedFlow.key };
  }

  return await applyCandidate(candidate, ctx, { confirmed: false });
}

async function askConfirmation(candidate, ctx) {
  return await reply({
    ...ctx,
    body: `Just to be sure: ${candidateSummary(candidate, candidate.job_reference)}, did I get that right?`,
    buttons: [
      { id: "CONFIRM_YES", title: "Confirm" },
      { id: "CONFIRM_NO", title: "Cancel" },
    ],
  });
}

module.exports = { routeCandidate, askConfirmation };
