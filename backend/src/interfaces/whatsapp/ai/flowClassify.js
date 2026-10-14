/**
 * Free-text classifier for conversation flow steps.
 *
 * When a manager adds a "classify" block to an ASK_TEXT step, the driver's
 * free-text answer is placed into one of the manager-defined categories and
 * the flow branches on it (e.g. "vague reason -> ask for details"). The
 * prompt is an AI instruction (flow.classifier) so it can be tuned from the
 * dashboard like the other prompts. Classification only ever picks a
 * branch — enforcement stays in code.
 */
const { logger } = require('../../../platform/logger');
const { chatJson } = require('../../../platform/llm');
const { getInstruction } = require('../../../platform/instructions');
const { prompts: { CLASSIFY_PROMPT } } = require('../../../modules/aiInstructions');

/**
 * Classify a free-text answer into one of the step's categories.
 * @returns {Promise<string|null>} the chosen category id, or null when the
 *          classification failed (the engine then uses the step fallback).
 */
async function classifyAnswer({ text, categories, organizationId = null }) {
  const list = categories
    .map((c) => `- ${c.id}: ${c.description}`)
    .join('\n');
  try {
    const system = (await getInstruction(organizationId, 'flow.classifier')) ?? CLASSIFY_PROMPT;
    const result = await chatJson({
      system,
      user: `Categories:\n${list}\n\nDriver answer: """${String(text ?? '').slice(0, 500)}"""`,
      maxTokens: 60,
    });
    const id = String(result?.category ?? '').trim();
    if (categories.some((c) => c.id === id)) return id;
    return null;
  } catch (err) {
    logger.warn({ err }, 'Flow classification failed, using step fallback');
    return null;
  }
}

module.exports = { CLASSIFY_PROMPT, classifyAnswer };
