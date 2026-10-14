/** A progress update the driver gave (arrived, loaded, departed, ...), and carrying on after the start or a delay reason is confirmed. */
const stateMachine = require("../../platform/jobStateMachine");
const driverActions = require("./driverActions");
const { WorkflowError } = require("./workflowError");
const { fmtWhen } = require("../../platform/time");
const { reply } = require("./reply");
const { setPendingAction } = require("./pending");
const { tryStartEventFlow } = require("./flows/deps");
const { joinList } = require("./text");
const { MILESTONE_SET } = require("./constants");
const repo = require("./repo");

async function applyMilestoneCandidate(candidate, ctx, { confirmed }) {
  const { d, messageId } = ctx;
  const data = { ...(candidate.extracted_data ?? {}) };
  const confidence = confirmed
    ? Math.max(candidate.confidence, 0.9)
    : candidate.confidence;

  const target = candidate.intent;

  if (stateMachine.requiresDocumentVerification(target)) {
    const stage = stateMachine.verificationStageFor(target);
    const reported = await driverActions.reportProofPending(d, target, messageId, confidence);
    if (!reported.waiting) return await reply({ ...ctx, body: `The ${stage.toLowerCase()} milestone is already confirmed or its proof is already verified. No additional ${stage.toLowerCase()} proof is needed.` });
    return await reply({
      ...ctx,
      body:
        stage === "PICKUP"
          ? "Thanks for the update. Please upload the pickup document so I can verify the pickup code and mark the job as loaded."
          : "Thanks for the update. Please upload the delivery document so I can verify the delivery code and mark the job as delivered.",
    });
  }

  let result;
  try {
    result = await driverActions.applyMilestone(
      d,
      target,
      data,
      messageId,
      confidence,
    );
  } catch (err) {
    if (
      (err instanceof WorkflowError || err?.isPolicyViolation) &&
      err.code === "START_CONFIRMATION_REQUIRED"
    ) {
      const assignment = await driverActions.getDriverAssignment(d.id);
      const jobRef =
        assignment?.job_number ?? candidate.job_reference ?? "your job";
      const started = await tryStartEventFlow(
        ctx,
        "job.start-confirm.required",
        { candidate, source: "milestone", jobRef },
      );
      if (started) return { flow: "job.start-confirm" };
      await setPendingAction(ctx.conversationId, {
        type: "AWAITING_START_CONFIRM",
        candidate,
      });
      return await reply({
        ...ctx,
        body: `Got it. Before I log that, *${jobRef}* is not marked as started yet, and only you can confirm that. Once you do, I will record this update too.`,
        buttons: [
          { id: "CONFIRM_START_JOB", title: "Confirm job started" },
          { id: "START_NOT_YET", title: "Not started yet" },
        ],
      });
    }
    throw err;
  }

  const { job, inferred, newStatus, kind, noop } = result;

  if (noop) {
    return await reply({
      ...ctx,
      body: `You are already marked as ${stateMachine.label(job.current_status)} on this job, so nothing changed.`,
    });
  }

  if (kind === "BACKWARD") {
    return await reply({
      ...ctx,
      body: `Okay, I've updated the job to show that you're still ${stateMachine.label(newStatus)}.`,
    });
  }

  if (inferred.length > 0) {
    const filled = inferred.map((s) => stateMachine.label(s));
    const now = stateMachine.label(newStatus);
    return await reply({
      ...ctx,
      body: `You hadn't marked the job as ${joinList(filled)} yet, so I've updated it and you're now ${now}.`,
    });
  }

  const extra =
    newStatus === "DELIVERED_WITH_EXCEPTION"
      ? " Some items were refused, damaged or short, so the manager has been told."
      : "";
  return await reply({
    ...ctx,
    body: `Updated. The job is now marked as ${stateMachine.label(newStatus)}.${extra}`,
  });
}

async function appendPendingContinuation(lines, ctx, cont) {
  const applied = [
    ...new Set((cont?.advances ?? []).flatMap((a) => a.applied ?? [])),
  ];
  if (applied.length > 0) {
    lines.push(
      `Your verified paperwork is applied now: the job is marked as ${joinList(applied.map((s) => stateMachine.label(s)))}.`,
    );
  }
  if (cont?.needsDelayReason) {
    const dl = cont.needsDelayReason;
    // The flow's outgoing messages join the combined reply being composed.
    const started = await tryStartEventFlow(
      ctx,
      "delay.reason.required",
      {
        stage: dl.stage,
        minutesLate: dl.minutesLate,
        scheduledAt: dl.scheduledAt,
        variant: "continuation",
      },
      { collect: lines },
    );
    if (!started) {
      await setPendingAction(ctx.conversationId, {
        type: "AWAITING_DELAY_REASON",
        stage: dl.stage,
      });
      lines.push(
        `The ${dl.stage.toLowerCase()} was about ${dl.minutesLate} min late (scheduled ${fmtWhen(dl.scheduledAt)}). What caused the delay?`,
      );
    }
  }
}

async function confirmStartAndContinue(ctx, candidate = null) {
  const { d, messageId } = ctx;
  const { job, alreadyStarted } = await driverActions.startJob(d, messageId, 1);
  const lines = [
    alreadyStarted
      ? `*${job.job_number}* was already started.`
      : `Start confirmed. *${job.job_number}* is now marked as started.`,
  ];

  const cont = await driverActions.applyPendingVerifications(d, messageId);
  await appendPendingContinuation(lines, ctx, cont);

  if (candidate && MILESTONE_SET.has(candidate.intent)) {
    const targetRank = stateMachine.MILESTONE_RANK[candidate.intent];
    const freshJob = await repo.findJobRow(job.id);
    const nowRank = await driverActions.currentMilestoneRank(freshJob);
    if (targetRank > nowRank) {
      if (
        stateMachine.requiresDocumentVerification(candidate.intent)
      ) {
        await driverActions.reportProofPending(d, candidate.intent, messageId, 1);
        lines.push(
          stateMachine.verificationStageFor(candidate.intent) ===
            "PICKUP"
            ? "To mark it as loaded, send a photo of the pickup document."
            : "To mark it as delivered, send a photo of the delivery document.",
        );
      } else {
        const r = await driverActions.applyMilestone(
          d,
          candidate.intent,
          candidate.extracted_data ?? {},
          messageId,
          1,
        );
        if (!r.noop) {
          lines.push(
            `Also logged: the job is now marked as ${stateMachine.label(r.newStatus)}.`,
          );
        }
      }
    }
  }

  return await reply({ ...ctx, body: lines.join(" ") });
}

module.exports = { applyMilestoneCandidate, appendPendingContinuation, confirmStartAndContinue };
