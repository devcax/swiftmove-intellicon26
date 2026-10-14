/** Dynamic prompts and options a flow's ASK steps can use: the delay question, the start confirmation, the list of open jobs. */
const driverActions = require("../driverActions");
const { fmtWhen } = require("../../../platform/time");
const { jobChoiceRows, candidateSummary } = require("../text");
const { formatAvailableJobs } = require("../jobMessages");

const flowPromptProviders = {
  async delayReasonPrompt(_ctx, data) {
    const stage = String(data.stage ?? "").toLowerCase();
    const when = fmtWhen(data.scheduledAt);
    if (data.variant === "continuation") {
      return {
        text: `The ${stage} was about ${data.minutesLate} min late (scheduled ${when}). What caused the delay?`,
      };
    }
    if (data.variant === "manager") {
      return {
        text: `The manager verified your ${stage} paper. This ${stage} was about ${data.minutesLate} min later than scheduled (${when}), so I need the reason for the records. What caused the delay?`,
      };
    }
    return {
      text: `The ${stage} code is verified. This ${stage} was about ${data.minutesLate} min later than scheduled (${when}), so I need the reason before I can finish marking it. What caused the delay?`,
    };
  },

  async startConfirmPrompt(_ctx, data) {
    if (data.source === "document") {
      return {
        text: `Your ${String(data.stage ?? "").toLowerCase()} document is verified and safely stored, so you will not need to upload it again. *${data.jobNumber}* has not been marked as started yet though, and I cannot move it forward until you confirm the start.`,
      };
    }
    return {
      text: `Got it. Before I log that, *${data.jobRef ?? "your job"}* is not marked as started yet, and only you can confirm that. Once you do, I will record this update too.`,
    };
  },

  async candidateConfirmationPrompt(_ctx, data) {
    return {
      text: `Just to be sure: ${candidateSummary(data.candidate, data.candidate?.job_reference)}, did I get that right?`,
    };
  },

  async availableJobsPrompt(ctx, _data, promptParams) {
    const variant = promptParams?.variant ?? "browse";
    const assignment = await driverActions.getDriverAssignment(ctx.d.id);
    if (variant === "browse" && assignment) {
      return {
        endWithText: `You're already on *${assignment.job_number}* right now, let's finish that one first, then we'll find you the next load.`,
      };
    }
    const jobs = await driverActions.listJobsForDriver(ctx.d);
    if (jobs.length === 0) {
      const fit = ctx.d.vehicle_type ? ` that suits your ${ctx.d.vehicle_type}` : "";
      return {
        endWithText:
          variant === "request"
            ? `Nothing open${fit} to request right now, I'll ping you as soon as a suitable job drops.`
            : `Nothing open${fit} right now, I'll message you the second a suitable job drops.`,
      };
    }
    const text = formatAvailableJobs(jobs);
    return {
      text,
      options: jobs.map((j) => {
        const row = jobChoiceRows([j])[0];
        return {
          id: row.id,
          label: row.title,
          description: row.description,
          param: j.id,
        };
      }),
    };
  },
};

module.exports = { flowPromptProviders };
