/** What to do for each thing the driver can ask for, once the AI has understood it. A progress update is its own path; the rest are looked up here. */
const { applyMilestoneCandidate } = require("../milestone");
const { MILESTONE_SET } = require("../constants");
const { jobsIntents } = require("./jobs");
const { tripIntents } = require("./trip");
const { reportIntents } = require("./report");
const { infoIntents } = require("./info");

const HANDLERS = { ...jobsIntents, ...tripIntents, ...reportIntents, ...infoIntents };

async function applyCandidate(candidate, ctx, { confirmed }) {
  if (MILESTONE_SET.has(candidate.intent)) {
    return applyMilestoneCandidate(candidate, ctx, { confirmed });
  }

  const { d, messageId } = ctx;
  const data = candidate.extracted_data ?? {};
  const confidence = confirmed
    ? Math.max(candidate.confidence, 0.9)
    : candidate.confidence;

  const handler = HANDLERS[candidate.intent] ?? HANDLERS.UNKNOWN;
  return handler(candidate, ctx, { d, messageId, data, confidence });
}

module.exports = { applyCandidate };
