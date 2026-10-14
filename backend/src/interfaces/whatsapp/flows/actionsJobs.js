/** Flow actions for getting a job: asking for one, answering an offer, attaching a document to the right job. */
const driverActions = require("../driverActions");
const { reply } = require("../reply");
const { getPendingAction, clearPendingAction } = require("../pending");
const { quotedApplyInviteJobId } = require("../invite");
const { submitApplyRequest } = require("../apply");
const repo = require("../repo");

const actionsJobs = {
  async requestJobById(ctx, params) {
    const job = (
      await repo.findJobRow(params.jobId)
    );
    if (!job) {
      return await reply({
        ...ctx,
        body: "Ah, that one's gone already, say \"jobs\" and I'll show you what's open now.",
      });
    }
    const { job: requested } = await driverActions.requestJob(
      ctx.d,
      job,
      ctx.messageId,
      1,
    );
    return await reply({
      ...ctx,
      body: `Done, I've asked the manager about *${requested.job_number}*. I'll ping you the moment it's approved!`,
    });
  },

  async requestJobByNumber(ctx, params, _data, refs) {
    const job = await driverActions.getJobByNumber(ctx.d.organization_id,
      params.ref,
    );
    if (!job) {
      return await reply({
        ...ctx,
        body: `Hmm, I can't find a job matching "${params.ref}", say "jobs" and I'll list what's open.`,
      });
    }
    const { job: requested } = await driverActions.requestJob(
      ctx.d,
      job,
      ctx.messageId,
      refs?.candidate?.confidence ?? 0.9,
    );
    return await reply({
      ...ctx,
      body: `Done, I've asked the manager about *${requested.job_number}*. I'll ping you the moment it's approved!`,
    });
  },

  async attachDocumentsFromChoice(ctx, params) {
    const pending = await getPendingAction(ctx.conversationId);
    if (pending?.type !== "AWAITING_DOC_JOB_CHOICE") {
      return await reply({
        ...ctx,
        body: "That document request expired, mind sending the photo again ? ",
      });
    }
    const { job } = await driverActions.attachDocuments(ctx.d, {
      attachmentIds: pending.attachmentIds,
      documentType: pending.documentType,
      caption: pending.caption,
      jobId: params.jobId,
      messageId: pending.messageId,
      confidence: 1,
    });
    await clearPendingAction(ctx.conversationId);
    return await reply({
      ...ctx,
      body: `Got it, attached to *${job.job_number}*. The manager can see it now.`,
    });
  },

  async submitApplyRequestSmart(ctx, params) {
    let jobId = params.jobIdParam || null;
    if (!jobId) {
      const quotedJobId = await quotedApplyInviteJobId(
        ctx.conversationId,
        ctx.replyToMessageId,
      );
      const pending = await getPendingAction(ctx.conversationId);
      jobId = quotedJobId ?? pending?.job_id ?? null;
      await clearPendingAction(ctx.conversationId);
    }
    if (!jobId) {
      return await reply({
        ...ctx,
        body: "That invite expired on me, say \"jobs\" and I'll show what's open.",
      });
    }
    return await submitApplyRequest(ctx, jobId);
  },

  async respondOffer(ctx, params) {
    const accepted = params.decision === "ACCEPT_JOB";
    const fn = accepted ? driverActions.acceptJob : driverActions.declineJob;
    const { job } = await fn(ctx.d, ctx.messageId, 1);
    await clearPendingAction(ctx.conversationId);
    return await reply({
      ...ctx,
      body: accepted
        ? `You're on *${job.job_number}*. Just say "start ${job.job_number}" when you're ready to roll.`
        : `No worries, *${job.job_number}* goes back to the pool.`,
    });
  },
};

module.exports = { actionsJobs };
