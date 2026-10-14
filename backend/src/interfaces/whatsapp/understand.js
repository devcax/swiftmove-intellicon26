/** Screen what the driver wrote for attempts to instruct the AI, then have the AI read it and keep that reading with the message. */
const { screenMessage } = require("./ai/promptGuard");
const { interpretMessage, PROMPT_VERSION, AI_MODEL } = require("./ai/interpreter");
const driverActions = require("./driverActions");
const { reply } = require("./reply");
const { loadInterpreterContext } = require("./context");
const repo = require("./repo");

async function storeInterpretation(
  messageId,
  candidate,
  processingStatus,
  errorMessage = null,
  source = null,
) {
  await repo.storeInterpretation({
    messageId,
    modelName: AI_MODEL,
    promptVersion: PROMPT_VERSION,
    primaryIntent: candidate.intent,
    structuredOutput: source?.ids?.length > 1 ? { ...candidate, source_message_ids: source.ids, source_text: source.text } : candidate,
    confidenceScore: candidate.confidence ?? null,
    processingStatus,
    errorMessage,
  });
}

/**
 * `{ result }` when the message was refused (the driver was told), otherwise `{ candidate }` with what the AI understood. The context the
 * AI was shown stays on `ctx` for the replies that follow.
 */
async function understand(ctx, text) {
  const { d, messageId, conversationId } = ctx;
  const screen = await screenMessage(text, d.organization_id);
  if (!screen.safe) {
    await storeInterpretation(
      messageId,
      {
        intent: "BLOCKED_INJECTION",
        events: [],
        job_reference: null,
        extracted_data: { score: screen.score },
        confidence: 1,
      },
      "REQUIRES_REVIEW",
      "Prompt-injection screening blocked this message",
      { ids: ctx.sourceMessageIds, text },
    );
    await driverActions.alertManagers(d, { type: "SECURITY_ALERT",
      title: `Suspicious message from ${d.name}`,
      body: `Message blocked by prompt-injection screening (score ${screen.score}): "${text.slice(0, 200)}"`,
      severity: "WARNING",
    });
    return {
      result: await reply({
        ...ctx,
        body: "Hmm, that message didn't come through right, just send it to me in your own words, like a normal job update.",
      }),
    };
  }

  const interpCtx = await loadInterpreterContext(d, conversationId);
  ctx.interp = interpCtx;
  ctx.driverText = text;
  const candidate = await interpretMessage({ text, driver: d, ...interpCtx });
  await storeInterpretation(messageId, candidate, "COMPLETED", null, { ids: ctx.sourceMessageIds, text });
  return { candidate };
}

module.exports = { understand };
