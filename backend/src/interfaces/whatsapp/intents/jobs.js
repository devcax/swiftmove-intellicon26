/** What a driver says about getting work: the greeting, open jobs, asking for one, accepting or declining it, and their past trips. */
const driverActions = require("../driverActions");
const { reply } = require("../reply");
const repo = require("../repo");
const { firstName } = require("../../../platform/names");
const { formatWhen } = require("../../../platform/time");
const { setPendingAction } = require("../pending");
const { jobChoiceRows } = require("../text");
const { formatAvailableJobs } = require("../jobMessages");

async function greeting(candidate, ctx, { d, messageId, data, confidence }) {
  const assignment = await driverActions.getDriverAssignment(d.id);
  return await reply({
    ...ctx,
    body: assignment
      ? `Hey ${firstName(d.name)}, you're on *${assignment.job_number}*. Keep me posted as you go.`
      : `Hey ${firstName(d.name)}, looking for work? Just say "jobs" and I'll show you what's open.`,
  });
}

async function showAvailableJobs(candidate, ctx, { d, messageId, data, confidence }) {
  const assignment = await driverActions.getDriverAssignment(d.id);
  if (assignment) {
    return await reply({
      ...ctx,
      body: `You're already on *${assignment.job_number}* right now, let's finish that one first, then we'll find you the next load.`,
    });
  }
  const jobs = await driverActions.listJobsForDriver(d);
  if (jobs.length === 0) {
    const fit = d.vehicle_type ? ` that suits your ${d.vehicle_type}` : "";
    return await reply({
      ...ctx,
      body: `Nothing open${fit} right now, I'll message you the second a suitable job drops.`,
    });
  }
  await setPendingAction(ctx.conversationId, {
    type: "AWAITING_JOB_CHOICE",
    jobIds: jobs.map((j) => j.id),
  });
  return await reply({
    ...ctx,
    body: formatAvailableJobs(jobs),
    listRows: jobChoiceRows(jobs),
  });
}

async function requestJob(candidate, ctx, { d, messageId, data, confidence }) {
  if (!candidate.job_reference) {
    const jobs = await driverActions.listJobsForDriver(d);
    if (jobs.length === 0) {
      const fit = d.vehicle_type
        ? ` that suits your ${d.vehicle_type}`
        : "";
      return await reply({
        ...ctx,
        body: `Nothing open${fit} to request right now, I'll ping you as soon as a suitable job drops.`,
      });
    }
    await setPendingAction(ctx.conversationId, {
      type: "AWAITING_JOB_CHOICE",
      jobIds: jobs.map((j) => j.id),
    });
    return await reply({
      ...ctx,
      body: formatAvailableJobs(jobs),
      listRows: jobChoiceRows(jobs),
    });
  }
  const job = await driverActions.getJobByNumber(d.organization_id,
    candidate.job_reference,
  );
  if (!job)
    return await reply({
      ...ctx,
      body: `Hmm, I can't find a job matching "${candidate.job_reference}", say "jobs" and I'll list what's open.`,
    });
  const { job: requested } = await driverActions.requestJob(
    d,
    job,
    messageId,
    confidence,
  );
  return await reply({
    ...ctx,
    body: `Done, I've asked the manager about *${requested.job_number}*. I'll ping you the moment it's approved!`,
  });
}

async function cancelJobRequest(candidate, ctx, { d, messageId, data, confidence }) {
  const { job } = await driverActions.cancelJobRequest(d, messageId, confidence);
  return await reply({
    ...ctx,
    body: `Done, request for *${job.job_number}* withdrawn. `,
  });
}

async function acceptJob(candidate, ctx, { d, messageId, data, confidence }) {
  const { job } = await driverActions.acceptJob(d, messageId, confidence);
  return await reply({
    ...ctx,
    body: `You're on *${job.job_number}*! Say "start ${job.job_number}" when you're ready to roll. `,
  });
}

async function declineJob(candidate, ctx, { d, messageId, data, confidence }) {
  const { job } = await driverActions.declineJob(d, messageId, confidence);
  return await reply({
    ...ctx,
    body: `No worries, *${job.job_number}* goes back to the pool. `,
  });
}

async function askHistory(candidate, ctx, { d, messageId, data, confidence }) {
  const history = await repo.listCompletedTrips(d.id);
  if (history.length === 0) {
    return await reply({
      ...ctx,
      body: 'No completed trips on record yet, your first one is still ahead of you! Say "jobs" when you\'re ready. ',
    });
  }
  const lines = history.map((r) => {
    const finished = formatWhen(r.completed_at, { day: "2-digit", month: "short" });
    const when = finished ? ` (finished ${finished})` : "";
    return `• *${r.job_number}*: ${r.pickup ?? "?"} → ${r.delivery ?? "?"}, ${r.cargo_description}${when}`;
  });
  return await reply({
    ...ctx,
    body: `Here are your recent trips:\n${lines.join("\n")}`,
  });
}

const jobsIntents = {
  GREETING: greeting,
  SHOW_AVAILABLE_JOBS: showAvailableJobs,
  REQUEST_JOB: requestJob,
  CANCEL_JOB_REQUEST: cancelJobRequest,
  ACCEPT_JOB: acceptJob,
  DECLINE_JOB: declineJob,
  ASK_HISTORY: askHistory,
};

module.exports = { jobsIntents };
