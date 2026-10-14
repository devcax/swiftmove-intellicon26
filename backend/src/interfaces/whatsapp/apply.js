/** A driver puts their name in for a job. */
const { logger } = require("../../platform/logger");
const driverActions = require("./driverActions");
const { getPolicyParams } = require("../../platform/policy/store");
const { reply } = require("./reply");
const repo = require("./repo");

async function submitApplyRequest(ctx, jobId) {
  const { d, messageId } = ctx;
  const job = await repo.findJobForApply(jobId);
  if (!job)
    return await reply({
      ...ctx,
      body: "That job is no longer open, say \"jobs\" and I'll show what's available.",
    });
  try {
    const { job: requested } = await driverActions.requestJob(d, job, messageId, 1);
    return await reply({
      ...ctx,
      body: `Done, I've asked the manager about *${requested.job_number}*. I'll ping you the moment it's approved!`,
    });
  } catch (err) {
    if (err.code === "DUPLICATE_REQUEST") {
      return await reply({
        ...ctx,
        body: `You're already in the running for *${job.job_number}* — just waiting on the manager now.`,
      });
    }
    if (err.code === "DRIVER_BUSY") {
      return await reply({
        ...ctx,
        body: "You're already tied to another job — finish that one and I'll line up the next.",
      });
    }
    if (err.code === "JOB_NOT_OPEN") {
      return await reply({
        ...ctx,
        body: `*${job.job_number}* is no longer open. Say "jobs" and I'll show what's available now.`,
      });
    }
    if (err.code === "JOB_OUTSIDE_WINDOW") {
      const windowParams = await getPolicyParams(d.organization_id, "job.request-eligibility", "pickup_within_hours", { hours: 24 });
      const jobRequestWindowHours = Number(windowParams.hours) || 24;
      return await reply({
        ...ctx,
        body: `*${job.job_number}* can only be requested within ${jobRequestWindowHours} hours of pickup. Say "jobs" for jobs you can request now.`,
      });
    }
    if (err.code === "DRIVER_RELEASED") {
      return await reply({
        ...ctx,
        body: `You were released from *${job.job_number}*, so it cannot be requested again.`,
      });
    }
    logger.error({ code: err.code, err }, `Apply request for ${job.job_number} was rejected`);
    return await reply({
      ...ctx,
      body: `Couldn't put your name in for *${job.job_number}* right now, give it another go in a bit.`,
    });
  }
}

module.exports = { submitApplyRequest };
