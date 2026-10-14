/** The wording the bot builds from data: job lines, summaries of what it understood, the reply after a verified document. */
const stateMachine = require("../../platform/jobStateMachine");
const { MILESTONE_SET } = require("./constants");

const MILESTONE_LABEL = {
  ARRIVED_AT_PICKUP: "arrived at pickup",
  LOADING_STARTED: "loading started",
  LOADED: "loaded",
  DEPARTED: "departed",
  ARRIVED_AT_DELIVERY: "arrived at delivery",
  UNLOADING_STARTED: "unloading started",
  UNLOADED: "unloaded",
  DELIVERED: "delivered",
};

function fmtJobLine(j) {
  const qty =
    j.quantity != null ? `, ${j.quantity} ${j.unit ?? ""}`.trimEnd() : "";
  return `*${j.job_number}*: ${j.pickup ?? "?"} → ${j.delivery ?? "?"}${qty}`;
}

function joinList(items) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function verifiedDocumentReply(stage, result) {
  const codeWord = stage === "PICKUP" ? "Pickup" : "Delivery";
  if (result.alreadyVerified || result.noop) {
    return stage === "PICKUP"
      ? `${codeWord} code already verified. The job is still marked as loaded, nothing changed.`
      : `${codeWord} code already verified. The job is still marked as delivered. Send it for closure whenever you are ready and the manager will approve it.`;
  }

  const stages = (result.applied ?? []).map((state) =>
    stateMachine.label(state),
  );
  const listed =
    stages.length > 1
      ? `I marked the job as ${joinList(stages)}.`
      : `I marked the job as ${stages[0] ?? stateMachine.label(result.newStatus)}.`;
  const tail =
    stage === "DELIVERY"
      ? " The delivery is complete. Send the job for closure when you are ready, and the manager will approve it."
      : "";
  return `${codeWord} code verified. ${listed}${tail}`;
}

function candidateSummary(candidate, jobNumber) {
  const data = candidate.extracted_data ?? {};
  const parts = [];
  if (MILESTONE_SET.has(candidate.intent)) {
    parts.push(
      `Mark *${jobNumber ?? "your job"}* as *${MILESTONE_LABEL[candidate.intent]}*`,
    );
  } else {
    parts.push(
      `Apply *${candidate.intent.replace(/_/g, " ").toLowerCase()}*${jobNumber ? ` on *${jobNumber}*` : ""}`,
    );
  }

  const details = [];
  if (data.quantity != null)
    details.push(`quantity ${data.quantity} ${data.unit ?? ""}`.trimEnd());
  if (data.delivered_quantity != null)
    details.push(`delivered ${data.delivered_quantity}`);
  if (data.refused_quantity != null)
    details.push(`refused ${data.refused_quantity}`);
  if (data.damaged_quantity != null)
    details.push(`damaged ${data.damaged_quantity}`);
  if (data.shortage_quantity != null)
    details.push(`short ${data.shortage_quantity}`);
  if (data.seal_number) details.push(`seal ${data.seal_number}`);
  if (data.delay_minutes != null) details.push(`~${data.delay_minutes} min`);
  if (data.reason) details.push(`reason: ${data.reason}`);
  if (details.length > 0) parts.push(`(${details.join(", ")})`);
  return parts.join(" ");
}

function jobChoiceRows(jobs) {
  return jobs.map((j) => ({
    id: `CHOOSE_JOB:${j.id}`,
    title: j.job_number,
    description:
      `${j.pickup ?? "?"} → ${j.delivery ?? "?"}${j.quantity != null ? ` · ${j.quantity} ${j.unit ?? ""}` : ""}`.slice(
        0,
        72,
      ),
  }));
}

module.exports = { fmtJobLine, joinList, verifiedDocumentReply, candidateSummary, jobChoiceRows, MILESTONE_LABEL };
