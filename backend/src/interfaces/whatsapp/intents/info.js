/** Questions about the bot, help, and everything the AI could not place. */
const { reply } = require("../reply");
const { setPendingAction } = require("../pending");
const { tryStartEventFlow } = require("../flows/deps");
const { voiceOf, describeBlocker } = require("../context");

async function confirmEvent(candidate, ctx, { d, messageId, data, confidence }) {
  return await reply({
    ...ctx,
    body: "I'm the SwiftMove Logistics internal AI agent. I work with the dispatch team to track trips, send me progress updates, photos, voice notes or questions and I'll keep the manager informed.",
  });
}

async function help(candidate, ctx, { d, messageId, data, confidence }) {
  return await reply({
    ...ctx,
    body: [
      `Here's what you can just tell me, anytime:`,
      '• "jobs", see open jobs and grab one',
      '• "cancel my request", withdraw a pending request',
      '• "start JOB-1042", kick off your trip',
      '• Progress: "reached pickup", "on my way", "at delivery"',
      "• \"what's my status\", I'll tell you where the job stands",
      "• Loaded and Delivered are set from your paperwork: send a photo of the pickup document, then the delivery document, and I verify the code and update the job",
      '• Trouble: "delayed 45 min traffic", "2 boxes damaged", "breakdown", "accident"',
      '• "cancel this job", ask the manager to cancel',
      '• "close the job", send it to the manager for closure once delivery is verified',
      "• Voice notes work too",
    ].join("\n"),
  });
}

async function unknown(candidate, ctx, { d, messageId, data, confidence }) {
  const blocker = await describeBlocker(d);
  const situation = [
    "The driver's message could not be matched to any job action. Most likely it is unclear, gibberish, in a mix of languages, or off-topic.",
    "If it clearly answers a question the bot asked earlier in the recent chat, treat it as that answer and reply with the sensible acknowledgement.",
    "If it is a clear question, answer it briefly from the context. If it is clear small talk, respond warmly and briefly.",
    'In every other case, ask the driver to say it again in different words, or to tell you what they need (for example "jobs", "start", a progress update, or a problem report). One short friendly question.',
    "NEVER pretend you understood an unclear message. NEVER tell the driver to upload documents, start a trip, or go anywhere unless they clearly asked what to do next.",
    blocker
      ? `Only mention this if the driver clearly asked what to do next: ${blocker}`
      : null,
    "Never claim an action was taken or recorded. Do not use emojis or em dashes.",
  ]
    .filter(Boolean)
    .join(" ");
  const human = await voiceOf(ctx, situation);
  const body =
    human ??
    candidate.clarification_question ??
    "Hmm, I didn't quite catch that, can you say it again in different words?";

  if (/\?\s*$/.test(body.trim())) {
    const started = await tryStartEventFlow(ctx, "freeform.question.asked", {
      question: body.slice(0, 300),
    });
    if (!started) {
      await setPendingAction(ctx.conversationId, {
        type: "AWAITING_FREEFORM_ANSWER",
        question: body.slice(0, 300),
      });
    }
  }
  return await reply({ ...ctx, body });
}

const infoIntents = {
  CONFIRM_EVENT: confirmEvent,
  CORRECT_EVENT: confirmEvent,
  ASK_IDENTITY: confirmEvent,
  HELP: help,
  UNKNOWN: unknown,
};

module.exports = { infoIntents };
