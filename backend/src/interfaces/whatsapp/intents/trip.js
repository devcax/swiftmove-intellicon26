/** What a driver says about the trip itself: starting it, where it stands, a delay, cancelling it, finishing it. */
const driverActions = require("../driverActions");
const { reply } = require("../reply");
const { setPendingAction } = require("../pending");
const { beginCancellation } = require("../safety");
const { appendPendingContinuation } = require("../milestone");
const { joinList } = require("../text");

async function startJob(candidate, ctx, { d, messageId, data, confidence }) {
  const { job, alreadyStarted } = await driverActions.startJob(
    d,
    messageId,
    confidence,
  );
  if (alreadyStarted) {
    if (data.correction) {
      return await reply({
        ...ctx,
        body: `You've already confirmed the start of *${job.job_number}*, so I can't take it back to not started from my side. If something went wrong, tell me what happened and I'll flag it to the manager.`,
      });
    }
    return await reply({
      ...ctx,
      body: `*${job.job_number}* is already started, so nothing changed. Keep me posted as you go.`,
    });
  }
  const lines = [
    `*${job.job_number}* is rolling. Keep me posted as you go: "reached pickup", "on my way", "at delivery". Drive safe.`,
  ];
  const cont = await driverActions.applyPendingVerifications(d, messageId);
  await appendPendingContinuation(lines, ctx, cont);
  return await reply({ ...ctx, body: lines.join(" ") });
}

async function askProgress(candidate, ctx, { d, messageId, data, confidence }) {
  const progress = await driverActions.describeProgress(d);
  if (!progress) {
    return await reply({
      ...ctx,
      body: 'You are not on a job right now. Say "jobs" and I will show you what is open.',
    });
  }
  const next = progress.nextStep ? ` ${progress.nextStep}` : "";
  const pendingBits = (progress.pending ?? []).map((p) => p.message);
  const pendingText =
    pendingBits.length > 0
      ? ` Still needed from you: ${joinList(pendingBits)}.`
      : "";
  return await reply({
    ...ctx,
    body: `You're currently marked as ${progress.label} on *${progress.job.job_number}*.${next}${pendingText}`,
  });
}

async function delayReported(candidate, ctx, { d, messageId, data, confidence }) {
  const delayText = `${ctx.driverText ?? ""} ${data.reason ?? ""}`;
  const stage =
    /\b(delivery|deliver|drop[ -]?off|receiver|customer)\b/i.test(delayText)
      ? "DELIVERY"
      : /\b(pick[ -]?up|collection|collect|loader|warehouse)\b/i.test(
            delayText,
          )
        ? "PICKUP"
        : null;
  const { job } = await driverActions.reportDelay(
    d,
    stage ? { ...data, stage } : data,
    messageId,
    confidence,
  );
  const minutes = Number(data.delay_minutes) || 0;
  return await reply({
    ...ctx,
    body: `Noted *${job.job_number}*, ${data.reason ?? "delayed"}${minutes ? ` (~${minutes} min)` : ""}. The manager knows; just ping me when you're moving again.`,
  });
}

async function cancellationRequested(candidate, ctx, { d, messageId, data, confidence }) {
  if (!data.reason) {
    await setPendingAction(ctx.conversationId, {
      type: "AWAITING_CANCEL_REASON",
    });
    return await reply({
      ...ctx,
      body: "Of course, I can ask the manager to cancel this trip. What happened? (They review every request.)",
      listRows: [
        { id: "CANCEL_REASON:VEHICLE_PROBLEM", title: "Vehicle problem" },
        { id: "CANCEL_REASON:ACCIDENT", title: "Accident" },
        { id: "CANCEL_REASON:CUSTOMER_ISSUE", title: "Customer issue" },
        { id: "CANCEL_REASON:PERSONAL", title: "Personal reason" },
        { id: "CANCEL_REASON:OTHER", title: "Other" },
      ],
    });
  }
  return await beginCancellation(ctx, data.reason);
}

async function endJob(candidate, ctx, { d, messageId, data, confidence }) {
  const { job, alreadyRequested } = await driverActions.endJob(
    d,
    messageId,
    confidence,
  );
  if (alreadyRequested) {
    return await reply({
      ...ctx,
      body: `*${job.job_number}* is already with the manager for closure, so I haven't sent it again. I'll let you know as soon as it's approved.`,
    });
  }
  const needsPod =
    /pod/i.test(job.special_instructions ?? "") &&
    !(await driverActions.hasPodDocument(job.id));
  const podWarning = needsPod
    ? " One last thing, this job needs a signed POD, so send a photo of it here when you can."
    : "";
  return await reply({
    ...ctx,
    body: `Done. *${job.job_number}* has been sent to the manager for closure.${podWarning} I'll let you know once it's approved.`,
  });
}

const tripIntents = {
  START_JOB: startJob,
  ASK_PROGRESS: askProgress,
  DELAY_REPORTED: delayReported,
  CANCELLATION_REQUESTED: cancellationRequested,
  END_JOB: endJob,
};

module.exports = { tripIntents };
